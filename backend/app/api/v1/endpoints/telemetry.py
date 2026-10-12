from typing import List
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.metric import MetricObservation, MetricDefinition
from app.schemas.metric import MetricObservationCreate, MetricObservationResponse, BatchMetricObservationCreate
from app.schemas.telemetry import (
    SyntheticGeneratorRequest,
    SyntheticGeneratorResponse,
    CSVImportSummary,
)
from app.services.synthetic_generator import SyntheticTelemetryGenerator
from app.services.csv_importer import CSVTelemetryImporter

router = APIRouter()


@router.post(
    "/synthetic/generate",
    response_model=SyntheticGeneratorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Synthetic Telemetry",
    description="Generate deterministic time-series telemetry for reproducible experimentation and benchmarking.",
)
def generate_synthetic_telemetry(
    req: SyntheticGeneratorRequest,
    db: Session = Depends(get_db),
):
    generator = SyntheticTelemetryGenerator(seed=req.seed)
    return generator.generate(db, req)


@router.post(
    "/csv/upload",
    response_model=CSVImportSummary,
    status_code=status.HTTP_200_OK,
    summary="Import Telemetry from CSV",
    description="Upload infrastructure telemetry CSV with strict validation and detailed error reporting.",
)
async def upload_csv_telemetry(
    file: UploadFile = File(..., description="Infrastructure telemetry CSV file"),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a .csv extension.",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowable 10 MB limit.",
        )

    return CSVTelemetryImporter.import_csv_content(db, content)


@router.post(
    "/ingest",
    response_model=List[MetricObservationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Metric Observations",
    description="Ingest single or batch telemetry metric observations programmatically.",
)
def ingest_observations(
    batch: BatchMetricObservationCreate,
    db: Session = Depends(get_db),
):
    if not batch.observations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Observation batch cannot be empty.",
        )

    # Validate metric_ids exist
    metric_ids = {obs.metric_id for obs in batch.observations}
    existing_metrics = db.query(MetricDefinition.id).filter(MetricDefinition.id.in_(metric_ids)).all()
    existing_ids = {m[0] for m in existing_metrics}

    missing_ids = metric_ids - existing_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric IDs {missing_ids} not found in database.",
        )

    db_obs = [
        MetricObservation(
            metric_id=obs.metric_id,
            timestamp=obs.timestamp,
            value=obs.value,
            is_synthetic=obs.is_synthetic,
            source=obs.source,
        )
        for obs in batch.observations
    ]

    db.add_all(db_obs)
    db.commit()
    for o in db_obs:
        db.refresh(o)

    return db_obs
