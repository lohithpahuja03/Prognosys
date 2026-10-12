from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.metric import MetricDefinition, MetricObservation
from app.schemas.investigation import (
    SimulationRequest,
    SimulationResponse,
    ProjectedMitigationPoint,
)
from app.schemas.forecast import ForecastRequest
from app.services.forecasting.engine import ForecastingService
from app.services.risk.calculator import CapacityRiskCalculator


class WhatIfSimulatorService:
    """Read-only decision-support simulator evaluating hypothetical mitigations on metric trajectories."""

    @classmethod
    def simulate(cls, db: Session, req: SimulationRequest) -> SimulationResponse:
        metric = db.query(MetricDefinition).filter(MetricDefinition.id == req.metric_id).first()
        if not metric:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Metric definition ID {req.metric_id} not found",
            )

        # 1. Fetch baseline forecast
        try:
            baseline_fc = ForecastingService.generate_forecast(
                db,
                ForecastRequest(
                    metric_id=req.metric_id,
                    horizon_minutes=60,
                    model_type="exponential_smoothing",
                ),
            )
            forecast_points = baseline_fc.points
        except Exception:
            try:
                baseline_fc = ForecastingService.generate_forecast(
                    db,
                    ForecastRequest(
                        metric_id=req.metric_id,
                        horizon_minutes=60,
                        model_type="persistence",
                    ),
                )
                forecast_points = baseline_fc.points
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unable to simulate without historical data: {str(e)}",
                )

        latest_obs = (
            db.query(MetricObservation)
            .filter(MetricObservation.metric_id == req.metric_id)
            .order_by(MetricObservation.timestamp.desc())
            .first()
        )
        current_val = float(latest_obs.value) if latest_obs else 0.0

        # Baseline risk evaluation
        baseline_risk = CapacityRiskCalculator.evaluate(
            current_value=current_val,
            unit=metric.unit,
            warning_threshold=metric.warning_threshold,
            critical_threshold=metric.critical_threshold,
            capacity_limit=metric.capacity_limit,
            forecast_points=forecast_points,
        )

        # 2. Compute mitigation multiplier and assumptions
        assumptions: List[str] = [
            "Simulation is strictly READ-ONLY. Live clusters or cloud resources are not modified.",
            "Workload distribution is assumed to be evenly partitioned across provisioned resources.",
        ]

        if req.action_type == "scale_replicas":
            curr = req.current_replicas or 2
            added = req.parameter_value
            total = curr + added
            multiplier = curr / total
            assumptions.append(
                f"Horizontally scaling instances from {curr} to {int(total)} (+{int(added)} replicas). "
                f"Estimated per-instance workload reduction: {((1.0 - multiplier) * 100):.1f}%."
            )
        elif req.action_type == "traffic_shedding":
            pct = min(90.0, max(5.0, req.parameter_value))
            multiplier = 1.0 - (pct / 100.0)
            assumptions.append(
                f"Shedding {pct:.1f}% of ingress HTTP/API traffic at gateway via rate limiting. "
                f"Projected load reduction: {pct:.1f}%."
            )
        elif req.action_type == "pool_expansion":
            multiplier = 0.65
            assumptions.append(
                f"Increasing database connection pool limit by {req.parameter_value:.0f} connections. "
                "Eliminates queue wait contention under high concurrency."
            )
        else:
            multiplier = 0.85
            assumptions.append(f"Generic mitigation applied: {req.action_type} with parameter {req.parameter_value}.")

        # 3. Project mitigated trajectory
        projected_trajectory: List[ProjectedMitigationPoint] = []
        mitigated_forecast_points = []

        for i, pt in enumerate(forecast_points):
            mitigated_val = round(max(0.0, pt.predicted_value * multiplier), 2)
            projected_trajectory.append(
                ProjectedMitigationPoint(
                    step_minutes=i + 1,
                    baseline_predicted_value=pt.predicted_value,
                    mitigated_predicted_value=mitigated_val,
                )
            )
            # Create dummy point for mitigated risk calculation
            pt_copy = type("DummyPt", (), {
                "target_timestamp": pt.target_timestamp,
                "predicted_value": mitigated_val,
                "lower_bound": max(0.0, pt.lower_bound * multiplier),
                "upper_bound": max(0.0, pt.upper_bound * multiplier),
            })()
            mitigated_forecast_points.append(pt_copy)

        # Recalculate risk on mitigated trajectory
        mitigated_risk = CapacityRiskCalculator.evaluate(
            current_value=current_val * multiplier,
            unit=metric.unit,
            warning_threshold=metric.warning_threshold,
            critical_threshold=metric.critical_threshold,
            capacity_limit=metric.capacity_limit,
            forecast_points=mitigated_forecast_points,
        )

        impact_delta = round((1.0 - multiplier) * 100.0, 1)

        return SimulationResponse(
            metric_id=metric.id,
            metric_name=metric.name,
            service_name=metric.service.name if metric.service else "unknown",
            action_type=req.action_type,
            parameter_value=req.parameter_value,
            baseline_risk_state=baseline_risk.risk_state,
            projected_risk_state=mitigated_risk.risk_state,
            baseline_risk_score=baseline_risk.risk_score,
            projected_risk_score=mitigated_risk.risk_score,
            baseline_time_to_breach=baseline_risk.time_to_breach_display,
            projected_time_to_breach=mitigated_risk.time_to_breach_display,
            impact_delta_percentage=impact_delta,
            simulated_trajectory=projected_trajectory,
            assumptions_and_limits=assumptions,
            simulated_at=datetime.now(timezone.utc),
            is_read_only=True,
        )
