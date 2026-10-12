from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Verify root endpoint returns project identity and docs pointer."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "PrognosysAI"
    assert data["status"] == "online"
    assert "version" in data
    assert data["docs"] == "/docs"


def test_health_endpoint(client: TestClient):
    """Verify health endpoint returns valid status, database probe, and components."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "PrognosysAI"
    assert data["status"] in ["healthy", "degraded"]
    assert "timestamp" in data
    assert "database" in data
    assert data["database"]["connected"] is True
    assert "components" in data
    assert data["components"]["api"] == "operational"
    assert data["components"]["telemetry_engine"] == "initialized"
