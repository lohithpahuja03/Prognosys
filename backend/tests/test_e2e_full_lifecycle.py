"""Comprehensive end-to-end integration lifecycle test covering all 10 architectural phases:
Service Catalog -> Synthetic Scenario Telemetry -> Anomaly Detection ->
Multi-Horizon Forecasting -> Capacity Risk Intelligence -> Operational Event Logging ->
Temporal Correlation -> AI Investigation Report -> What-If Response Simulation ->
Model Evaluation Lab Benchmarking.
"""
from fastapi.testclient import TestClient


def test_full_prognosys_system_lifecycle_e2e(client: TestClient):
    # Phase 1: Health check
    health_res = client.get("/api/v1/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"

    # Phase 2: Create services and generate reproducible telemetry
    svc_res = client.post("/api/v1/services/", json={
        "name": "billing-engine",
        "tier": "critical",
    })
    assert svc_res.status_code == 201
    svc_id = svc_res.json()["id"]

    gen_res = client.post("/api/v1/telemetry/synthetic/generate", json={
        "service_name": "billing-engine",
        "scenario": "memory_leak",
        "duration_minutes": 60,
        "interval_seconds": 60,
        "seed": 101,
    })
    assert gen_res.status_code == 201

    metrics_res = client.get(f"/api/v1/metrics/?service_id={svc_id}")
    metrics = metrics_res.json()
    assert len(metrics) > 0
    mem_metric = next(m for m in metrics if m["name"] == "memory_utilization")
    metric_id = mem_metric["id"]

    # Phase 3: Multi-Horizon Forecasting and Anomaly Detection
    fc_res = client.post("/api/v1/forecast/generate", json={
        "metric_id": metric_id,
        "horizon_minutes": 30,
        "model_type": "exponential_smoothing",
    })
    assert fc_res.status_code == 200
    assert len(fc_res.json()["points"]) == 30

    anom_res = client.post("/api/v1/anomalies/detect", json={
        "metric_id": metric_id,
        "model_type": "statistical_zscore",
        "lookback_minutes": 60,
    })
    assert anom_res.status_code == 200

    # Phase 4: Capacity Risk Intelligence & Time-to-Breach Estimation
    risk_res = client.post("/api/v1/risk/assess", json={
        "metric_id": metric_id,
        "horizon_minutes": 60,
        "model_type": "exponential_smoothing",
    })
    assert risk_res.status_code == 200
    risk_data = risk_res.json()
    assert risk_data["risk_state"] in ["CRITICAL", "ELEVATED", "WATCH", "NORMAL"]
    assert risk_data["time_to_breach_display"] is not None

    overview_res = client.get("/api/v1/risk/overview")
    assert overview_res.status_code == 200
    assert overview_res.json()["total_metrics_evaluated"] > 0

    # Phase 5: Operational Context & Temporal Event Correlation
    ev_res = client.post("/api/v1/events/", json={
        "service_id": svc_id,
        "event_type": "deployment",
        "title": "Billing Engine v4.0 canary rollout",
        "severity": "info",
    })
    assert ev_res.status_code == 201

    corr_res = client.get(f"/api/v1/events/correlate/{metric_id}?lookback_minutes=60")
    assert corr_res.status_code == 200
    assert corr_res.json()["total_events_in_window"] > 0

    # Phase 6 & 7: AI Investigation & What-If Response Simulation
    inv_res = client.post("/api/v1/investigator/investigate", json={
        "metric_id": metric_id,
        "lookback_minutes": 120,
    })
    assert inv_res.status_code == 200
    inv = inv_res.json()
    assert inv["synthesizer_mode"] == "deterministic_grounded"
    assert len(inv["evidence_ledger"]) > 0
    assert len(inv["recommended_runbook_actions"]) > 0

    sim_res = client.post("/api/v1/simulation/simulate", json={
        "metric_id": metric_id,
        "action_type": "traffic_shedding",
        "parameter_value": 30.0,
    })
    assert sim_res.status_code == 200
    assert sim_res.json()["is_read_only"] is True
    assert sim_res.json()["impact_delta_percentage"] == 30.0

    # Phase 8: Model Evaluation Lab Benchmark
    eval_res = client.post("/api/v1/evaluation/run", json={
        "metric_id": metric_id,
        "test_split_ratio": 0.25,
    })
    assert eval_res.status_code == 200
    bench = eval_res.json()
    assert len(bench["benchmark_scores"]) == 3
    assert bench["winning_model"] in ["persistence", "exponential_smoothing", "linear_trend"]
