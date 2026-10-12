from datetime import datetime, timezone
from typing import Dict, Type, Optional, List
import pandas as pd
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.metric import MetricDefinition, MetricObservation
from app.models.forecast import ForecastRun, ForecastPoint
from app.schemas.forecast import ForecastRequest, ForecastResponse, ForecastPointSchema, HistoricalPointSchema
from app.services.forecasting.base import BaseForecaster
from app.services.forecasting.persistence import PersistenceForecaster
from app.services.forecasting.exponential_smoothing import ExponentialSmoothingForecaster
from app.services.forecasting.linear_trend import LinearTrendForecaster


class ForecastingService:
    """Master forecasting coordinator orchestrating data validation, model execution, and persistence."""

    _MODELS: Dict[str, Type[BaseForecaster]] = {
        "persistence": PersistenceForecaster,
        "exponential_smoothing": ExponentialSmoothingForecaster,
        "linear_trend": LinearTrendForecaster,
    }

    @classmethod
    def get_available_models(cls) -> List[str]:
        return list(cls._MODELS.keys())

    @classmethod
    def generate_forecast(
        cls,
        db: Session,
        req: ForecastRequest,
    ) -> ForecastResponse:
        # 1. Fetch Metric Definition
        metric = db.query(MetricDefinition).filter(MetricDefinition.id == req.metric_id).first()
        if not metric:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Metric definition ID {req.metric_id} not found.",
            )

        # 2. Fetch historical observations
        observations = (
            db.query(MetricObservation)
            .filter(MetricObservation.metric_id == req.metric_id)
            .order_by(MetricObservation.timestamp.asc())
            .all()
        )

        MIN_REQUIRED_POINTS = 15
        if len(observations) < MIN_REQUIRED_POINTS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient historical data: Metric '{metric.name}' has only {len(observations)} "
                    f"observations. At least {MIN_REQUIRED_POINTS} observations are required to generate "
                    f"a statistically defensible forecast."
                ),
            )

        # Build DataFrame
        data = [
            {"timestamp": obs.timestamp, "value": obs.value}
            for obs in observations
        ]
        df = pd.DataFrame(data)

        # Deduplicate and sort chronologically
        df = df.drop_duplicates(subset=["timestamp"]).sort_values("timestamp").reset_index(drop=True)

        # 3. Model instantiation
        model_cls = cls._MODELS.get(req.model_type)
        if not model_cls:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported model type '{req.model_type}'. Available models: {cls.get_available_models()}",
            )
        model = model_cls()

        # 4. Generate forecast
        try:
            result = model.fit_predict(
                df=df,
                horizon_minutes=req.horizon_minutes,
                step_seconds=60,
                confidence_level=req.confidence_level,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Forecasting calculation error in {model.model_name}: {str(exc)}",
            )

        # 5. Persist ForecastRun and ForecastPoints
        forecast_run = ForecastRun(
            metric_id=metric.id,
            model_name=result.model_name,
            model_version=result.model_version,
            horizon_minutes=req.horizon_minutes,
            training_points_count=len(df),
            generated_at=datetime.now(timezone.utc),
        )
        db.add(forecast_run)
        db.flush()  # populate forecast_run.id

        forecast_points = []
        point_schemas = []
        for ts, pred, low, up in zip(
            result.target_timestamps,
            result.predicted_values,
            result.lower_bounds,
            result.upper_bounds,
        ):
            p = ForecastPoint(
                forecast_run_id=forecast_run.id,
                target_timestamp=ts,
                predicted_value=round(float(pred), 4),
                lower_bound=round(float(low), 4),
                upper_bound=round(float(up), 4),
                confidence_level=req.confidence_level,
            )
            forecast_points.append(p)
            point_schemas.append(
                ForecastPointSchema(
                    target_timestamp=ts,
                    predicted_value=round(float(pred), 4),
                    lower_bound=round(float(low), 4),
                    upper_bound=round(float(up), 4),
                    confidence_level=req.confidence_level,
                )
            )

        db.add_all(forecast_points)
        db.commit()

        # Recent historical points for visualization (last 60 points)
        recent_history = [
            HistoricalPointSchema(timestamp=obs.timestamp, value=round(obs.value, 4))
            for obs in observations[-60:]
        ]

        summary_text = (
            f"Generated {req.horizon_minutes}-minute forecast for '{metric.name}' using {result.model_name} "
            f"(trained on {len(df)} points). Projected from {point_schemas[0].predicted_value:.1f}{metric.unit} "
            f"to {point_schemas[-1].predicted_value:.1f}{metric.unit} at {req.confidence_level*100:.0f}% confidence."
        )

        return ForecastResponse(
            run_id=forecast_run.id,
            metric_id=metric.id,
            metric_name=metric.name,
            service_name=metric.service.name if metric.service else "unknown",
            unit=metric.unit,
            model_name=result.model_name,
            model_version=result.model_version,
            horizon_minutes=req.horizon_minutes,
            training_points_count=len(df),
            generated_at=forecast_run.generated_at,
            points=point_schemas,
            historical_points=recent_history,
            summary=summary_text,
        )

    @classmethod
    def get_latest_forecast(
        cls,
        db: Session,
        metric_id: int,
    ) -> Optional[ForecastResponse]:
        run = (
            db.query(ForecastRun)
            .filter(ForecastRun.metric_id == metric_id)
            .order_by(ForecastRun.generated_at.desc())
            .first()
        )
        if not run:
            return None

        metric = run.metric
        point_schemas = [
            ForecastPointSchema(
                target_timestamp=p.target_timestamp,
                predicted_value=p.predicted_value,
                lower_bound=p.lower_bound,
                upper_bound=p.upper_bound,
                confidence_level=p.confidence_level,
            )
            for p in run.points
        ]

        recent_obs = (
            db.query(MetricObservation)
            .filter(MetricObservation.metric_id == metric_id)
            .order_by(MetricObservation.timestamp.desc())
            .limit(60)
            .all()
        )
        recent_history = [
            HistoricalPointSchema(timestamp=obs.timestamp, value=round(obs.value, 4))
            for obs in reversed(recent_obs)
        ]

        return ForecastResponse(
            run_id=run.id,
            metric_id=metric.id,
            metric_name=metric.name,
            service_name=metric.service.name if metric.service else "unknown",
            unit=metric.unit,
            model_name=run.model_name,
            model_version=run.model_version,
            horizon_minutes=run.horizon_minutes,
            training_points_count=run.training_points_count,
            generated_at=run.generated_at,
            points=point_schemas,
            historical_points=recent_history,
            summary=f"Latest forecast run #{run.id} using {run.model_name}.",
        )
