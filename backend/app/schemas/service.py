from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ServiceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128, example="api-gateway")
    slug: Optional[str] = Field(None, max_length=128, example="api-gateway")
    tier: str = Field("standard", example="critical")  # critical, standard, batch
    description: Optional[str] = Field(None, example="Main API ingress service")


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=128)
    tier: Optional[str] = None
    description: Optional[str] = None


class ServiceResponse(ServiceBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceWithMetrics(ServiceResponse):
    metrics: List["MetricDefinitionResponse"] = []

    model_config = ConfigDict(from_attributes=True)


# Forward reference resolution
from app.schemas.metric import MetricDefinitionResponse
ServiceWithMetrics.model_rebuild()
