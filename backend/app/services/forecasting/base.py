from abc import ABC, abstractmethod
from typing import Dict, Any, List
from datetime import datetime, timedelta
import pandas as pd
import numpy as np


class ForecastResult:
    """Encapsulates a model's predicted trajectory and uncertainty bounds."""

    def __init__(
        self,
        model_name: str,
        model_version: str,
        target_timestamps: List[datetime],
        predicted_values: np.ndarray,
        lower_bounds: np.ndarray,
        upper_bounds: np.ndarray,
        confidence_level: float = 0.95,
        parameters: Dict[str, Any] = None,
    ):
        self.model_name = model_name
        self.model_version = model_version
        self.target_timestamps = target_timestamps
        self.predicted_values = predicted_values
        self.lower_bounds = lower_bounds
        self.upper_bounds = upper_bounds
        self.confidence_level = confidence_level
        self.parameters = parameters or {}


class BaseForecaster(ABC):
    """Abstract base class for all time-series forecasting algorithms."""

    def __init__(self, model_name: str, model_version: str = "1.0.0"):
        self.model_name = model_name
        self.model_version = model_version

    @abstractmethod
    def fit_predict(
        self,
        df: pd.DataFrame,
        horizon_minutes: int,
        step_seconds: int = 60,
        confidence_level: float = 0.95,
    ) -> ForecastResult:
        """
        Fits the forecasting model on historical telemetry and projects forward.
        df must contain 'timestamp' (datetime) and 'value' (float) columns.
        """
        pass
