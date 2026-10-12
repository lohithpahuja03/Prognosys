from fastapi.testclient import TestClient


def test_services_api_lifecycle(client: TestClient):
    # 1. Create a service
    res = client.post("/api/v1/services/", json={
        "name": "checkout-api",
        "tier": "critical",
        "description": "Order checkout processing",
    })
    assert res.status_code == 201
    svc_data = res.json()
    assert svc_data["name"] == "checkout-api"
    assert svc_data["slug"] == "checkout-api"
    svc_id = svc_data["id"]

    # 2. List services
    list_res = client.get("/api/v1/services/")
    assert list_res.status_code == 200
    services = list_res.json()
    assert any(s["id"] == svc_id for s in services)

    # 3. Create a metric definition for service
    metric_res = client.post("/api/v1/metrics/", json={
        "service_id": svc_id,
        "name": "memory_utilization",
        "unit": "percent",
        "warning_threshold": 80.0,
        "critical_threshold": 90.0,
    })
    assert metric_res.status_code == 201
    metric_id = metric_res.json()["id"]

    # 4. Ingest an observation
    ingest_res = client.post("/api/v1/telemetry/ingest", json={
        "observations": [
            {
                "metric_id": metric_id,
                "timestamp": "2026-10-12T15:00:00Z",
                "value": 78.4,
                "source": "api",
            }
        ]
    })
    assert ingest_res.status_code == 201

    # 5. Query observations
    obs_res = client.get(f"/api/v1/metrics/{metric_id}/observations")
    assert obs_res.status_code == 200
    observations = obs_res.json()
    assert len(observations) == 1
    assert observations[0]["value"] == 78.4


def test_synthetic_generate_api(client: TestClient):
    res = client.post("/api/v1/telemetry/synthetic/generate", json={
        "service_name": "notification-service",
        "scenario": "normal",
        "duration_minutes": 30,
        "interval_seconds": 60,
        "seed": 42,
    })
    assert res.status_code == 201
    data = res.json()
    assert data["service_name"] == "notification-service"
    assert data["observations_created"] > 0
    assert "cpu_utilization" in data["metrics_generated"]


def test_csv_upload_api(client: TestClient):
    csv_bytes = b"timestamp,service,metric,value\n2026-10-12T12:00:00Z,search-service,cpu_utilization,34.5\n"
    res = client.post(
        "/api/v1/telemetry/csv/upload",
        files={"file": ("metrics.csv", csv_bytes, "text/csv")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["valid_rows_imported"] == 1
    assert "search-service" in data["services_affected"]
