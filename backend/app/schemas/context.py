from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class OperationalEventCreate(BaseModel):
    service_id: Optional[int] = Field(None, description="Associated service ID if specific to a service")
    event_type: str = Field(..., description="Event type: deployment, config_change, restart, scale_event, incident")
    title: str = Field(..., max_length=255, description="Brief event title")
    description: Optional[str] = Field(None, description="Detailed event summary")
    severity: str = Field("info", description="Severity level: info, warning, critical")
    metadata_json: Optional[str] = Field(None, description="Serialized JSON metadata")
    occurred_at: Optional[datetime] = Field(None, description="Event occurrence time (defaults to now)")


class OperationalEventResponse(BaseModel):
    id: int
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    event_type: str
    title: str
    description: Optional[str] = None
    severity: str
    metadata_json: Optional[str] = None
    occurred_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceDependencyCreate(BaseModel):
    source_service_id: int = Field(..., description="Source / client service ID")
    target_service_id: int = Field(..., description="Target / upstream service ID")
    dependency_type: str = Field("calls", description="Dependency kind: calls, reads_from, writes_to, queues_to")


class ServiceDependencyResponse(BaseModel):
    id: int
    source_service_id: int
    source_service_name: str
    target_service_id: int
    target_service_name: str
    dependency_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TopologyNode(BaseModel):
    id: int
    name: str
    slug: str
    tier: str
    risk_state: str = "NORMAL"


class TopologyEdge(BaseModel):
    id: int
    source: int
    target: int
    dependency_type: str


class ServiceTopologyResponse(BaseModel):
    nodes: List[TopologyNode]
    edges: List[TopologyEdge]


class CorrelatedEventItem(BaseModel):
    event_id: int
    event_type: str
    title: str
    occurred_at: datetime
    minutes_before_inflection: float
    relevance_lead_score: float  # 0.0 to 100.0 based on temporal proximity
    relevance_note: str


class EventCorrelationResponse(BaseModel):
    metric_id: int
    metric_name: str
    service_name: str
    reference_timestamp: datetime
    lookback_minutes: int
    total_events_in_window: int
    correlated_events: List[CorrelatedEventItem]
    methodology_disclaimer: str = (
        "Temporal correlation detected within lookback window. "
        "Strict engineering reminder: Correlation is an investigative lead, NOT proof of causation."
    )
