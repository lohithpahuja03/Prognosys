from fastapi import APIRouter
from app.api.v1.endpoints import health, services, metrics, telemetry

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health & Diagnostics"])
api_router.include_router(services.router, prefix="/services", tags=["Services"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry Ingestion"])
