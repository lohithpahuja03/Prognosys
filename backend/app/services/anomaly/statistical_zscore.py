from typing import List
import numpy as np
import pandas as pd

from app.services.anomaly.base import BaseAnomalyDetector, AnomalyPoint


class StatisticalZScoreDetector(BaseAnomalyDetector):
    """
    Rolling Statistical Z-Score Anomaly Detector.
    Computes rolling mean and standard deviation over a sliding baseline window.
    Flags points where the absolute z-score exceeds the configured sensitivity threshold.
    """

    def __init__(self, window_size: int = 20):
        super().__init__(model_name="statistical_zscore", model_version="1.0.0")
        self.window_size = window_size

    def detect(
        self,
        df: pd.DataFrame,
        sensitivity: float = 2.5,
    ) -> List[AnomalyPoint]:
        if len(df) < 5:
            return []

        df = df.sort_values("timestamp").reset_index(drop=True)
        values = df["value"].astype(float)

        rolling_mean = values.rolling(window=self.window_size, min_periods=5).mean()
        rolling_std = values.rolling(window=self.window_size, min_periods=5).std().fillna(1.0)
        rolling_std = rolling_std.replace(0.0, 1.0)

        z_scores = (values - rolling_mean) / rolling_std

        results: List[AnomalyPoint] = []
        for idx in range(len(df)):
            t = df["timestamp"].iloc[idx]
            val = float(values.iloc[idx])
            mean_val = float(rolling_mean.iloc[idx]) if pd.notna(rolling_mean.iloc[idx]) else val
            std_val = float(rolling_std.iloc[idx]) if pd.notna(rolling_std.iloc[idx]) else 1.0
            z = float(z_scores.iloc[idx]) if pd.notna(z_scores.iloc[idx]) else 0.0

            abs_z = abs(z)
            # Normalized anomaly score 0.0 - 1.0
            anomaly_score = min(1.0, round(abs_z / 4.5, 4))
            is_anomaly = abs_z >= sensitivity

            if abs_z >= 4.0:
                severity = "critical"
            elif abs_z >= 3.0:
                severity = "high"
            elif abs_z >= 2.5:
                severity = "medium"
            else:
                severity = "low"

            delta_str = f"+{z:.1f}" if z > 0 else f"{z:.1f}"
            explanation = (
                f"Observed value {val:.2f} deviates by {delta_str} standard deviations from the "
                f"rolling baseline mean ({mean_val:.2f} ± {std_val:.2f})."
            )

            results.append(
                AnomalyPoint(
                    timestamp=t,
                    actual_value=round(val, 4),
                    expected_value=round(mean_val, 4),
                    anomaly_score=anomaly_score,
                    is_anomaly=is_anomaly,
                    severity=severity,
                    explanation=explanation,
                )
            )

        return results
