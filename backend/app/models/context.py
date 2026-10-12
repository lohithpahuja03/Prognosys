from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class OperationalEvent(BaseModel):
    """Operational event record such as deployment, config update, restart, or incident."""
    __tablename__ = "operational_events"

    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=True, index=True)
    event_type = Column(String(32), nullable=False, index=True)  # deployment, config_change, restart, scale_event, incident
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(32), default="info", nullable=False)  # info, warning, critical
    metadata_json = Column(Text, nullable=True)
    occurred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    service = relationship("Service", backref="operational_events")

    __table_args__ = (
        Index("ix_operational_events_service_time", "service_id", "occurred_at"),
    )


class ServiceDependency(BaseModel):
    """Directed dependency link between two monitored services."""
    __tablename__ = "service_dependencies"

    source_service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    target_service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    dependency_type = Column(String(32), default="calls", nullable=False)  # calls, reads_from, writes_to, queues_to

    source_service = relationship("Service", foreign_keys=[source_service_id])
    target_service = relationship("Service", foreign_keys=[target_service_id])

    __table_args__ = (
        Index("ix_service_dependencies_unique", "source_service_id", "target_service_id", unique=True),
    )
