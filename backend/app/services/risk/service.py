from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.metric import MetricDefinition, MetricObservation
from app.models.risk import RiskAssessment
from app.schemas.risk import (
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    SystemRiskOverview,
    RiskOverviewItem,
)
from app.schemas.forecast import ForecastRequest
from app.services.forecasting.engine import ForecastingService
from app.services.risk.calculator import CapacityRiskCalculator


class RiskIntelligenceService:
    """Master service for capacity risk evaluation and infrastructure-wide risk aggregation."""

    @classmethod
    def assess_risk(
        cls,
        db: Session,
        req: RiskAssessmentRequest,
    ) -> RiskAssessmentResponse:
        metric = db.query(MetricDefinition).filter(MetricDefinition.id == req.metric_id).first()
        if not metric:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Metric definition ID {req.metric_id} not found.",
            )

        # Fetch latest observation
        latest_obs = (
            db.query(MetricObservation)
            .filter(MetricObservation.metric_id == req.metric_id)
            .order_by(MetricObservation.timestamp.desc())
            .first()
        )

        obs_count = (
            db.query(MetricObservation)
            .filter(MetricObservation.metric_id == req.metric_id)
            .count()
        )

        current_val = float(latest_obs.value) if latest_obs else 0.0
        is_insufficient_data = obs_count < 15 or latest_obs is None

        forecast_points = []
        forecast_run_id = None

        if not is_insufficient_data:
            try:
                fc_res = ForecastingService.generate_forecast(
                    db,
                    ForecastRequest(
                        metric_id=req.metric_id,
                        horizon_minutes=req.horizon_minutes,
                        model_type=req.model_type,
                        confidence_level=0.95,
                    ),
                )
                forecast_points = fc_res.points
                forecast_run_id = fc_res.run_id
            except Exception:
                # If forecasting fails due to flat or degenerate series, fallback to persistence
                try:
                    fc_res = ForecastingService.generate_forecast(
                        db,
                        ForecastRequest(
                            metric_id=req.metric_id,
                            horizon_minutes=req.horizon_minutes,
                            model_type="persistence",
                            confidence_level=0.95,
                        ),
                    )
                    forecast_points = fc_res.points
                    forecast_run_id = fc_res.run_id
                except Exception:
                    forecast_points = []

        # Run risk evaluation
        eval_result = CapacityRiskCalculator.evaluate(
            current_value=current_val,
            unit=metric.unit,
            warning_threshold=metric.warning_threshold,
            critical_threshold=metric.critical_threshold,
            capacity_limit=metric.capacity_limit,
            forecast_points=forecast_points,
            is_insufficient_data=is_insufficient_data,
        )

        # Persist Assessment
        assessment = RiskAssessment(
            metric_id=metric.id,
            forecast_run_id=forecast_run_id,
            risk_state=eval_result.risk_state,
            risk_score=eval_result.risk_score,
            current_value=current_val,
            warning_threshold=metric.warning_threshold,
            critical_threshold=metric.critical_threshold,
            capacity_limit=metric.capacity_limit,
            predicted_breach_type=eval_result.predicted_breach_type,
            time_to_breach_minutes=eval_result.time_to_breach_minutes,
            time_to_breach_display=eval_result.time_to_breach_display,
            confidence=eval_result.confidence,
            explanation=eval_result.explanation,
            assessed_at=datetime.now(timezone.utc),
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        return RiskAssessmentResponse(
            id=assessment.id,
            metric_id=metric.id,
            metric_name=metric.name,
            service_name=metric.service.name if metric.service else "unknown",
            unit=metric.unit,
            risk_state=assessment.risk_state,
            risk_score=assessment.risk_score,
            current_value=assessment.current_value,
            warning_threshold=assessment.warning_threshold,
            critical_threshold=assessment.critical_threshold,
            capacity_limit=assessment.capacity_limit,
            predicted_breach_type=assessment.predicted_breach_type,
            time_to_breach_minutes=assessment.time_to_breach_minutes,
            time_to_breach_display=assessment.time_to_breach_display,
            confidence=assessment.confidence,
            explanation=assessment.explanation,
            assessed_at=assessment.assessed_at,
            forecast_run_id=assessment.forecast_run_id,
        )

    @classmethod
    def get_latest_risk_assessment(
        cls,
        db: Session,
        metric_id: int,
    ) -> Optional[RiskAssessmentResponse]:
        assessment = (
            db.query(RiskAssessment)
            .filter(RiskAssessment.metric_id == metric_id)
            .order_by(RiskAssessment.assessed_at.desc())
            .first()
        )
        if not assessment:
            return None

        metric = assessment.metric
        return RiskAssessmentResponse(
            id=assessment.id,
            metric_id=metric.id,
            metric_name=metric.name,
            service_name=metric.service.name if metric.service else "unknown",
            unit=metric.unit,
            risk_state=assessment.risk_state,
            risk_score=assessment.risk_score,
            current_value=assessment.current_value,
            warning_threshold=assessment.warning_threshold,
            critical_threshold=assessment.critical_threshold,
            capacity_limit=assessment.capacity_limit,
            predicted_breach_type=assessment.predicted_breach_type,
            time_to_breach_minutes=assessment.time_to_breach_minutes,
            time_to_breach_display=assessment.time_to_breach_display,
            confidence=assessment.confidence,
            explanation=assessment.explanation,
            assessed_at=assessment.assessed_at,
            forecast_run_id=assessment.forecast_run_id,
        )

    @classmethod
    def get_system_risk_overview(cls, db: Session) -> SystemRiskOverview:
        metrics = db.query(MetricDefinition).all()
        critical_c = 0
        elevated_c = 0
        watch_c = 0
        normal_c = 0
        insufficient_c = 0
        overview_items: List[RiskOverviewItem] = []

        for m in metrics:
            latest = (
                db.query(RiskAssessment)
                .filter(RiskAssessment.metric_id == m.id)
                .order_by(RiskAssessment.assessed_at.desc())
                .first()
            )
            state = latest.risk_state if latest else "INSUFFICIENT_DATA"
            score = latest.risk_score if latest else 0.0
            cur_val = latest.current_value if latest else 0.0
            time_display = latest.time_to_breach_display if latest else "Not assessed"

            if state == "CRITICAL":
                critical_c += 1
            elif state == "ELEVATED":
                elevated_c += 1
            elif state == "WATCH":
                watch_c += 1
            elif state == "NORMAL":
                normal_c += 1
            else:
                insufficient_c += 1

            overview_items.append(
                RiskOverviewItem(
                    metric_id=m.id,
                    metric_name=m.name,
                    service_name=m.service.name if m.service else "unknown",
                    unit=m.unit,
                    risk_state=state,
                    risk_score=score,
                    current_value=cur_val,
                    time_to_breach_display=time_display,
                )
            )

        # Sort highest risk items first
        overview_items.sort(key=lambda x: x.risk_score, reverse=True)

        return SystemRiskOverview(
            critical_count=critical_c,
            elevated_count=elevated_c,
            watch_count=watch_c,
            normal_count=normal_c,
            insufficient_data_count=insufficient_c,
            total_metrics_evaluated=len(metrics),
            highest_risk_items=overview_items[:10],
            generated_at=datetime.now(timezone.utc),
        )
