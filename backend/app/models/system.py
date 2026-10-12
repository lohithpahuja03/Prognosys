from sqlalchemy import Column, String, Text, Boolean
from app.models.base import BaseModel


class SystemAuditLog(BaseModel):
    """Tracks system events, health checks, and architectural initialization events."""
    __tablename__ = "system_audit_logs"

    event_type = Column(String(64), nullable=False, index=True)
    component = Column(String(64), nullable=False)
    message = Column(Text, nullable=False)
    is_error = Column(Boolean, default=False, nullable=False)
