from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class AnomalyDetectionRequest(BaseModel):
    metric_id: int = Field(..., description="Target metric definition ID for anomaly detection")
    model_type: str = Field(
        "statistical_zscore",
        description="Anomaly detection algorithm: statistical_zscore, isolation_forest",
    )
    lookback_minutes: int = Field(120, ge=15, le=1440, description="Time window of observations to analyze")
    sensitivity: float = Field(2.5, ge=1.0, le=5.0, description="Threshold sensitivity (z-score threshold or contamination parameter)")


class AnomalyDetectionItem(BaseModel):
    id: Optional[int] = None
    timestamp: datetime
    actual_value: float
    expected_value: Optional[float] = None
    anomaly_score: float
    is_anomaly: bool
    severity: str  # low, medium, high, critical
    explanation: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AnomalyDetectionResponse(BaseModel):
    metric_id: int
    service_name: str
    metric_name: str
    model_name: str
    model_version: str
    lookback_minutes: int
    total_points_analyzed: int
    anomalies_detected_count: int
    detections: List[AnomalyDetectionItem]
    summary: str
