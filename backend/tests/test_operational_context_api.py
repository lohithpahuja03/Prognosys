from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient


def test_operational_events_and_correlation_lifecycle(client: TestClient):
    # 1. Create a service and metric
    svc_res = client.post("/api/v1/services/", json={
        "name": "payment-gateway",
        "tier": "critical",
    })
    assert svc_res.status_code == 201
    svc_id = svc_res.json()["id"]

    m_res = client.post("/api/v1/metrics/", json={
        "service_id": svc_id,
        "name": "latency_p99",
        "unit": "ms",
        "warning_threshold": 250.0,
        "critical_threshold": 500.0,
    })
    assert m_res.status_code == 201
    metric_id = m_res.json()["id"]

    now = datetime.now(timezone.utc)

    # 2. Ingest metric observations
    client.post("/api/v1/telemetry/ingest", json=[
        {"metric_id": metric_id, "timestamp": (now - timedelta(minutes=10)).isoformat(), "value": 180.0},
        {"metric_id": metric_id, "timestamp": (now - timedelta(minutes=5)).isoformat(), "value": 290.0},
        {"metric_id": metric_id, "timestamp": now.isoformat(), "value": 340.0},
    ])

    # 3. Log operational events (one deployment 8 minutes ago, one config update 45 minutes ago)
    ev1 = client.post("/api/v1/events/", json={
        "service_id": svc_id,
        "event_type": "deployment",
        "title": "Release v2.14.0 canary rollout",
        "severity": "info",
        "occurred_at": (now - timedelta(minutes=8)).isoformat(),
    })
    assert ev1.status_code == 201

    ev2 = client.post("/api/v1/events/", json={
        "service_id": svc_id,
        "event_type": "config_change",
        "title": "Updated connection pool timeout to 500ms",
        "severity": "warning",
        "occurred_at": (now - timedelta(minutes=45)).isoformat(),
    })
    assert ev2.status_code == 201

    # 4. List events
    events_res = client.get(f"/api/v1/events/?service_id={svc_id}")
    assert events_res.status_code == 200
    assert len(events_res.json()) >= 2

    # 5. Correlate events for metric
    corr_res = client.get(f"/api/v1/events/correlate/{metric_id}?lookback_minutes=60")
    assert corr_res.status_code == 200
    corr = corr_res.json()
    assert corr["metric_id"] == metric_id
    assert corr["total_events_in_window"] >= 2
    # The more recent event (8 mins ago) should have higher relevance lead score
    first_ev = corr["correlated_events"][0]
    assert "investigative lead" in corr["methodology_disclaimer"].lower()
    assert first_ev["relevance_lead_score"] > 80.0


def test_service_topology_lifecycle(client: TestClient):
    # Create two services
    web_res = client.post("/api/v1/services/", json={"name": "web-frontend", "tier": "standard"})
    api_res = client.post("/api/v1/services/", json={"name": "core-api", "tier": "critical"})
    web_id = web_res.json()["id"]
    api_id = api_res.json()["id"]

    # Add dependency web -> api
    dep_res = client.post("/api/v1/topology/dependencies", json={
        "source_service_id": web_id,
        "target_service_id": api_id,
        "dependency_type": "calls",
    })
    assert dep_res.status_code == 201
    assert dep_res.json()["source_service_name"] == "web-frontend"
    assert dep_res.json()["target_service_name"] == "core-api"

    # Get topology graph
    topo_res = client.get("/api/v1/topology/")
    assert topo_res.status_code == 200
    topo = topo_res.json()
    assert len(topo["nodes"]) >= 2
    edge_pairs = [(e["source"], e["target"]) for e in topo["edges"]]
    assert (web_id, api_id) in edge_pairs
