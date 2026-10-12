from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.metric import MetricDefinition, MetricObservation
from app.schemas.metric import (
    MetricDefinitionCreate,
    MetricDefinitionResponse,
    MetricObservationResponse,
)
from app.services import service_inventory

router = APIRouter()


@router.get(
    "/",
    response_model=List[MetricDefinitionResponse],
    summary="List Metric Definitions",
    description="Retrieve all configured metric definitions.",
)
def list_metrics(
    service_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(MetricDefinition)
    if service_id is not None:
        query = query.filter(MetricDefinition.service_id == service_id)
    return query.offset(skip).limit(limit).all()


@router.post(
    "/",
    response_model=MetricDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Metric Definition",
    description="Define a new metric for a service with warning and critical capacity thresholds.",
)
def create_metric_definition(
    metric_in: MetricDefinitionCreate,
    db: Session = Depends(get_db),
):
    service = service_inventory.get_service_by_id(db, metric_in.service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service ID {metric_in.service_id} does not exist.",
        )

    return service_inventory.get_or_create_metric(
        db,
        service_id=metric_in.service_id,
        name=metric_in.name,
        unit=metric_in.unit,
        metric_type=metric_in.metric_type,
        warning_threshold=metric_in.warning_threshold,
        critical_threshold=metric_in.critical_threshold,
        capacity_limit=metric_in.capacity_limit,
    )


@router.get(
    "/{metric_id}/observations",
    response_model=List[MetricObservationResponse],
    summary="Query Time-Series Observations",
    description="Query chronological observations for a specific metric definition.",
)
def get_metric_observations(
    metric_id: int,
    start_time: Optional[datetime] = Query(None, description="Filter observations on or after this timestamp"),
    end_time: Optional[datetime] = Query(None, description="Filter observations on or before this timestamp"),
    limit: int = Query(500, ge=1, le=5000, description="Maximum number of observations to return"),
    order_asc: bool = Query(True, description="Order chronologically ascending if true"),
    db: Session = Depends(get_db),
):
    metric = db.query(MetricDefinition).filter(MetricDefinition.id == metric_id).first()
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric definition ID {metric_id} not found.",
        )

    query = db.query(MetricObservation).filter(MetricObservation.metric_id == metric_id)
    if start_time:
        query = query.filter(MetricObservation.timestamp >= start_time)
    if end_time:
        query = query.filter(MetricObservation.timestamp <= end_time)

    if order_asc:
        query = query.order_by(MetricObservation.timestamp.asc())
    else:
        query = query.order_by(MetricObservation.timestamp.desc())

    return query.limit(limit).all()
