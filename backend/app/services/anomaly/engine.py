from datetime import datetime, timezone, timedelta
from typing import Dict, Type, List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.metric import MetricDefinition, MetricObservation
from app.models.anomaly import AnomalyDetection
from app.schemas.anomaly import (
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
    AnomalyDetectionItem,
)
from app.services.anomaly.base import BaseAnomalyDetector
from app.services.anomaly.statistical_zscore import StatisticalZScoreDetector
from app.services.anomaly.isolation_forest import IsolationForestDetector


class AnomalyDetectionService:
    """Master anomaly detection service coordinating model inference, classification, and persistence."""

    _DETECTORS: Dict[str, Type[BaseAnomalyDetector]] = {
        "statistical_zscore": StatisticalZScoreDetector,
        "isolation_forest": IsolationForestDetector,
    }

    @classmethod
    def get_available_models(cls) -> List[str]:
        return list(cls._DETECTORS.keys())

    @classmethod
    def detect_anomalies(
        cls,
        db: Session,
        req: AnomalyDetectionRequest,
    ) -> AnomalyDetectionResponse:
        metric = db.query(MetricDefinition).filter(MetricDefinition.id == req.metric_id).first()
        if not metric:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Metric definition ID {req.metric_id} not found.",
            )

        cutoff = datetime.now(timezone.utc) - timedelta(minutes=req.lookback_minutes)
        observations = (
            db.query(MetricObservation)
            .filter(MetricObservation.metric_id == req.metric_id, MetricObservation.timestamp >= cutoff)
            .order_by(MetricObservation.timestamp.asc())
            .all()
        )

        MIN_OBSERVATIONS = 10
        if len(observations) < MIN_OBSERVATIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient observations in lookback window: Metric '{metric.name}' has only "
                    f"{len(observations)} observations in the last {req.lookback_minutes} minutes. "
                    f"At least {MIN_OBSERVATIONS} observations required for reliable anomaly detection."
                ),
            )

        data = [{"timestamp": obs.timestamp, "value": obs.value} for obs in observations]
        df = pd.DataFrame(data).drop_duplicates(subset=["timestamp"]).sort_values("timestamp").reset_index(drop=True)

        detector_cls = cls._DETECTORS.get(req.model_type)
        if not detector_cls:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported anomaly model '{req.model_type}'. Available: {cls.get_available_models()}",
            )
        detector = detector_cls()

        points = detector.detect(df, sensitivity=req.sensitivity)

        # Persist detected anomalies to DB
        anomalies_to_save = []
        detection_items = []
        anomaly_count = 0

        for pt in points:
            if pt.is_anomaly:
                anomaly_count += 1
                record = AnomalyDetection(
                    metric_id=metric.id,
                    model_name=detector.model_name,
                    model_version=detector.model_version,
                    timestamp=pt.timestamp,
                    actual_value=pt.actual_value,
                    expected_value=pt.expected_value,
                    anomaly_score=pt.anomaly_score,
                    is_anomaly=True,
                    severity=pt.severity,
                    explanation=pt.explanation,
                )
                anomalies_to_save.append(record)

            detection_items.append(
                AnomalyDetectionItem(
                    timestamp=pt.timestamp,
                    actual_value=pt.actual_value,
                    expected_value=pt.expected_value,
                    anomaly_score=pt.anomaly_score,
                    is_anomaly=pt.is_anomaly,
                    severity=pt.severity,
                    explanation=pt.explanation,
                )
            )

        if anomalies_to_save:
            db.add_all(anomalies_to_save)
            db.commit()

        summary_text = (
            f"Analyzed {len(df)} points over past {req.lookback_minutes} minutes for '{metric.name}' "
            f"using {detector.model_name}. Identified {anomaly_count} behavioral anomalies."
        )

        return AnomalyDetectionResponse(
            metric_id=metric.id,
            service_name=metric.service.name if metric.service else "unknown",
            metric_name=metric.name,
            model_name=detector.model_name,
            model_version=detector.model_version,
            lookback_minutes=req.lookback_minutes,
            total_points_analyzed=len(df),
            anomalies_detected_count=anomaly_count,
            detections=detection_items,
            summary=summary_text,
        )

    @classmethod
    def get_metric_anomalies(
        cls,
        db: Session,
        metric_id: int,
        limit: int = 100,
    ) -> List[AnomalyDetectionItem]:
        records = (
            db.query(AnomalyDetection)
            .filter(AnomalyDetection.metric_id == metric_id, AnomalyDetection.is_anomaly == True)
            .order_by(AnomalyDetection.timestamp.desc())
            .limit(limit)
            .all()
        )
        return [
            AnomalyDetectionItem(
                id=rec.id,
                timestamp=rec.timestamp,
                actual_value=rec.actual_value,
                expected_value=rec.expected_value,
                anomaly_score=rec.anomaly_score,
                is_anomaly=rec.is_anomaly,
                severity=rec.severity,
                explanation=rec.explanation,
            )
            for rec in records
        ]
