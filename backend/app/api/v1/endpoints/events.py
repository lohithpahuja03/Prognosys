from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.context import (
    OperationalEventCreate,
    OperationalEventResponse,
    EventCorrelationResponse,
)
from app.services.context.service import OperationalContextService

router = APIRouter()


@router.post(
    "/",
    response_model=OperationalEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log an operational event",
    description="Records a software deployment, configuration update, restart, or incident event.",
)
def create_operational_event(
    event_in: OperationalEventCreate,
    db: Session = Depends(get_db),
) -> OperationalEventResponse:
    return OperationalContextService.log_event(db, event_in)


@router.get(
    "/",
    response_model=List[OperationalEventResponse],
    summary="List operational events",
)
def list_operational_events(
    service_id: Optional[int] = Query(None, description="Filter by service ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> List[OperationalEventResponse]:
    return OperationalContextService.list_events(
        db, service_id=service_id, event_type=event_type, limit=limit
    )


@router.get(
    "/correlate/{metric_id}",
    response_model=EventCorrelationResponse,
    summary="Temporally correlate events with metric inflection point",
    description="Aligns recent operational events with metric anomalies and capacity risk. Adheres to correlation-not-causation standard.",
)
def correlate_events_with_metric(
    metric_id: int,
    lookback_minutes: int = Query(120, ge=15, le=720),
    db: Session = Depends(get_db),
) -> EventCorrelationResponse:
    return OperationalContextService.correlate_events_for_metric(
        db, metric_id=metric_id, lookback_minutes=lookback_minutes
    )
