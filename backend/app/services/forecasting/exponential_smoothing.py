from datetime import datetime, timedelta
from typing import List
import numpy as np
import pandas as pd
from scipy import stats

from app.services.forecasting.base import BaseForecaster, ForecastResult


class ExponentialSmoothingForecaster(BaseForecaster):
    """
    Holt's Linear Trend / Double Exponential Smoothing.
    Models both base level (alpha) and growth velocity/trend (beta).
    Ideal for detecting memory leaks and systematic capacity trajectory climbs.
    Computes calibrated prediction intervals based on residual variance.
    """

    def __init__(self):
        super().__init__(model_name="exponential_smoothing", model_version="1.0.0")

    def fit_predict(
        self,
        df: pd.DataFrame,
        horizon_minutes: int,
        step_seconds: int = 60,
        confidence_level: float = 0.95,
    ) -> ForecastResult:
        if len(df) < 5:
            raise ValueError("Exponential Smoothing requires at least 5 historical observations.")

        df = df.sort_values("timestamp").reset_index(drop=True)
        values = df["value"].values.astype(float)
        last_time = df["timestamp"].iloc[-1]
        n = len(values)

        num_steps = max(1, int((horizon_minutes * 60) / step_seconds))
        target_timestamps = [last_time + timedelta(seconds=(i + 1) * step_seconds) for i in range(num_steps)]

        # Fit Holt's linear trend with grid search over alpha and beta
        best_alpha = 0.3
        best_beta = 0.1
        best_sse = float("inf")
        best_level = values[0]
        best_trend = values[1] - values[0]

        for a in [0.1, 0.2, 0.3, 0.5, 0.7]:
            for b in [0.05, 0.1, 0.2, 0.3]:
                level = values[0]
                trend = (values[1] - values[0]) if n > 1 else 0.0
                sse = 0.0
                for t in range(1, n):
                    pred = level + trend
                    err = values[t] - pred
                    sse += err ** 2
                    last_level = level
                    level = a * values[t] + (1 - a) * (level + trend)
                    trend = b * (level - last_level) + (1 - b) * trend

                if sse < best_sse:
                    best_sse = sse
                    best_alpha = a
                    best_beta = b

        # Final pass with optimal parameters
        level = values[0]
        trend = (values[1] - values[0]) if n > 1 else 0.0
        residuals = []

        for t in range(1, n):
            pred = level + trend
            residuals.append(values[t] - pred)
            last_level = level
            level = best_alpha * values[t] + (1 - best_alpha) * (level + trend)
            trend = best_beta * (level - last_level) + (1 - best_beta) * trend

        # Project forward: y_{t+h} = level + h * trend
        step_indices = np.arange(1, num_steps + 1)
        predicted = level + step_indices * trend

        # Residual standard error
        res_std = float(np.std(residuals)) if len(residuals) > 1 and np.std(residuals) > 0 else 1.0
        z_score = float(stats.norm.ppf(1 - (1 - confidence_level) / 2))

        # Variance multiplier expands with horizon
        var_multipliers = np.array([
            np.sqrt(1 + sum((best_alpha + j * best_alpha * best_beta) ** 2 for j in range(1, h)))
            if h > 1 else 1.0
            for h in range(1, num_steps + 1)
        ])
        half_width = z_score * res_std * var_multipliers

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
            parameters={
                "alpha": best_alpha,
                "beta": best_beta,
                "final_level": float(level),
                "trend_slope": float(trend),
                "residual_std": res_std,
            },
        )
