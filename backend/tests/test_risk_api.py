from fastapi.testclient import TestClient


def test_capacity_risk_api_lifecycle(client: TestClient):
    # 1. Generate memory_leak scenario telemetry
    gen_res = client.post("/api/v1/telemetry/synthetic/generate", json={
        "service_name": "checkout-service",
        "scenario": "memory_leak",
        "duration_minutes": 60,
        "interval_seconds": 60,
        "seed": 42,
    })
    assert gen_res.status_code == 201

    # 2. Get created metric ID for memory_utilization
    services_res = client.get("/api/v1/services/")
    services = services_res.json()
    svc = next(s for s in services if s["name"] == "checkout-service")

    metrics_res = client.get(f"/api/v1/metrics/?service_id={svc['id']}")
    metrics = metrics_res.json()
    mem_metric = next(m for m in metrics if m["name"] == "memory_utilization")
    metric_id = mem_metric["id"]

    # 3. Assess Risk on memory_utilization
    assess_res = client.post("/api/v1/risk/assess", json={
        "metric_id": metric_id,
        "horizon_minutes": 60,
        "model_type": "exponential_smoothing",
    })
    assert assess_res.status_code == 200
    data = assess_res.json()
    assert data["metric_id"] == metric_id
    assert data["risk_state"] in ["CRITICAL", "ELEVATED", "WATCH", "NORMAL"]
    assert data["risk_score"] > 0
    assert "explanation" in data
    assert data["time_to_breach_display"] is not None

    # 4. Fetch latest assessment for the metric
    latest_res = client.get(f"/api/v1/risk/latest/{metric_id}")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()
    assert latest_data["id"] == data["id"]
    assert latest_data["metric_id"] == metric_id

    # 5. Fetch system-wide risk overview
    overview_res = client.get("/api/v1/risk/overview")
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["total_metrics_evaluated"] > 0
    assert len(overview["highest_risk_items"]) > 0
    # checkout-service metric should be among evaluated items
    item_metrics = [it["metric_id"] for it in overview["highest_risk_items"]]
    assert metric_id in item_metrics


def test_risk_assessment_nonexistent_metric(client: TestClient):
    res = client.post("/api/v1/risk/assess", json={
        "metric_id": 999999,
        "horizon_minutes": 60,
    })
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
