from fastapi.testclient import TestClient


def test_model_evaluation_lab_benchmark_e2e(client: TestClient):
    # 1. Generate 60 minutes of telemetry to ensure plenty of historical points
    gen_res = client.post("/api/v1/telemetry/synthetic/generate", json={
        "service_name": "eval-service",
        "scenario": "cpu_saturation",
        "duration_minutes": 60,
        "interval_seconds": 60,
        "seed": 777,
    })
    assert gen_res.status_code == 201

    # 2. Get metric ID
    services_res = client.get("/api/v1/services/")
    svc = next(s for s in services_res.json() if s["name"] == "eval-service")

    metrics_res = client.get(f"/api/v1/metrics/?service_id={svc['id']}")
    cpu_metric = next(m for m in metrics_res.json() if m["name"] == "cpu_utilization")
    metric_id = cpu_metric["id"]

    # 3. Run Benchmark Evaluation
    eval_res = client.post("/api/v1/evaluation/run", json={
        "metric_id": metric_id,
        "test_split_ratio": 0.25,
    })
    assert eval_res.status_code == 200
    res = eval_res.json()
    assert res["metric_id"] == metric_id
    assert res["total_observations_analyzed"] >= 50
    assert res["training_points_count"] > 0
    assert res["test_points_count"] > 0
    assert len(res["benchmark_scores"]) == 3
    # Check that persistence baseline exists
    pers = next(s for s in res["benchmark_scores"] if s["model_name"] == "persistence")
    assert pers["mae"] >= 0.0
    assert res["winning_model"] in ["persistence", "exponential_smoothing", "linear_trend"]
