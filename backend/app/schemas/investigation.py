from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class InvestigationRequest(BaseModel):
    metric_id: int = Field(..., description="Target metric ID to investigate")
    lookback_minutes: int = Field(120, ge=15, le=720, description="Investigation event lookback window in minutes")


class EvidencePoint(BaseModel):
    category: str  # telemetry, forecast, anomaly, event, threshold
    statement: str
    severity: str  # info, warning, critical
    timestamp: Optional[datetime] = None


class InvestigationReport(BaseModel):
    metric_id: int
    metric_name: str
    service_name: str
    risk_state: str
    risk_score: float
    current_value: float
    time_to_breach_display: str
    investigated_at: datetime
    synthesizer_mode: str  # deterministic_grounded or llm_augmented
    executive_summary: str
    timeline_summary: List[str]
    evidence_ledger: List[EvidencePoint]
    investigative_leads: List[str]
    recommended_runbook_actions: List[str]
    cautionary_notice: str = (
        "Notice: Leading hypotheses are derived from temporal correlation and time-series inflection points. "
        "Strict operational protocol: Correlation is an investigative lead, NOT proof of causation. "
        "Always confirm with distributed tracing and application log inspection."
    )


class SimulationRequest(BaseModel):
    metric_id: int = Field(..., description="Target metric ID to simulate mitigation against")
    action_type: str = Field(..., description="Mitigation action: scale_replicas, traffic_shedding, pool_expansion")
    parameter_value: float = Field(..., description="Action parameter: e.g. 2 replicas (+100%), 25% traffic shedding, 50 pool size")
    current_replicas: Optional[int] = Field(2, description="Current replica count if scaling")


class ProjectedMitigationPoint(BaseModel):
    step_minutes: int
    baseline_predicted_value: float
    mitigated_predicted_value: float


class SimulationResponse(BaseModel):
    metric_id: int
    metric_name: str
    service_name: str
    action_type: str
    parameter_value: float
    baseline_risk_state: str
    projected_risk_state: str
    baseline_risk_score: float
    projected_risk_score: float
    baseline_time_to_breach: str
    projected_time_to_breach: str
    impact_delta_percentage: float
    simulated_trajectory: List[ProjectedMitigationPoint]
    assumptions_and_limits: List[str]
    simulated_at: datetime
    is_read_only: bool = True
