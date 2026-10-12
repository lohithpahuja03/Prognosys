from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.investigation import (
    InvestigationRequest,
    InvestigationReport,
)
from app.services.ai.investigator import AIInvestigatorService

router = APIRouter()


@router.post(
    "/investigate",
    response_model=InvestigationReport,
    status_code=status.HTTP_200_OK,
    summary="Generate evidence-grounded AI investigation report",
    description="Synthesizes telemetry observations, forecast trajectories, anomaly detections, and correlated operational events with deterministic fallback.",
)
def investigate_metric(
    request: InvestigationRequest,
    db: Session = Depends(get_db),
) -> InvestigationReport:
    return AIInvestigatorService.investigate(db, request)
