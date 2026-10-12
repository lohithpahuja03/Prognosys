from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.investigation import (
    SimulationRequest,
    SimulationResponse,
)
from app.services.simulation.simulator import WhatIfSimulatorService

router = APIRouter()


@router.post(
    "/simulate",
    response_model=SimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate hypothetical mitigation action on capacity risk",
    description="Calculates read-only projections of metric trajectories under replica scaling, traffic shedding, or pool expansion.",
)
def run_simulation(
    request: SimulationRequest,
    db: Session = Depends(get_db),
) -> SimulationResponse:
    return WhatIfSimulatorService.simulate(db, request)


@router.get(
    "/scenarios",
    response_model=List[Dict[str, Any]],
    summary="List supported What-if simulation mitigations",
)
def list_simulation_scenarios() -> List[Dict[str, Any]]:
    return [
        {
            "action_type": "scale_replicas",
            "name": "Horizontal Replica Scaling",
            "description": "Add stateless worker/container replicas to distribute CPU, memory, and throughput load.",
            "default_parameter": 2.0,
            "unit": "replicas",
        },
        {
            "action_type": "traffic_shedding",
            "name": "Ingress Traffic Shedding",
            "description": "Apply rate-limiting or selective request dropping at the API gateway during peak surges.",
            "default_parameter": 25.0,
            "unit": "percent",
        },
        {
            "action_type": "pool_expansion",
            "name": "Database Connection Pool Expansion",
            "description": "Increase maximum concurrent database connection pool limits to relieve thread queue contention.",
            "default_parameter": 20.0,
            "unit": "connections",
        },
    ]
