from fastapi.testclient import TestClient


def test_ai_investigator_and_simulator_e2e(client: TestClient):
    # 1. Generate synthetic telemetry for worker service
    gen_res = client.post("/api/v1/telemetry/synthetic/generate", json={
        "service_name": "inventory-service",
        "scenario": "memory_leak",
        "duration_minutes": 60,
        "interval_seconds": 60,
        "seed": 99,
    })
    assert gen_res.status_code == 201

    # 2. Get metric ID
    services_res = client.get("/api/v1/services/")
    svc = next(s for s in services_res.json() if s["name"] == "inventory-service")

    metrics_res = client.get(f"/api/v1/metrics/?service_id={svc['id']}")
    mem_metric = next(m for m in metrics_res.json() if m["name"] == "memory_utilization")
    metric_id = mem_metric["id"]

    # 3. Log a correlated operational event
    client.post("/api/v1/events/", json={
        "service_id": svc["id"],
        "event_type": "deployment",
        "title": "Release v3.1.0 update",
        "severity": "info",
    })

    # 4. Run AI Investigation
    inv_res = client.post("/api/v1/investigator/investigate", json={
        "metric_id": metric_id,
        "lookback_minutes": 120,
    })
    assert inv_res.status_code == 200
    report = inv_res.json()
    assert report["metric_id"] == metric_id
    assert report["service_name"] == "inventory-service"
    assert report["synthesizer_mode"] == "deterministic_grounded"
    assert len(report["evidence_ledger"]) > 0
    assert len(report["recommended_runbook_actions"]) > 0
    assert "investigative lead" in report["cautionary_notice"].lower()

    # 5. Run What-If Simulation: Horizontal Replica Scaling
    sim_res = client.post("/api/v1/simulation/simulate", json={
        "metric_id": metric_id,
        "action_type": "scale_replicas",
        "parameter_value": 2.0,
        "current_replicas": 2,
    })
    assert sim_res.status_code == 200
    sim = sim_res.json()
    assert sim["is_read_only"] is True
    assert sim["action_type"] == "scale_replicas"
    assert sim["impact_delta_percentage"] == 50.0  # 2/(2+2) = 0.5 -> 50% reduction
    assert len(sim["simulated_trajectory"]) > 0
    # Projected trajectory should be halved
    pt1 = sim["simulated_trajectory"][0]
    assert round(pt1["mitigated_predicted_value"], 1) == round(pt1["baseline_predicted_value"] * 0.5, 1)

    # 6. List simulation scenarios
    scenarios_res = client.get("/api/v1/simulation/scenarios")
    assert scenarios_res.status_code == 200
    assert len(scenarios_res.json()) >= 3
