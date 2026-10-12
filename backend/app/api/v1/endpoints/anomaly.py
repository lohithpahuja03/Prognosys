from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.anomaly import (
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
    AnomalyDetectionItem,
)
from app.services.anomaly.engine import AnomalyDetectionService

router = APIRouter()


@router.post(
    "/detect",
    response_model=AnomalyDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect Metric Anomalies",
    description="Analyzes telemetry observations for unexpected structural changes or outliers using statistical and unsupervised models.",
)
def detect_anomalies(
    req: AnomalyDetectionRequest,
    db: Session = Depends(get_db),
):
    return AnomalyDetectionService.detect_anomalies(db, req)


@router.get(
    "/{metric_id}",
    response_model=List[AnomalyDetectionItem],
    summary="Get Recorded Anomalies for Metric",
    description="Retrieve historical anomaly detections recorded for a specific metric.",
)
def get_anomalies(
    metric_id: int,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    return AnomalyDetectionService.get_metric_anomalies(db, metric_id, limit=limit)


@router.get(
    "/models/available",
    response_model=List[str],
    summary="List Implemented Anomaly Detection Algorithms",
    description="Returns available anomaly detection models.",
)
def list_anomaly_models():
    return AnomalyDetectionService.get_available_models()
