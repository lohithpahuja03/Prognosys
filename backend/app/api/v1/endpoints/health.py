from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, check_db_health
from app.schemas.health import HealthResponse, DatabaseHealthStatus

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System Health & Diagnostic Status",
    description="Returns backend runtime status, database health probe, and active subsystems.",
)
def get_health(db: Session = Depends(get_db)) -> HealthResponse:
    db_health = check_db_health()
    overall_status = "healthy" if db_health.get("connected") else "degraded"

    return HealthResponse(
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        status=overall_status,
        timestamp=datetime.now(timezone.utc),
        database=DatabaseHealthStatus(
            status=db_health["status"],
            database_type=db_health.get("database_type", "unknown"),
            connected=db_health.get("connected", False),
            error=db_health.get("error"),
        ),
        components={
            "api": "operational",
            "telemetry_engine": "initialized",
            "forecasting_engine": "ready",
            "risk_engine": "ready",
            "correlation_engine": "ready",
            "what_if_simulator": "ready",
        },
    )
