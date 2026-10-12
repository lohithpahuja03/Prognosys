from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ForecastRun(BaseModel):
    """Metadata record for a specific forecasting model execution."""
    __tablename__ = "forecast_runs"

    metric_id = Column(Integer, ForeignKey("metric_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(64), nullable=False)  # persistence, exponential_smoothing, linear_trend
    model_version = Column(String(32), default="1.0.0", nullable=False)
    horizon_minutes = Column(Integer, nullable=False)  # 15, 30, 60
    training_points_count = Column(Integer, nullable=False)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    metric = relationship("MetricDefinition")
    points = relationship(
        "ForecastPoint",
        back_populates="forecast_run",
        cascade="all, delete-orphan",
        order_by="ForecastPoint.target_timestamp.asc()",
        lazy="selectin",
    )


class ForecastPoint(BaseModel):
    """Individual projected time-series point with uncertainty bounds."""
    __tablename__ = "forecast_points"

    forecast_run_id = Column(Integer, ForeignKey("forecast_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    target_timestamp = Column(DateTime, nullable=False, index=True)
    predicted_value = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=False)
    upper_bound = Column(Float, nullable=False)
    confidence_level = Column(Float, default=0.95, nullable=False)

    forecast_run = relationship("ForecastRun", back_populates="points")

    __table_args__ = (
        Index("ix_forecast_points_run_timestamp", "forecast_run_id", "target_timestamp"),
    )
