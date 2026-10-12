from fastapi.testclient import TestClient


def test_forecast_and_anomaly_apis_e2e(client: TestClient):
    # 1. Generate synthetic telemetry first to have observations
    gen_res = client.post("/api/v1/telemetry/synthetic/generate", json={
        "service_name": "worker-service",
        "scenario": "memory_leak",
        "duration_minutes": 60,
        "interval_seconds": 60,
        "seed": 42,
    })
    assert gen_res.status_code == 201

    # 2. Get the created metric ID for memory_utilization
    services_res = client.get("/api/v1/services/")
    services = services_res.json()
    worker_svc = next(s for s in services if s["name"] == "worker-service")

    metrics_res = client.get(f"/api/v1/metrics/?service_id={worker_svc['id']}")
    metrics = metrics_res.json()
    mem_metric = next(m for m in metrics if m["name"] == "memory_utilization")
    metric_id = mem_metric["id"]

    # 3. Test list available models
    models_res = client.get("/api/v1/forecast/models")
    assert models_res.status_code == 200
    assert "exponential_smoothing" in models_res.json()
    assert "persistence" in models_res.json()

    # 4. Generate a 30-minute forecast using Exponential Smoothing
    fc_res = client.post("/api/v1/forecast/generate", json={
        "metric_id": metric_id,
        "horizon_minutes": 30,
        "model_type": "exponential_smoothing",
        "confidence_level": 0.95,
    })
    assert fc_res.status_code == 200
    fc_data = fc_res.json()
    assert fc_data["metric_id"] == metric_id
    assert fc_data["model_name"] == "exponential_smoothing"
    assert len(fc_data["points"]) == 30
    assert len(fc_data["historical_points"]) > 0
    assert "Generated 30-minute forecast" in fc_data["summary"]

    # 5. Query latest forecast
    latest_res = client.get(f"/api/v1/forecast/latest/{metric_id}")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()
    assert latest_data["run_id"] == fc_data["run_id"]

    # 6. Run Anomaly Detection
    anom_res = client.post("/api/v1/anomalies/detect", json={
        "metric_id": metric_id,
        "model_type": "statistical_zscore",
        "lookback_minutes": 60,
        "sensitivity": 2.5,
    })
    assert anom_res.status_code == 200
    anom_data = anom_res.json()
    assert anom_data["metric_id"] == metric_id
    assert anom_data["total_points_analyzed"] >= 50
    assert len(anom_data["detections"]) > 0

    # 7. Query recorded anomalies
    saved_anom_res = client.get(f"/api/v1/anomalies/{metric_id}")
    assert saved_anom_res.status_code == 200


def test_forecast_insufficient_data_rejection(client: TestClient):
    # Create empty service and metric with 0 observations
    svc_res = client.post("/api/v1/services/", json={
        "name": "brand-new-svc",
        "tier": "standard",
    })
    svc_id = svc_res.json()["id"]

    m_res = client.post("/api/v1/metrics/", json={
        "service_id": svc_id,
        "name": "brand_new_metric",
        "unit": "percent",
    })
    metric_id = m_res.json()["id"]

    # Request forecast
    fc_res = client.post("/api/v1/forecast/generate", json={
        "metric_id": metric_id,
        "horizon_minutes": 30,
        "model_type": "persistence",
    })
    assert fc_res.status_code == 400
    err_msg = fc_res.json()["detail"]
    assert "Insufficient historical data" in err_msg
