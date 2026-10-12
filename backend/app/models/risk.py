from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class RiskAssessment(BaseModel):
    """Capacity risk assessment record evaluating forecast against metric thresholds."""
    __tablename__ = "risk_assessments"

    metric_id = Column(Integer, ForeignKey("metric_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    forecast_run_id = Column(Integer, ForeignKey("forecast_runs.id", ondelete="SET NULL"), nullable=True, index=True)

    # Operational States: NORMAL, WATCH, ELEVATED, CRITICAL, INSUFFICIENT_DATA
    risk_state = Column(String(32), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)  # 0.0 to 100.0

    current_value = Column(Float, nullable=False)
    warning_threshold = Column(Float, nullable=True)
    critical_threshold = Column(Float, nullable=True)
    capacity_limit = Column(Float, nullable=True)

    # Breach Details
    predicted_breach_type = Column(String(32), default="none", nullable=False)  # none, warning, critical, capacity
    time_to_breach_minutes = Column(Float, nullable=True)  # float minutes or null
    time_to_breach_display = Column(String(128), default="No breach predicted", nullable=False)
    confidence = Column(String(32), default="high", nullable=False)  # high, medium, low, insufficient_data
    explanation = Column(Text, nullable=False)
    assessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    metric = relationship("MetricDefinition")
    forecast_run = relationship("ForecastRun")

    __table_args__ = (
        Index("ix_risk_assessments_metric_time", "metric_id", "assessed_at"),
    )
