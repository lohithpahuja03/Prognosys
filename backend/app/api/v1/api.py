from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    services,
    metrics,
    telemetry,
    forecast,
    anomaly,
    risk,
    events,
    topology,
    investigator,
    simulation,
    evaluation,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health & Diagnostics"])
api_router.include_router(services.router, prefix="/services", tags=["Services"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry Ingestion"])
api_router.include_router(forecast.router, prefix="/forecast", tags=["Forecasting Engine"])
api_router.include_router(anomaly.router, prefix="/anomalies", tags=["Anomaly Detection"])
api_router.include_router(risk.router, prefix="/risk", tags=["Capacity Risk Intelligence"])
api_router.include_router(events.router, prefix="/events", tags=["Operational Context & Events"])
api_router.include_router(topology.router, prefix="/topology", tags=["Service Dependency Topology"])
api_router.include_router(investigator.router, prefix="/investigator", tags=["AI Investigator"])
api_router.include_router(simulation.router, prefix="/simulation", tags=["What-if Response Simulator"])
api_router.include_router(evaluation.router, prefix="/evaluation", tags=["Model Evaluation Lab"])
