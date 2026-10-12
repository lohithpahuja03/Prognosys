from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.forecast import ForecastRequest, ForecastResponse
from app.services.forecasting.engine import ForecastingService

router = APIRouter()


@router.post(
    "/generate",
    response_model=ForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Multi-Horizon Telemetry Forecast",
    description="Calculates genuine time-series forecasts with calibrated uncertainty bounds. Zero LLM fabrication.",
)
def generate_forecast(
    req: ForecastRequest,
    db: Session = Depends(get_db),
):
    return ForecastingService.generate_forecast(db, req)


@router.get(
    "/latest/{metric_id}",
    response_model=ForecastResponse,
    summary="Get Latest Forecast for Metric",
    description="Retrieve the most recent forecast run and projected trajectory points for a metric.",
)
def get_latest_forecast(
    metric_id: int,
    db: Session = Depends(get_db),
):
    forecast = ForecastingService.get_latest_forecast(db, metric_id)
    if not forecast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No forecast runs found for metric ID {metric_id}.",
        )
    return forecast


@router.get(
    "/models",
    response_model=List[str],
    summary="List Available Forecasting Algorithms",
    description="Returns the list of implemented time-series forecasting models.",
)
def list_forecasting_models():
    return ForecastingService.get_available_models()
