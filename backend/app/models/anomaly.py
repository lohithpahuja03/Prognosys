from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class AnomalyDetection(BaseModel):
    """Historical or real-time anomaly detection record for an infrastructure metric."""
    __tablename__ = "anomaly_detections"

    metric_id = Column(Integer, ForeignKey("metric_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(64), nullable=False)  # statistical_zscore, isolation_forest
    model_version = Column(String(32), default="1.0.0", nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    actual_value = Column(Float, nullable=False)
    expected_value = Column(Float, nullable=True)
    anomaly_score = Column(Float, nullable=False)  # Normalized 0.0 to 1.0
    is_anomaly = Column(Boolean, default=False, nullable=False, index=True)
    severity = Column(String(32), default="low", nullable=False)  # low, medium, high, critical
    explanation = Column(Text, nullable=True)

    metric = relationship("MetricDefinition")

    __table_args__ = (
        Index("ix_anomalies_metric_time", "metric_id", "timestamp"),
    )
