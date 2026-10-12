from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.metric import MetricDefinition, MetricObservation
from app.schemas.evaluation import (
    EvaluationRequest,
    EvaluationBenchmarkResponse,
    ModelMetricScore,
)
from app.services.forecasting.persistence import PersistenceForecaster
from app.services.forecasting.exponential_smoothing import ExponentialSmoothingForecaster
from app.services.forecasting.linear_trend import LinearTrendForecaster


class ModelEvaluationLabService:
    """Rigorous empirical benchmarking service testing models against naive persistence baseline."""

    @classmethod
    def evaluate(cls, db: Session, req: EvaluationRequest) -> EvaluationBenchmarkResponse:
        metric = db.query(MetricDefinition).filter(MetricDefinition.id == req.metric_id).first()
        if not metric:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Metric definition ID {req.metric_id} not found",
            )

        # 1. Fetch chronological observations
        obs = (
            db.query(MetricObservation)
            .filter(MetricObservation.metric_id == req.metric_id)
            .order_by(MetricObservation.timestamp.asc())
            .all()
        )

        if len(obs) < 25:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient telemetry for evaluation benchmark. Minimum 25 points required, found {len(obs)}.",
            )

        # 2. Chronological split (zero future leakage)
        df = pd.DataFrame([{"timestamp": o.timestamp, "value": float(o.value)} for o in obs])
        n_total = len(df)
        n_test = max(5, int(n_total * req.test_split_ratio))
        n_train = n_total - n_test

        train_df = df.iloc[:n_train]
        test_df = df.iloc[n_train:]
        actuals = test_df["value"].values

        # 3. Fit models strictly on train_df and project n_test steps ahead
        models = [
            ("persistence", PersistenceForecaster),
            ("exponential_smoothing", ExponentialSmoothingForecaster),
            ("linear_trend", LinearTrendForecaster),
        ]

        scores_dict: Dict[str, Dict[str, float]] = {}

        for name, model_cls in models:
            try:
                forecaster = model_cls()
                forecaster.fit(train_df)
                forecast_res = forecaster.predict(horizon_steps=n_test, confidence_level=0.95)
                preds = np.array([p.predicted_value for p in forecast_res.points])

                # Calculate metrics
                mae = float(np.mean(np.abs(actuals - preds)))
                rmse = float(np.sqrt(np.mean((actuals - preds) ** 2)))
                bias = float(np.mean(preds - actuals))
                
                # MAPE if non-zero
                non_zeros = actuals != 0
                if np.any(non_zeros):
                    mape = float(np.mean(np.abs((actuals[non_zeros] - preds[non_zeros]) / actuals[non_zeros])) * 100)
                else:
                    mape = None

                scores_dict[name] = {
                    "mae": round(mae, 3),
                    "rmse": round(rmse, 3),
                    "forecast_bias": round(bias, 3),
                    "mape": round(mape, 2) if mape is not None else None,
                }
            except Exception:
                # If specific algorithm fails on series, fallback
                scores_dict[name] = {
                    "mae": 999.0,
                    "rmse": 999.0,
                    "forecast_bias": 0.0,
                    "mape": None,
                }

        # 4. Compare vs Persistence Baseline
        base_mae = scores_dict.get("persistence", {}).get("mae", 1.0)
        benchmark_scores: List[ModelMetricScore] = []

        winning_model = "persistence"
        lowest_mae = base_mae

        for name in ["persistence", "exponential_smoothing", "linear_trend"]:
            s = scores_dict[name]
            mae = s["mae"]
            outperformed = mae < base_mae if name != "persistence" else False
            imp_pct = round(((base_mae - mae) / base_mae) * 100.0, 1) if base_mae > 0 else 0.0

            if mae < lowest_mae:
                lowest_mae = mae
                winning_model = name

            benchmark_scores.append(
                ModelMetricScore(
                    model_name=name,
                    mae=s["mae"],
                    rmse=s["rmse"],
                    forecast_bias=s["forecast_bias"],
                    mape=s["mape"],
                    outperformed_baseline=outperformed,
                    improvement_vs_baseline_pct=imp_pct,
                )
            )

        summary = (
            f"Evaluation Lab Benchmark for {metric.name} ({metric.unit}): "
            f"Evaluated across {n_train} train and {n_test} holdout test steps. "
            f"Winning algorithm: '{winning_model}' with MAE: {lowest_mae:.3f} "
            f"(vs Persistence Baseline MAE: {base_mae:.3f})."
        )

        return EvaluationBenchmarkResponse(
            metric_id=metric.id,
            metric_name=metric.name,
            service_name=metric.service.name if metric.service else "unknown",
            unit=metric.unit,
            total_observations_analyzed=n_total,
            training_points_count=n_train,
            test_points_count=n_test,
            benchmark_scores=benchmark_scores,
            winning_model=winning_model,
            evaluation_summary=summary,
            evaluated_at=datetime.now(timezone.utc),
        )
