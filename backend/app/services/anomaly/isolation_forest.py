from typing import List
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.services.anomaly.base import BaseAnomalyDetector, AnomalyPoint


class IsolationForestDetector(BaseAnomalyDetector):
    """
    Unsupervised Isolation Forest Anomaly Detector.
    Isolates metric outliers across multidimensional time-series features
    (current level, first-order differential, rolling moving average).
    Produces normalized anomaly scores between 0.0 (normal) and 1.0 (highly anomalous).
    """

    def __init__(self, random_state: int = 42):
        super().__init__(model_name="isolation_forest", model_version="1.0.0")
        self.random_state = random_state

    def detect(
        self,
        df: pd.DataFrame,
        sensitivity: float = 2.5,
    ) -> List[AnomalyPoint]:
        if len(df) < 15:
            return []

        df = df.sort_values("timestamp").reset_index(drop=True)
        values = df["value"].astype(float).values

        # Feature Engineering:
        # 1. Raw value
        # 2. First-order differential (growth rate)
        # 3. Deviation from rolling mean
        diffs = np.zeros_like(values)
        diffs[1:] = np.diff(values)

        rolling_mean = pd.Series(values).rolling(window=10, min_periods=3).mean().bfill().values
        deviation = values - rolling_mean

        X = np.column_stack([values, diffs, deviation])

        # Map sensitivity (1.0 to 5.0) to contamination factor (0.01 to 0.15)
        # Lower sensitivity -> fewer anomalies, higher sensitivity -> more anomalies
        contamination = min(0.15, max(0.01, 0.02 * (sensitivity / 2.0)))

        iso = IsolationForest(
            contamination=contamination,
            random_state=self.random_state,
            n_estimators=100,
        )
        preds = iso.fit_predict(X)  # -1 for anomaly, 1 for normal
        decision_scores = iso.decision_function(X)  # Lower is more abnormal

        # Normalize decision function to [0.0, 1.0] anomaly score
        # decision_function typically ranges from -0.5 to +0.5
        min_s, max_s = np.min(decision_scores), np.max(decision_scores)
        range_s = max(1e-4, max_s - min_s)
        norm_scores = 1.0 - ((decision_scores - min_s) / range_s)

        results: List[AnomalyPoint] = []
        for idx in range(len(df)):
            t = df["timestamp"].iloc[idx]
            val = float(values[idx])
            mean_val = float(rolling_mean[idx])
            score = round(float(norm_scores[idx]), 4)
            is_anomaly = bool(preds[idx] == -1)

            if score >= 0.85:
                severity = "critical"
            elif score >= 0.70:
                severity = "high"
            elif score >= 0.55:
                severity = "medium"
            else:
                severity = "low"

            explanation = (
                f"Isolation Forest identified multidimensional metric anomaly (isolation score {score:.2f}) "
                f"with value {val:.2f} relative to rolling level ({mean_val:.2f})."
            )

            results.append(
                AnomalyPoint(
                    timestamp=t,
                    actual_value=round(val, 4),
                    expected_value=round(mean_val, 4),
                    anomaly_score=score,
                    is_anomaly=is_anomaly,
                    severity=severity,
                    explanation=explanation,
                )
            )

        return results
