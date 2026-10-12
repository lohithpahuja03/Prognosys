from datetime import datetime, timezone, timedelta
import numpy as np
import pandas as pd
import pytest

from app.services.forecasting.persistence import PersistenceForecaster
from app.services.forecasting.exponential_smoothing import ExponentialSmoothingForecaster
from app.services.forecasting.linear_trend import LinearTrendForecaster


@pytest.fixture
def sample_upward_telemetry():
    """Generates 30 minutes of upward ramping telemetry (e.g. memory leak)."""
    start = datetime(2026, 10, 12, 12, 0, 0, tzinfo=timezone.utc)
    data = []
    for i in range(30):
        t = start + timedelta(minutes=i)
        val = 50.0 + 1.0 * i + np.random.normal(0, 0.2)  # upward slope +1.0/min
        data.append({"timestamp": t, "value": val})
    return pd.DataFrame(data)


def test_persistence_forecaster(sample_upward_telemetry):
    forecaster = PersistenceForecaster()
    result = forecaster.fit_predict(sample_upward_telemetry, horizon_minutes=15)

    assert result.model_name == "persistence"
    assert len(result.predicted_values) == 15
    # Naive forecast must be flat at the last observed point
    last_val = sample_upward_telemetry["value"].iloc[-1]
    assert pytest.approx(result.predicted_values[0], 0.01) == last_val
    assert pytest.approx(result.predicted_values[-1], 0.01) == last_val

    # Uncertainty must expand with horizon: upper_bound[14] > upper_bound[0]
    assert result.upper_bounds[-1] > result.upper_bounds[0]
    assert result.lower_bounds[-1] < result.lower_bounds[0]


def test_exponential_smoothing_forecaster(sample_upward_telemetry):
    forecaster = ExponentialSmoothingForecaster()
    result = forecaster.fit_predict(sample_upward_telemetry, horizon_minutes=30)

    assert result.model_name == "exponential_smoothing"
    assert len(result.predicted_values) == 30

    # Trend detection: on upward series, projected points must increase
    assert result.predicted_values[-1] > result.predicted_values[0]
    # Projected final value should reflect the slope (approx 50 + 30 + 30 = ~110)
    assert result.predicted_values[-1] > 90.0

    # Bounds must strictly bracket predicted values
    for pred, low, up in zip(result.predicted_values, result.lower_bounds, result.upper_bounds):
        assert low <= pred <= up


def test_linear_trend_forecaster(sample_upward_telemetry):
    forecaster = LinearTrendForecaster()
    result = forecaster.fit_predict(sample_upward_telemetry, horizon_minutes=20)

    assert result.model_name == "linear_trend"
    assert len(result.predicted_values) == 20
    assert result.parameters["slope"] > 0.8  # True slope is ~1.0

    # Forecast values must increase monotonically
    for i in range(1, len(result.predicted_values)):
        assert result.predicted_values[i] > result.predicted_values[i - 1]


def test_forecaster_insufficient_data():
    forecaster = ExponentialSmoothingForecaster()
    df_tiny = pd.DataFrame([
        {"timestamp": datetime.now(timezone.utc), "value": 45.0},
        {"timestamp": datetime.now(timezone.utc) + timedelta(minutes=1), "value": 46.0},
    ])
    with pytest.raises(ValueError, match="requires at least 5 historical observations"):
        forecaster.fit_predict(df_tiny, horizon_minutes=15)
