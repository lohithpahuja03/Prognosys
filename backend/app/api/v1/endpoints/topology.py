from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.context import (
    ServiceDependencyCreate,
    ServiceDependencyResponse,
    ServiceTopologyResponse,
)
from app.services.context.service import OperationalContextService

router = APIRouter()


@router.post(
    "/dependencies",
    response_model=ServiceDependencyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a directed service dependency",
)
def add_service_dependency(
    dep_in: ServiceDependencyCreate,
    db: Session = Depends(get_db),
) -> ServiceDependencyResponse:
    return OperationalContextService.add_dependency(db, dep_in)


@router.get(
    "/",
    response_model=ServiceTopologyResponse,
    summary="Get service topology graph with real-time risk states",
)
def get_service_topology(
    db: Session = Depends(get_db),
) -> ServiceTopologyResponse:
    return OperationalContextService.get_topology(db)
