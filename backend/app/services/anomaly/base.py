from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd


class AnomalyPoint:
    """Represents a single observation evaluated for anomalies."""

    def __init__(
        self,
        timestamp: datetime,
        actual_value: float,
        expected_value: Optional[float],
        anomaly_score: float,  # Normalized 0.0 to 1.0
        is_anomaly: bool,
        severity: str,  # low, medium, high, critical
        explanation: str,
    ):
        self.timestamp = timestamp
        self.actual_value = actual_value
        self.expected_value = expected_value
        self.anomaly_score = anomaly_score
        self.is_anomaly = is_anomaly
        self.severity = severity
        self.explanation = explanation


class BaseAnomalyDetector(ABC):
    """Abstract interface for time-series anomaly detection algorithms."""

    def __init__(self, model_name: str, model_version: str = "1.0.0"):
        self.model_name = model_name
        self.model_version = model_version

    @abstractmethod
    def detect(
        self,
        df: pd.DataFrame,
        sensitivity: float = 2.5,
    ) -> List[AnomalyPoint]:
        """
        Analyzes historical observations and returns a list of AnomalyPoint evaluations.
        df must contain 'timestamp' (datetime) and 'value' (float) columns.
        """
        pass
