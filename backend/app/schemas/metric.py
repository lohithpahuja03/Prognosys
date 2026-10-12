from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class MetricDefinitionBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128, example="memory_utilization")
    unit: str = Field("percent", example="percent")  # percent, ms, rps, count, bytes
    metric_type: str = Field("gauge", example="gauge")
    warning_threshold: Optional[float] = Field(None, example=80.0)
    critical_threshold: Optional[float] = Field(None, example=90.0)
    capacity_limit: Optional[float] = Field(None, example=100.0)


class MetricDefinitionCreate(MetricDefinitionBase):
    service_id: int


class MetricDefinitionResponse(MetricDefinitionBase):
    id: int
    service_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MetricObservationCreate(BaseModel):
    metric_id: int
    timestamp: datetime
    value: float
    is_synthetic: bool = False
    source: str = "api"


class MetricObservationResponse(BaseModel):
    id: int
    metric_id: int
    timestamp: datetime
    value: float
    is_synthetic: bool
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchMetricObservationCreate(BaseModel):
    observations: List[MetricObservationCreate]
