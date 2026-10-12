import pytest
from sqlalchemy.orm import Session

from app.models.service import Service
from app.models.metric import MetricDefinition, MetricObservation
from app.schemas.telemetry import SyntheticGeneratorRequest
from app.services.synthetic_generator import SyntheticTelemetryGenerator


def test_synthetic_generator_memory_leak(db_session: Session):
    """Verify memory leak scenario produces deterministic upward ramp with seed."""
    generator = SyntheticTelemetryGenerator(seed=42)
    req = SyntheticGeneratorRequest(
        service_name="api-worker",
        scenario="memory_leak",
        duration_minutes=60,
        interval_seconds=60,
        seed=42,
    )
    result = generator.generate(db_session, req)

    assert result.service_name == "api-worker"
    assert result.scenario == "memory_leak"
    assert result.observations_created == 60 * 3  # memory, cpu, latency
    assert "memory_utilization" in result.metrics_generated
    assert "cpu_utilization" in result.metrics_generated

    # Verify observations in database
    svc = db_session.query(Service).filter(Service.name == "api-worker").first()
    assert svc is not None

    mem_metric = (
        db_session.query(MetricDefinition)
        .filter(MetricDefinition.service_id == svc.id, MetricDefinition.name == "memory_utilization")
        .first()
    )
    assert mem_metric is not None
    assert mem_metric.warning_threshold == 80.0
    assert mem_metric.critical_threshold == 90.0

    obs = (
        db_session.query(MetricObservation)
        .filter(MetricObservation.metric_id == mem_metric.id)
        .order_by(MetricObservation.timestamp.asc())
        .all()
    )
    assert len(obs) == 60

    # Trend verification: memory leak must start lower and end higher
    first_val = obs[0].value
    last_val = obs[-1].value
    assert last_val > first_val
    assert last_val > 75.0  # Should be elevated


def test_synthetic_generator_reproducibility(db_session: Session):
    """Verify that using the same seed produces identical numerical outputs."""
    gen1 = SyntheticTelemetryGenerator(seed=100)
    gen2 = SyntheticTelemetryGenerator(seed=100)

    req1 = SyntheticGeneratorRequest(
        service_name="svc-a",
        scenario="traffic_spike",
        duration_minutes=30,
        interval_seconds=60,
        seed=100,
    )
    req2 = SyntheticGeneratorRequest(
        service_name="svc-b",
        scenario="traffic_spike",
        duration_minutes=30,
        interval_seconds=60,
        seed=100,
    )

    gen1.generate(db_session, req1)
    gen2.generate(db_session, req2)

    svca = db_session.query(Service).filter(Service.name == "svc-a").first()
    svcb = db_session.query(Service).filter(Service.name == "svc-b").first()

    m_a = db_session.query(MetricDefinition).filter(MetricDefinition.service_id == svca.id, MetricDefinition.name == "cpu_utilization").first()
    m_b = db_session.query(MetricDefinition).filter(MetricDefinition.service_id == svcb.id, MetricDefinition.name == "cpu_utilization").first()

    obs_a = db_session.query(MetricObservation).filter(MetricObservation.metric_id == m_a.id).order_by(MetricObservation.timestamp.asc()).all()
    obs_b = db_session.query(MetricObservation).filter(MetricObservation.metric_id == m_b.id).order_by(MetricObservation.timestamp.asc()).all()

    assert len(obs_a) == len(obs_b)
    for a, b in zip(obs_a, obs_b):
        assert pytest.approx(a.value, 1e-4) == b.value
