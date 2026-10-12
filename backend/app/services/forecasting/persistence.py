from datetime import datetime, timedelta
from typing import List
import numpy as np
import pandas as pd
from scipy import stats

from app.services.forecasting.base import BaseForecaster, ForecastResult


class PersistenceForecaster(BaseForecaster):
    """
    Standard Persistence / Naive Baseline.
    Assumes future value equals the last observed value: y_{t+h} = y_t.
    Uncertainty expands with horizon based on historical random walk variance: sigma * sqrt(h).
    """

    def __init__(self):
        super().__init__(model_name="persistence", model_version="1.0.0")

    def fit_predict(
        self,
        df: pd.DataFrame,
        horizon_minutes: int,
        step_seconds: int = 60,
        confidence_level: float = 0.95,
    ) -> ForecastResult:
        if len(df) < 2:
            raise ValueError("Persistence forecaster requires at least 2 historical observations.")

        # Sort chronologically to prevent temporal leakage
        df = df.sort_values("timestamp").reset_index(drop=True)
        values = df["value"].values
        last_val = float(values[-1])
        last_time = df["timestamp"].iloc[-1]

        # Calculate steps
        num_steps = max(1, int((horizon_minutes * 60) / step_seconds))
        target_timestamps = [last_time + timedelta(seconds=(i + 1) * step_seconds) for i in range(num_steps)]

        # Estimate residual volatility from first-order differences
        diffs = np.diff(values)
        sigma = float(np.std(diffs)) if len(diffs) > 1 and np.std(diffs) > 0 else 1.0

        # Critical z-value for confidence level
        z_score = float(stats.norm.ppf(1 - (1 - confidence_level) / 2))

        predicted = np.full(num_steps, last_val)
        step_indices = np.arange(1, num_steps + 1)
        half_width = z_score * sigma * np.sqrt(step_indices)

        lower_bounds = np.maximum(0.0, predicted - half_width)
        upper_bounds = predicted + half_width

        return ForecastResult(
            model_name=self.model_name,
            model_version=self.model_version,
            target_timestamps=target_timestamps,
            predicted_values=predicted,
            lower_bounds=lower_bounds,
            upper_bounds=upper_bounds,
            confidence_level=confidence_level,
            parameters={"last_value": last_val, "residual_sigma": sigma},
        )
