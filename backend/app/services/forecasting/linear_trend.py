from datetime import datetime, timedelta
from typing import List
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from scipy import stats

from app.services.forecasting.base import BaseForecaster, ForecastResult


class LinearTrendForecaster(BaseForecaster):
    """
    Ordinary Least Squares (OLS) Linear Trend Model.
    Models metric as a direct function of time index: y = beta_0 + beta_1 * t.
    Computes classical prediction intervals based on regression residual variance.
    """

    def __init__(self):
        super().__init__(model_name="linear_trend", model_version="1.0.0")

    def fit_predict(
        self,
        df: pd.DataFrame,
        horizon_minutes: int,
        step_seconds: int = 60,
        confidence_level: float = 0.95,
    ) -> ForecastResult:
        if len(df) < 3:
            raise ValueError("Linear Trend forecaster requires at least 3 historical observations.")

        df = df.sort_values("timestamp").reset_index(drop=True)
        values = df["value"].values.astype(float)
        n = len(values)
        last_time = df["timestamp"].iloc[-1]

        # Time feature 0, 1, 2, ..., n-1
        X_train = np.arange(n).reshape(-1, 1)
        reg = LinearRegression()
        reg.fit(X_train, values)

        # Residual standard error
        preds_train = reg.predict(X_train)
        residuals = values - preds_train
        dof = max(1, n - 2)
        s_e = float(np.sqrt(np.sum(residuals ** 2) / dof)) if np.sum(residuals ** 2) > 0 else 1.0

        num_steps = max(1, int((horizon_minutes * 60) / step_seconds))
        target_timestamps = [last_time + timedelta(seconds=(i + 1) * step_seconds) for i in range(num_steps)]

        # Future time steps n, n+1, ..., n+num_steps-1
        X_future = np.arange(n, n + num_steps).reshape(-1, 1)
        predicted = reg.predict(X_future)

        # Prediction interval calculation
        x_mean = np.mean(X_train)
        s_xx = np.sum((X_train - x_mean) ** 2)
        t_crit = float(stats.t.ppf(1 - (1 - confidence_level) / 2, df=dof))

        se_future = s_e * np.sqrt(1 + (1 / n) + ((X_future.flatten() - x_mean) ** 2) / max(1e-6, s_xx))
        half_width = t_crit * se_future

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
                "slope": float(reg.coef_[0]),
                "intercept": float(reg.intercept_),
                "residual_std": s_e,
            },
        )
