from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.risk import (
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    SystemRiskOverview,
)
from app.services.risk.service import RiskIntelligenceService

router = APIRouter()


@router.post(
    "/assess",
    response_model=RiskAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Assess capacity risk for a metric",
    description="Evaluates current metric value and projected forecast trajectory against configured warning, critical, and capacity limits.",
)
def assess_risk(
    request: RiskAssessmentRequest,
    db: Session = Depends(get_db),
) -> RiskAssessmentResponse:
    return RiskIntelligenceService.assess_risk(db, request)


@router.get(
    "/latest/{metric_id}",
    response_model=RiskAssessmentResponse,
    summary="Get latest capacity risk assessment for a metric",
)
def get_latest_risk(
    metric_id: int,
    db: Session = Depends(get_db),
) -> RiskAssessmentResponse:
    assessment = RiskIntelligenceService.get_latest_risk_assessment(db, metric_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No risk assessment found for metric ID {metric_id}.",
        )
    return assessment


@router.get(
    "/overview",
    response_model=SystemRiskOverview,
    summary="Get infrastructure-wide capacity risk overview",
    description="Returns aggregate counts across all monitored metrics for CRITICAL, ELEVATED, WATCH, and NORMAL risk states.",
)
def get_risk_overview(
    db: Session = Depends(get_db),
) -> SystemRiskOverview:
    return RiskIntelligenceService.get_system_risk_overview(db)
