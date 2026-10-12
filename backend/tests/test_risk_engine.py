from datetime import datetime, timezone
from app.schemas.forecast import ForecastPointSchema
from app.services.risk.calculator import CapacityRiskCalculator


def make_dummy_point(step: int, val: float, lower: float = 0.0, upper: float = 0.0) -> ForecastPointSchema:
    return ForecastPointSchema(
        target_timestamp=datetime.now(timezone.utc),
        predicted_value=val,
        lower_bound=lower if lower else val - 2.0,
        upper_bound=upper if upper else val + 2.0,
    )


def test_insufficient_data():
    res = CapacityRiskCalculator.evaluate(
        current_value=45.0,
        unit="percent",
        warning_threshold=80.0,
        critical_threshold=90.0,
        capacity_limit=100.0,
        forecast_points=[],
        is_insufficient_data=True,
    )
    assert res.risk_state == "INSUFFICIENT_DATA"
    assert res.risk_score == 0.0
    assert res.time_to_breach_minutes is None


def test_active_critical_breach():
    pts = [make_dummy_point(i, 92.0 + i) for i in range(1, 10)]
    res = CapacityRiskCalculator.evaluate(
        current_value=93.5,
        unit="percent",
        warning_threshold=80.0,
        critical_threshold=90.0,
        capacity_limit=100.0,
        forecast_points=pts,
    )
    assert res.risk_state == "CRITICAL"
    assert res.risk_score == 100.0
    assert res.time_to_breach_minutes == 0.0
    assert res.predicted_breach_type == "critical"


def test_predicted_critical_breach_interpolation():
    # Start at 75%, ramps up to 95% across 20 steps
    # Point 15 reaches 90%
    pts = [make_dummy_point(i, 75.0 + i * 1.0) for i in range(1, 25)]
    res = CapacityRiskCalculator.evaluate(
        current_value=75.0,
        unit="percent",
        warning_threshold=80.0,
        critical_threshold=90.0,
        capacity_limit=100.0,
        forecast_points=pts,
    )
    assert res.risk_state == "CRITICAL"
    assert res.predicted_breach_type == "critical"
    assert res.time_to_breach_minutes is not None
    # 75 + 1.0 * 15 = 90 -> exactly 15 minutes
    assert round(res.time_to_breach_minutes) == 15
    assert res.risk_score >= 80.0


def test_predicted_warning_breach():
    # Start at 70%, ramps up to 82% over 30 steps (never touches 90%)
    pts = [make_dummy_point(i, 70.0 + i * 0.4) for i in range(1, 31)]
    res = CapacityRiskCalculator.evaluate(
        current_value=70.0,
        unit="percent",
        warning_threshold=80.0,
        critical_threshold=90.0,
        capacity_limit=100.0,
        forecast_points=pts,
    )
    assert res.risk_state == "ELEVATED"
    assert res.predicted_breach_type == "warning"
    assert res.time_to_breach_minutes is not None
    # 70 + 0.4 * 25 = 80 -> 25 minutes
    assert round(res.time_to_breach_minutes) == 25


def test_watch_state_uncertainty_spread():
    # Mean is 70% (flat), but upper bound reaches 82%
    pts = [make_dummy_point(i, 70.0, lower=60.0, upper=82.0) for i in range(1, 31)]
    res = CapacityRiskCalculator.evaluate(
        current_value=70.0,
        unit="percent",
        warning_threshold=80.0,
        critical_threshold=90.0,
        capacity_limit=100.0,
        forecast_points=pts,
    )
    assert res.risk_state == "WATCH"
    assert res.time_to_breach_minutes is None


def test_normal_healthy_state():
    # Stable 35% utilization
    pts = [make_dummy_point(i, 35.0, lower=30.0, upper=40.0) for i in range(1, 31)]
    res = CapacityRiskCalculator.evaluate(
        current_value=35.0,
        unit="percent",
        warning_threshold=80.0,
        critical_threshold=90.0,
        capacity_limit=100.0,
        forecast_points=pts,
    )
    assert res.risk_state == "NORMAL"
    assert res.risk_score <= 20.0
    assert res.time_to_breach_minutes is None
