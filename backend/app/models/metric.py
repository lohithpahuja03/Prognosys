from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class MetricDefinition(BaseModel):
    """Definition and threshold configuration for a telemetry metric."""
    __tablename__ = "metric_definitions"

    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(128), nullable=False, index=True)  # e.g., memory_utilization, cpu_utilization
    unit = Column(String(32), default="percent", nullable=False)  # percent, ms, rps, count, bytes
    metric_type = Column(String(32), default="gauge", nullable=False)  # gauge, counter

    # Capacity & Alerting Thresholds
    warning_threshold = Column(Float, nullable=True)  # e.g., 80.0
    critical_threshold = Column(Float, nullable=True)  # e.g., 90.0
    capacity_limit = Column(Float, nullable=True)  # e.g., 100.0

    service = relationship("Service", back_populates="metrics")
    observations = relationship(
        "MetricObservation",
        back_populates="metric",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    __table_args__ = (
        Index("ix_metric_service_name", "service_id", "name", unique=True),
    )


class MetricObservation(BaseModel):
    """Individual time-series observation for a metric."""
    __tablename__ = "metric_observations"

    metric_id = Column(Integer, ForeignKey("metric_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    value = Column(Float, nullable=False)
    is_synthetic = Column(Boolean, default=False, nullable=False)
    source = Column(String(32), default="api", nullable=False)  # synthetic, csv_import, api

    metric = relationship("MetricDefinition", back_populates="observations")

    __table_args__ = (
        Index("ix_metric_observations_metric_timestamp", "metric_id", "timestamp"),
    )
