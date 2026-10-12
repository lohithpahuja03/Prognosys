from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import numpy as np

from app.schemas.forecast import ForecastPointSchema


class RiskEvaluationResult:
    def __init__(
        self,
        risk_state: str,
        risk_score: float,
        predicted_breach_type: str,
        time_to_breach_minutes: Optional[float],
        time_to_breach_display: str,
        confidence: str,
        explanation: str,
    ):
        self.risk_state = risk_state
        self.risk_score = round(risk_score, 1)
        self.predicted_breach_type = predicted_breach_type
        self.time_to_breach_minutes = round(time_to_breach_minutes, 1) if time_to_breach_minutes is not None else None
        self.time_to_breach_display = time_to_breach_display
        self.confidence = confidence
        self.explanation = explanation


class CapacityRiskCalculator:
    """
    Deterministic Capacity Risk Engine.
    Evaluates historical telemetry, multi-horizon forecasts, and uncertainty bounds
    against configured warning and critical capacity limits.
    """

    @classmethod
    def evaluate(
        cls,
        current_value: float,
        unit: str,
        warning_threshold: Optional[float],
        critical_threshold: Optional[float],
        capacity_limit: Optional[float],
        forecast_points: List[ForecastPointSchema],
        is_insufficient_data: bool = False,
    ) -> RiskEvaluationResult:
        # Default thresholds if unspecified: 80% warning, 90% critical for percent gauges
        warn_th = warning_threshold if warning_threshold is not None else (80.0 if unit == "percent" else None)
        crit_th = critical_threshold if critical_threshold is not None else (90.0 if unit == "percent" else None)

        # 1. Check for Insufficient Data
        if is_insufficient_data or not forecast_points:
            return RiskEvaluationResult(
                risk_state="INSUFFICIENT_DATA",
                risk_score=0.0,
                predicted_breach_type="none",
                time_to_breach_minutes=None,
                time_to_breach_display="Indeterminate: insufficient historical telemetry",
                confidence="insufficient_data",
                explanation="Insufficient historical observations to project a reliable forecast or determine capacity risk.",
            )

        # 2. Check for Active Ongoing Breach
        if crit_th is not None and current_value >= crit_th:
            return RiskEvaluationResult(
                risk_state="CRITICAL",
                risk_score=100.0,
                predicted_breach_type="critical",
                time_to_breach_minutes=0.0,
                time_to_breach_display="Active breach: currently exceeds critical threshold",
                confidence="high",
                explanation=(
                    f"Current utilization ({current_value:.1f}{unit}) is currently violating the configured "
                    f"critical threshold ({crit_th:.1f}{unit}). Immediate operational response required."
                ),
            )

        if warn_th is not None and current_value >= warn_th:
            # Already in warning territory, check if heading to critical
            crit_breach_time = cls._find_breach_time(current_value, crit_th, forecast_points)
            if crit_breach_time is not None:
                risk_state = "CRITICAL" if crit_breach_time <= 30 else "ELEVATED"
                risk_score = 80.0 + min(18.0, max(0.0, (60.0 - crit_breach_time) * 0.3))
                return RiskEvaluationResult(
                    risk_state=risk_state,
                    risk_score=risk_score,
                    predicted_breach_type="critical",
                    time_to_breach_minutes=crit_breach_time,
                    time_to_breach_display=f"~{int(round(crit_breach_time))} minutes to critical breach",
                    confidence="high",
                    explanation=(
                        f"Current utilization ({current_value:.1f}{unit}) is already above the warning threshold "
                        f"({warn_th:.1f}{unit}) and is projected to breach the critical threshold ({crit_th:.1f}{unit}) "
                        f"in approximately {int(round(crit_breach_time))} minutes if current trajectory continues."
                    ),
                )
            else:
                return RiskEvaluationResult(
                    risk_state="ELEVATED",
                    risk_score=68.0,
                    predicted_breach_type="warning",
                    time_to_breach_minutes=0.0,
                    time_to_breach_display="Active warning: currently exceeds warning threshold",
                    confidence="high",
                    explanation=(
                        f"Current utilization ({current_value:.1f}{unit}) exceeds the warning threshold ({warn_th:.1f}{unit}). "
                        f"Forecast projects steady state without crossing critical threshold within the horizon."
                    ),
                )

        # 3. Forecast Projections against Critical Threshold
        crit_breach_time = cls._find_breach_time(current_value, crit_th, forecast_points)
        if crit_breach_time is not None:
            risk_state = "CRITICAL" if crit_breach_time <= 30 else "ELEVATED"
            base_score = 80.0 if risk_state == "CRITICAL" else 62.0
            urgency_bonus = min(18.0, max(0.0, (60.0 - crit_breach_time) * 0.3))
            score = min(98.0, base_score + urgency_bonus)

            return RiskEvaluationResult(
                risk_state=risk_state,
                risk_score=score,
                predicted_breach_type="critical",
                time_to_breach_minutes=crit_breach_time,
                time_to_breach_display=f"~{int(round(crit_breach_time))} minutes",
                confidence="high",
                explanation=(
                    f"Utilization ({current_value:.1f}{unit}) is forecast to cross the critical threshold ({crit_th:.1f}{unit}) "
                    f"in approximately {int(round(crit_breach_time))} minutes if current trend continues."
                ),
            )

        # 4. Forecast Projections against Warning Threshold
        warn_breach_time = cls._find_breach_time(current_value, warn_th, forecast_points)
        if warn_breach_time is not None:
            urgency_factor = max(0.0, (60.0 - warn_breach_time) / 60.0) * 25.0
            proximity_factor = (current_value / warn_th) * 35.0
            score = min(74.0, max(52.0, proximity_factor + urgency_factor))

            return RiskEvaluationResult(
                risk_state="ELEVATED",
                risk_score=score,
                predicted_breach_type="warning",
                time_to_breach_minutes=warn_breach_time,
                time_to_breach_display=f"~{int(round(warn_breach_time))} minutes to warning breach",
                confidence="medium",
                explanation=(
                    f"Utilization ({current_value:.1f}{unit}) is forecast to cross the configured warning threshold "
                    f"({warn_th:.1f}{unit}) in approximately {int(round(warn_breach_time))} minutes."
                ),
            )

        # 5. Check Uncertainty Intervals (Upper Bound nearing Warning)
        final_pt = forecast_points[-1]
        if warn_th is not None and final_pt.upper_bound >= warn_th:
            score = min(48.0, max(25.0, (current_value / warn_th) * 40.0))
            return RiskEvaluationResult(
                risk_state="WATCH",
                risk_score=score,
                predicted_breach_type="none",
                time_to_breach_minutes=None,
                time_to_breach_display="No breach projected (upper bound touches warning)",
                confidence="medium",
                explanation=(
                    f"Utilization is currently stable ({current_value:.1f}{unit}), but exhibits upward variance. "
                    f"Upper 95% uncertainty interval touches the warning threshold ({warn_th:.1f}{unit})."
                ),
            )

        # 6. Check for Upward Trend Drift
        delta = final_pt.predicted_value - current_value
        if delta > 5.0 and warn_th is not None and current_value >= (warn_th * 0.70):
            score = 35.0
            return RiskEvaluationResult(
                risk_state="WATCH",
                risk_score=score,
                predicted_breach_type="none",
                time_to_breach_minutes=None,
                time_to_breach_display="No breach predicted within horizon (upward drift detected)",
                confidence="medium",
                explanation=(
                    f"Metric exhibits systematic upward drift (+{delta:.1f}{unit} projected over horizon) "
                    f"nearing warning threshold."
                ),
            )

        # 7. Normal State
        score = min(20.0, (current_value / (crit_th if crit_th else 100.0)) * 20.0)
        return RiskEvaluationResult(
            risk_state="NORMAL",
            risk_score=max(0.0, score),
            predicted_breach_type="none",
            time_to_breach_minutes=None,
            time_to_breach_display="No breach predicted within forecast horizon",
            confidence="high",
            explanation=(
                f"Metric utilization ({current_value:.1f}{unit}) is healthy and projected to remain safely below "
                f"configured capacity thresholds."
            ),
        )

    @classmethod
    def _find_breach_time(
        cls,
        current_value: float,
        threshold: Optional[float],
        forecast_points: List[ForecastPointSchema],
    ) -> Optional[float]:
        if threshold is None or not forecast_points:
            return None

        # If already breached at start
        if current_value >= threshold:
            return 0.0

        prev_val = current_value
        for i, pt in enumerate(forecast_points):
            val = pt.predicted_value
            if val >= threshold:
                # Linear interpolation between previous point and this point
                # Each point is 1 minute apart
                step_min = i + 1
                if val > prev_val:
                    fraction = (threshold - prev_val) / (val - prev_val)
                    return max(1.0, (step_min - 1) + fraction)
                return float(step_min)
            prev_val = val

        return None
