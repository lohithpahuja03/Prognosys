from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SystemAuditLogCreate(BaseModel):
    event_type: str
    component: str
    message: str
    is_error: bool = False


class SystemAuditLogResponse(BaseModel):
    id: int
    event_type: str
    component: str
    message: str
    is_error: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
