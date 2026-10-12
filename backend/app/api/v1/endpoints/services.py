from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceResponse, ServiceWithMetrics
from app.services import service_inventory

router = APIRouter()


@router.get(
    "/",
    response_model=List[ServiceResponse],
    summary="List Monitored Services",
    description="Retrieve all registered infrastructure services in the inventory.",
)
def list_services(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return service_inventory.get_services(db, skip=skip, limit=limit)


@router.post(
    "/",
    response_model=ServiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Infrastructure Service",
    description="Register a new infrastructure service to monitor.",
)
def create_service(
    service_in: ServiceCreate,
    db: Session = Depends(get_db),
):
    existing = service_inventory.get_service_by_name(db, service_in.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service '{service_in.name}' already exists in inventory.",
        )
    return service_inventory.create_service(db, service_in)


@router.get(
    "/{service_id}",
    response_model=ServiceWithMetrics,
    summary="Get Service Details with Metrics",
    description="Retrieve service configuration and configured metric definitions.",
)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
):
    service = service_inventory.get_service_by_id(db, service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service ID {service_id} not found.",
        )
    return service
