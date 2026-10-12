from datetime import datetime, timezone, timedelta
import numpy as np
import pandas as pd
import pytest

from app.services.anomaly.statistical_zscore import StatisticalZScoreDetector
from app.services.anomaly.isolation_forest import IsolationForestDetector


@pytest.fixture
def series_with_spike():
    """Generates 40 minutes of normal telemetry (around 30%) with a single severe spike to 95%."""
    start = datetime(2026, 10, 12, 12, 0, 0, tzinfo=timezone.utc)
    data = []
    for i in range(40):
        t = start + timedelta(minutes=i)
        val = 30.0 + np.random.normal(0, 1.0)
        if i == 25:
            val = 95.0  # Massive outlier spike
        data.append({"timestamp": t, "value": val})
    return pd.DataFrame(data)


def test_statistical_zscore_detector(series_with_spike):
    detector = StatisticalZScoreDetector(window_size=15)
    points = detector.detect(series_with_spike, sensitivity=2.5)

    assert len(points) == 40
    anomalies = [p for p in points if p.is_anomaly]

    # Must detect the spike at index 25
    assert len(anomalies) >= 1
    spike_pt = points[25]
    assert spike_pt.is_anomaly is True
    assert spike_pt.severity in ["high", "critical"]
    assert spike_pt.anomaly_score > 0.8
    assert "deviates by" in spike_pt.explanation


def test_isolation_forest_detector(series_with_spike):
    detector = IsolationForestDetector(random_state=42)
    points = detector.detect(series_with_spike, sensitivity=2.5)

    assert len(points) == 40
    anomalies = [p for p in points if p.is_anomaly]
    assert len(anomalies) >= 1

    # Spike point at index 25 must have elevated anomaly score
    spike_pt = points[25]
    assert spike_pt.anomaly_score > 0.7


def test_clean_series_minimal_anomalies():
    """Verify that stable telemetry with no spikes does not trigger high false positives."""
    start = datetime(2026, 10, 12, 12, 0, 0, tzinfo=timezone.utc)
    data = [
        {"timestamp": start + timedelta(minutes=i), "value": 50.0 + 0.1 * np.sin(i)}
        for i in range(30)
    ]
    df = pd.DataFrame(data)
    detector = StatisticalZScoreDetector(window_size=10)
    points = detector.detect(df, sensitivity=3.0)

    anomalies = [p for p in points if p.is_anomaly]
    assert len(anomalies) == 0
