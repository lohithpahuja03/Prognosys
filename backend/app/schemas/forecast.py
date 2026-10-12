from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ForecastPointSchema(BaseModel):
    target_timestamp: datetime
    predicted_value: float
    lower_bound: float
    upper_bound: float
    confidence_level: float = 0.95

    model_config = ConfigDict(from_attributes=True)


class HistoricalPointSchema(BaseModel):
    timestamp: datetime
    value: float


class ForecastRequest(BaseModel):
    metric_id: int = Field(..., description="Target metric definition ID to forecast")
    horizon_minutes: int = Field(30, ge=5, le=180, description="Forecast horizon in minutes: 15, 30, 60")
    model_type: str = Field(
        "exponential_smoothing",
        description="Forecasting algorithm: persistence, exponential_smoothing, linear_trend",
    )
    confidence_level: float = Field(0.95, ge=0.50, le=0.99, description="Confidence level for uncertainty bounds")


class ForecastResponse(BaseModel):
    run_id: int
    metric_id: int
    metric_name: str
    service_name: str
    unit: str
    model_name: str
    model_version: str
    horizon_minutes: int
    training_points_count: int
    generated_at: datetime
    points: List[ForecastPointSchema]
    historical_points: List[HistoricalPointSchema] = []
    summary: str


class LatestForecastQuery(BaseModel):
    metric_id: int
