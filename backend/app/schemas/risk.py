from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class RiskAssessmentRequest(BaseModel):
    metric_id: int = Field(..., description="Target metric definition ID to evaluate")
    horizon_minutes: int = Field(60, ge=15, le=180, description="Forecast horizon for breach detection in minutes")
    model_type: str = Field("exponential_smoothing", description="Forecasting model to use for trajectory projection")


class RiskAssessmentResponse(BaseModel):
    id: Optional[int] = None
    metric_id: int
    metric_name: str
    service_name: str
    unit: str

    risk_state: str  # NORMAL, WATCH, ELEVATED, CRITICAL, INSUFFICIENT_DATA
    risk_score: float  # 0.0 to 100.0

    current_value: float
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    capacity_limit: Optional[float] = None

    predicted_breach_type: str  # none, warning, critical, capacity
    time_to_breach_minutes: Optional[float] = None
    time_to_breach_display: str
    confidence: str  # high, medium, low, insufficient_data
    explanation: str
    assessed_at: datetime
    forecast_run_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class RiskOverviewItem(BaseModel):
    metric_id: int
    metric_name: str
    service_name: str
    unit: str
    risk_state: str
    risk_score: float
    current_value: float
    time_to_breach_display: str


class SystemRiskOverview(BaseModel):
    critical_count: int
    elevated_count: int
    watch_count: int
    normal_count: int
    insufficient_data_count: int
    total_metrics_evaluated: int
    highest_risk_items: List[RiskOverviewItem]
    generated_at: datetime
