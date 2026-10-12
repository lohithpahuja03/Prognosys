import os
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.metric import MetricDefinition, MetricObservation
from app.models.risk import RiskAssessment
from app.models.anomaly import AnomalyDetection
from app.schemas.investigation import (
    InvestigationRequest,
    InvestigationReport,
    EvidencePoint,
)
from app.services.risk.service import RiskIntelligenceService
from app.services.forecasting.engine import ForecastingService
from app.schemas.forecast import ForecastRequest
from app.services.context.service import OperationalContextService


class AIInvestigatorService:
    """Evidence-grounded AI Investigator synthesizing metrics, forecasts, anomalies, and operational events."""

    @classmethod
    def investigate(cls, db: Session, req: InvestigationRequest) -> InvestigationReport:
        metric = db.query(MetricDefinition).filter(MetricDefinition.id == req.metric_id).first()
        if not metric:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Metric definition ID {req.metric_id} not found",
            )

        # 1. Fetch latest risk assessment (or compute fresh)
        risk = RiskIntelligenceService.get_latest_risk_assessment(db, req.metric_id)
        if not risk:
            try:
                risk = RiskIntelligenceService.assess_risk(
                    db,
                    req=type("Req", (), {"metric_id": req.metric_id, "horizon_minutes": 60, "model_type": "exponential_smoothing"})(),
                )
            except Exception:
                risk = None

        # 2. Fetch recent anomalies
        anomalies = (
            db.query(AnomalyDetection)
            .filter(
                AnomalyDetection.metric_id == req.metric_id,
                AnomalyDetection.is_anomaly == True,
            )
            .order_by(AnomalyDetection.timestamp.desc())
            .limit(5)
            .all()
        )

        # 3. Correlate operational events
        correlation = OperationalContextService.correlate_events_for_metric(
            db, metric_id=req.metric_id, lookback_minutes=req.lookback_minutes
        )

        # 4. Gather latest observation
        latest_obs = (
            db.query(MetricObservation)
            .filter(MetricObservation.metric_id == req.metric_id)
            .order_by(MetricObservation.timestamp.desc())
            .first()
        )

        current_val = float(latest_obs.value) if latest_obs else 0.0
        risk_state = risk.risk_state if risk else "INSUFFICIENT_DATA"
        risk_score = risk.risk_score if risk else 0.0
        time_to_breach = risk.time_to_breach_display if risk else "Indeterminate"

        # 5. Assemble Evidence Ledger
        evidence: List[EvidencePoint] = []
        evidence.append(
            EvidencePoint(
                category="telemetry",
                statement=f"Current observed value is {current_val:.1f} {metric.unit}.",
                severity="info" if current_val < (metric.warning_threshold or 80) else "warning",
                timestamp=latest_obs.timestamp if latest_obs else datetime.now(timezone.utc),
            )
        )

        if metric.warning_threshold or metric.critical_threshold:
            evidence.append(
                EvidencePoint(
                    category="threshold",
                    statement=(
                        f"Configured operational thresholds: Warning at {metric.warning_threshold or 80:.1f} {metric.unit}, "
                        f"Critical at {metric.critical_threshold or 90:.1f} {metric.unit}."
                    ),
                    severity="info",
                )
            )

        if risk:
            evidence.append(
                EvidencePoint(
                    category="forecast",
                    statement=f"Capacity risk evaluated at {risk.risk_state} (Score: {risk.risk_score}/100). {risk.explanation}",
                    severity="critical" if risk.risk_state == "CRITICAL" else "warning" if risk.risk_state in ["ELEVATED", "WATCH"] else "info",
                    timestamp=risk.assessed_at,
                )
            )

        for anom in anomalies:
            evidence.append(
                EvidencePoint(
                    category="anomaly",
                    statement=f"Anomaly detected (Score: {anom.anomaly_score:.2f}, Severity: {anom.severity}). Actual: {anom.actual_value:.1f} {metric.unit}.",
                    severity=anom.severity,
                    timestamp=anom.timestamp,
                )
            )

        for ev in correlation.correlated_events:
            evidence.append(
                EvidencePoint(
                    category="event",
                    statement=f"Correlated operational event '{ev.title}' ({ev.event_type}) occurred {ev.minutes_before_inflection:.1f}m prior. Temporal lead score: {ev.relevance_lead_score}.",
                    severity="warning" if ev.relevance_lead_score > 75 else "info",
                    timestamp=ev.occurred_at,
                )
            )

        # 6. Timeline Summary
        timeline: List[str] = []
        if latest_obs:
            timeline.append(f"T-0m: Current reading {current_val:.1f} {metric.unit} recorded.")
        for anom in anomalies[:3]:
            timeline.append(f"Anomaly: {anom.actual_value:.1f} {metric.unit} triggered with severity {anom.severity}.")
        for ev in correlation.correlated_events[:3]:
            timeline.append(f"Event T-{ev.minutes_before_inflection:.0f}m: {ev.title} ({ev.event_type}) registered.")

        # 7. Investigative Leads & Runbooks
        leads: List[str] = []
        runbooks: List[str] = []

        if correlation.correlated_events:
            lead_event = correlation.correlated_events[0]
            leads.append(
                f"Inspect changes deployed in '{lead_event.title}' which occurred {lead_event.minutes_before_inflection:.1f}m before metric acceleration."
            )
            runbooks.append(f"Review git commit diff and configuration parameters associated with '{lead_event.title}'.")

        if risk_state in ["CRITICAL", "ELEVATED"]:
            leads.append(
                f"Assess whether resource trajectory ({time_to_breach}) is driven by traffic volume surge or internal leak/contention."
            )
            runbooks.append(f"Initiate service health check on '{metric.service.name if metric.service else 'target'}' and verify thread/connection pool saturation.")
            runbooks.append("Evaluate temporary traffic shedding or horizontal pod autoscaling mitigation via What-if Simulator.")
        else:
            leads.append("System is operating within nominal parameters. No urgent threshold breach forecasted.")
            runbooks.append("Continue routine automated telemetry collection and periodic model retraining.")

        # 8. Grounded Synthesis
        summary = (
            f"PrognosysAI Investigation for {metric.service.name if metric.service else 'service'} • {metric.name}: "
            f"The service is currently classified in risk state {risk_state} with a risk score of {risk_score:.1f}/100. "
            f"Observed value is {current_val:.1f} {metric.unit}. "
            f"Time-to-breach projection: {time_to_breach}. "
            f"Found {len(correlation.correlated_events)} operational events in the {req.lookback_minutes}-minute lookback window and "
            f"{len(anomalies)} recent anomaly detections."
        )

        return InvestigationReport(
            metric_id=metric.id,
            metric_name=metric.name,
            service_name=metric.service.name if metric.service else "unknown",
            risk_state=risk_state,
            risk_score=risk_score,
            current_value=current_val,
            time_to_breach_display=time_to_breach,
            investigated_at=datetime.now(timezone.utc),
            synthesizer_mode="deterministic_grounded",
            executive_summary=summary,
            timeline_summary=timeline,
            evidence_ledger=evidence,
            investigative_leads=leads,
            recommended_runbook_actions=runbooks,
        )
