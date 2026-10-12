from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Service(BaseModel):
    """Monitored infrastructure service (e.g., API Gateway, Worker, DB Cluster)."""
    __tablename__ = "services"

    name = Column(String(128), nullable=False, unique=True, index=True)
    slug = Column(String(128), nullable=False, unique=True, index=True)
    tier = Column(String(32), default="standard", nullable=False)  # critical, standard, batch
    description = Column(Text, nullable=True)

    metrics = relationship(
        "MetricDefinition",
        back_populates="service",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
