from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.evaluation import (
    EvaluationRequest,
    EvaluationBenchmarkResponse,
)
from app.services.evaluation.evaluator import ModelEvaluationLabService

router = APIRouter()


@router.post(
    "/run",
    response_model=EvaluationBenchmarkResponse,
    status_code=status.HTTP_200_OK,
    summary="Run empirical model evaluation benchmark",
    description="Tests forecasting algorithms using chronological holdout cross-validation against the persistence baseline ($y_{t+h} = y_t$). Zero temporal data leakage.",
)
def run_evaluation_benchmark(
    request: EvaluationRequest,
    db: Session = Depends(get_db),
) -> EvaluationBenchmarkResponse:
    return ModelEvaluationLabService.evaluate(db, request)
