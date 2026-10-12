from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class EvaluationRequest(BaseModel):
    metric_id: int = Field(..., description="Target metric ID to benchmark")
    test_split_ratio: float = Field(0.25, ge=0.10, le=0.40, description="Chronological holdout test ratio")


class ModelMetricScore(BaseModel):
    model_name: str
    mae: float
    rmse: float
    forecast_bias: float
    mape: Optional[float] = None
    outperformed_baseline: bool
    improvement_vs_baseline_pct: float


class EvaluationBenchmarkResponse(BaseModel):
    metric_id: int
    metric_name: str
    service_name: str
    unit: str
    total_observations_analyzed: int
    training_points_count: int
    test_points_count: int
    split_strategy: str = "Strict Chronological Holdout (Zero Temporal Leakage)"
    benchmark_scores: List[ModelMetricScore]
    winning_model: str
    evaluation_summary: str
    evaluated_at: datetime
