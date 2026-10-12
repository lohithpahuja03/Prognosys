from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class SyntheticGeneratorRequest(BaseModel):
    service_name: str = Field("api-service", description="Target service to generate telemetry for")
    scenario: str = Field(
        "memory_leak",
        description="Operational scenario: normal, memory_leak, cpu_saturation, traffic_spike, db_pressure",
    )
    duration_minutes: int = Field(120, ge=15, le=1440, description="Duration of simulated telemetry in minutes")
    interval_seconds: int = Field(60, ge=10, le=300, description="Sampling interval in seconds")
    seed: Optional[int] = Field(42, description="Random seed for deterministic, reproducible simulation")
    noise_level: float = Field(0.02, ge=0.0, le=0.5, description="Relative gaussian noise standard deviation")


class SyntheticGeneratorResponse(BaseModel):
    service_name: str
    scenario: str
    observations_created: int
    duration_minutes: int
    metrics_generated: List[str]
    start_time: datetime
    end_time: datetime
    seed_used: Optional[int]


class CSVValidationErrorDetail(BaseModel):
    row_number: int
    column: Optional[str] = None
    value: Optional[str] = None
    message: str


class CSVImportSummary(BaseModel):
    total_rows_read: int
    valid_rows_imported: int
    error_count: int
    services_affected: List[str]
    metrics_affected: List[str]
    errors: List[CSVValidationErrorDetail] = []
    status: str  # success, partial_success, failed
