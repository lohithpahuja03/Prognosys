import re
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.service import Service
from app.models.metric import MetricDefinition
from app.schemas.service import ServiceCreate, ServiceUpdate
from app.schemas.metric import MetricDefinitionCreate


def slugify(text: str) -> str:
    """Generate a clean URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text)


def get_services(db: Session, skip: int = 0, limit: int = 100) -> List[Service]:
    return db.query(Service).offset(skip).limit(limit).all()


def get_service_by_id(db: Session, service_id: int) -> Optional[Service]:
    return db.query(Service).filter(Service.id == service_id).first()


def get_service_by_name(db: Session, name: str) -> Optional[Service]:
    return db.query(Service).filter(Service.name == name).first()


def create_service(db: Session, service_in: ServiceCreate) -> Service:
    slug = service_in.slug or slugify(service_in.name)
    service = Service(
        name=service_in.name,
        slug=slug,
        tier=service_in.tier,
        description=service_in.description,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


def get_or_create_service(
    db: Session,
    name: str,
    tier: str = "standard",
    description: Optional[str] = None,
) -> Service:
    existing = get_service_by_name(db, name)
    if existing:
        return existing
    return create_service(
        db,
        ServiceCreate(name=name, tier=tier, description=description),
    )


def get_metrics_for_service(db: Session, service_id: int) -> List[MetricDefinition]:
    return db.query(MetricDefinition).filter(MetricDefinition.service_id == service_id).all()


def get_or_create_metric(
    db: Session,
    service_id: int,
    name: str,
    unit: str = "percent",
    metric_type: str = "gauge",
    warning_threshold: Optional[float] = None,
    critical_threshold: Optional[float] = None,
    capacity_limit: Optional[float] = None,
) -> MetricDefinition:
    existing = (
        db.query(MetricDefinition)
        .filter(MetricDefinition.service_id == service_id, MetricDefinition.name == name)
        .first()
    )
    if existing:
        return existing

    metric = MetricDefinition(
        service_id=service_id,
        name=name,
        unit=unit,
        metric_type=metric_type,
        warning_threshold=warning_threshold,
        critical_threshold=critical_threshold,
        capacity_limit=capacity_limit,
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric
