from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.service import Service
from app.models.metric import MetricDefinition, MetricObservation
from app.models.context import OperationalEvent, ServiceDependency
from app.models.risk import RiskAssessment
from app.schemas.context import (
    OperationalEventCreate,
    OperationalEventResponse,
    ServiceDependencyCreate,
    ServiceDependencyResponse,
    ServiceTopologyResponse,
    TopologyNode,
    TopologyEdge,
    EventCorrelationResponse,
    CorrelatedEventItem,
)


class OperationalContextService:
    """Service handling operational events, service dependency topology, and temporal correlation."""

    @classmethod
    def log_event(cls, db: Session, req: OperationalEventCreate) -> OperationalEventResponse:
        occurred = req.occurred_at or datetime.now(timezone.utc)
        if req.service_id is not None:
            svc = db.query(Service).filter(Service.id == req.service_id).first()
            if not svc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Service ID {req.service_id} not found",
                )

        event = OperationalEvent(
            service_id=req.service_id,
            event_type=req.event_type,
            title=req.title,
            description=req.description,
            severity=req.severity,
            metadata_json=req.metadata_json,
            occurred_at=occurred,
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        return OperationalEventResponse(
            id=event.id,
            service_id=event.service_id,
            service_name=event.service.name if event.service else None,
            event_type=event.event_type,
            title=event.title,
            description=event.description,
            severity=event.severity,
            metadata_json=event.metadata_json,
            occurred_at=event.occurred_at,
            created_at=event.created_at,
        )

    @classmethod
    def list_events(
        cls,
        db: Session,
        service_id: Optional[int] = None,
        event_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[OperationalEventResponse]:
        query = db.query(OperationalEvent)
        if service_id is not None:
            query = query.filter(OperationalEvent.service_id == service_id)
        if event_type is not None:
            query = query.filter(OperationalEvent.event_type == event_type)

        events = query.order_by(OperationalEvent.occurred_at.desc()).limit(limit).all()
        return [
            OperationalEventResponse(
                id=e.id,
                service_id=e.service_id,
                service_name=e.service.name if e.service else None,
                event_type=e.event_type,
                title=e.title,
                description=e.description,
                severity=e.severity,
                metadata_json=e.metadata_json,
                occurred_at=e.occurred_at,
                created_at=e.created_at,
            )
            for e in events
        ]

    @classmethod
    def add_dependency(cls, db: Session, req: ServiceDependencyCreate) -> ServiceDependencyResponse:
        src = db.query(Service).filter(Service.id == req.source_service_id).first()
        tgt = db.query(Service).filter(Service.id == req.target_service_id).first()
        if not src:
            raise HTTPException(status_code=404, detail=f"Source service ID {req.source_service_id} not found")
        if not tgt:
            raise HTTPException(status_code=404, detail=f"Target service ID {req.target_service_id} not found")
        if req.source_service_id == req.target_service_id:
            raise HTTPException(status_code=400, detail="A service cannot depend on itself")

        existing = (
            db.query(ServiceDependency)
            .filter(
                ServiceDependency.source_service_id == req.source_service_id,
                ServiceDependency.target_service_id == req.target_service_id,
            )
            .first()
        )
        if existing:
            return ServiceDependencyResponse(
                id=existing.id,
                source_service_id=src.id,
                source_service_name=src.name,
                target_service_id=tgt.id,
                target_service_name=tgt.name,
                dependency_type=existing.dependency_type,
                created_at=existing.created_at,
            )

        dep = ServiceDependency(
            source_service_id=req.source_service_id,
            target_service_id=req.target_service_id,
            dependency_type=req.dependency_type,
        )
        db.add(dep)
        db.commit()
        db.refresh(dep)

        return ServiceDependencyResponse(
            id=dep.id,
            source_service_id=src.id,
            source_service_name=src.name,
            target_service_id=tgt.id,
            target_service_name=tgt.name,
            dependency_type=dep.dependency_type,
            created_at=dep.created_at,
        )

    @classmethod
    def get_topology(cls, db: Session) -> ServiceTopologyResponse:
        services = db.query(Service).all()
        deps = db.query(ServiceDependency).all()

        nodes: List[TopologyNode] = []
        for s in services:
            # Find latest risk state for this service across metrics
            risk_state = "NORMAL"
            for m in s.metrics:
                latest_risk = (
                    db.query(RiskAssessment)
                    .filter(RiskAssessment.metric_id == m.id)
                    .order_by(RiskAssessment.assessed_at.desc())
                    .first()
                )
                if latest_risk:
                    if latest_risk.risk_state == "CRITICAL":
                        risk_state = "CRITICAL"
                        break
                    elif latest_risk.risk_state == "ELEVATED" and risk_state != "CRITICAL":
                        risk_state = "ELEVATED"
                    elif latest_risk.risk_state == "WATCH" and risk_state not in ["CRITICAL", "ELEVATED"]:
                        risk_state = "WATCH"

            nodes.append(
                TopologyNode(
                    id=s.id,
                    name=s.name,
                    slug=s.slug,
                    tier=s.tier,
                    risk_state=risk_state,
                )
            )

        edges = [
            TopologyEdge(
                id=d.id,
                source=d.source_service_id,
                target=d.target_service_id,
                dependency_type=d.dependency_type,
            )
            for d in deps
        ]

        return ServiceTopologyResponse(nodes=nodes, edges=edges)

    @classmethod
    def correlate_events_for_metric(
        cls,
        db: Session,
        metric_id: int,
        lookback_minutes: int = 120,
    ) -> EventCorrelationResponse:
        metric = db.query(MetricDefinition).filter(MetricDefinition.id == metric_id).first()
        if not metric:
            raise HTTPException(status_code=404, detail=f"Metric definition ID {metric_id} not found")

        def _to_aware(dt: datetime) -> datetime:
            return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt

        # Determine reference inflection time (latest observation timestamp or now)
        latest_obs = (
            db.query(MetricObservation)
            .filter(MetricObservation.metric_id == metric_id)
            .order_by(MetricObservation.timestamp.desc())
            .first()
        )
        raw_ref_time = latest_obs.timestamp if latest_obs else datetime.now(timezone.utc)
        ref_time = _to_aware(raw_ref_time)
        start_window = ref_time - timedelta(minutes=lookback_minutes)
        end_window = ref_time + timedelta(minutes=15)

        # Look for events related to this service OR global events (service_id is null)
        events = (
            db.query(OperationalEvent)
            .filter(
                (OperationalEvent.service_id == metric.service_id) | (OperationalEvent.service_id.is_(None)),
                OperationalEvent.occurred_at >= start_window.replace(tzinfo=None),
                OperationalEvent.occurred_at <= end_window.replace(tzinfo=None),
            )
            .order_by(OperationalEvent.occurred_at.desc())
            .all()
        )

        correlated_items: List[CorrelatedEventItem] = []
        for ev in events:
            # Proximity delta in minutes
            ev_occurred = _to_aware(ev.occurred_at)
            delta_sec = (ref_time - ev_occurred).total_seconds()
            mins_before = max(0.0, delta_sec / 60.0)

            # Temporal lead score (0-100): closer prior events receive higher score
            lead_score = round(max(10.0, 100.0 - (mins_before / lookback_minutes) * 80.0), 1)

            note = (
                f"Occurred {mins_before:.1f}m prior to metric reference time. "
                "Classified as a high-priority temporal lead."
            )

            correlated_items.append(
                CorrelatedEventItem(
                    event_id=ev.id,
                    event_type=ev.event_type,
                    title=ev.title,
                    occurred_at=ev_occurred,
                    minutes_before_inflection=round(mins_before, 1),
                    relevance_lead_score=lead_score,
                    relevance_note=note,
                )
            )

        return EventCorrelationResponse(
            metric_id=metric.id,
            metric_name=metric.name,
            service_name=metric.service.name if metric.service else "unknown",
            reference_timestamp=ref_time,
            lookback_minutes=lookback_minutes,
            total_events_in_window=len(correlated_items),
            correlated_events=correlated_items,
        )
