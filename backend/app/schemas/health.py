from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DatabaseHealthStatus(BaseModel):
    status: str
    database_type: str
    connected: bool
    error: Optional[str] = None


class HealthResponse(BaseModel):
    project: str = "PrognosysAI"
    version: str
    environment: str
    status: str = "healthy"
    timestamp: datetime
    database: DatabaseHealthStatus
    components: Dict[str, str] = Field(default_factory=dict)
