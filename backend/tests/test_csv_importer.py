import pytest
from sqlalchemy.orm import Session

from app.models.service import Service
from app.models.metric import MetricDefinition, MetricObservation
from app.services.csv_importer import CSVTelemetryImporter


def test_csv_importer_valid(db_session: Session):
    csv_data = b"""timestamp,service,metric,value,unit
2026-10-12T14:00:00Z,payment-gateway,cpu_utilization,45.2,percent
2026-10-12T14:01:00Z,payment-gateway,cpu_utilization,48.5,percent
2026-10-12T14:02:00Z,payment-gateway,cpu_utilization,52.1,percent
"""
    summary = CSVTelemetryImporter.import_csv_content(db_session, csv_data)
    assert summary.status == "success"
    assert summary.total_rows_read == 3
    assert summary.valid_rows_imported == 3
    assert summary.error_count == 0
    assert "payment-gateway" in summary.services_affected

    svc = db_session.query(Service).filter(Service.name == "payment-gateway").first()
    assert svc is not None
    metric = db_session.query(MetricDefinition).filter(MetricDefinition.service_id == svc.id).first()
    assert metric.name == "cpu_utilization"

    obs = db_session.query(MetricObservation).filter(MetricObservation.metric_id == metric.id).all()
    assert len(obs) == 3


def test_csv_importer_missing_headers(db_session: Session):
    csv_data = b"""service,metric,value
auth-service,memory_utilization,75.0
"""
    summary = CSVTelemetryImporter.import_csv_content(db_session, csv_data)
    assert summary.status == "failed"
    assert summary.error_count > 0
    assert any("timestamp" in err.message for err in summary.errors)


def test_csv_importer_invalid_percentage(db_session: Session):
    csv_data = b"""timestamp,service,metric,value,unit
2026-10-12T14:00:00Z,auth-service,memory_utilization,145.0,percent
2026-10-12T14:01:00Z,auth-service,memory_utilization,70.0,percent
"""
    summary = CSVTelemetryImporter.import_csv_content(db_session, csv_data)
    assert summary.status == "partial_success"
    assert summary.valid_rows_imported == 1
    assert summary.error_count == 1
    assert summary.errors[0].row_number == 2
    assert "out of allowable [0, 100] bounds" in summary.errors[0].message


def test_csv_importer_duplicate_timestamp(db_session: Session):
    csv_data = b"""timestamp,service,metric,value,unit
2026-10-12T14:00:00Z,auth-service,memory_utilization,60.0,percent
2026-10-12T14:00:00Z,auth-service,memory_utilization,62.0,percent
"""
    summary = CSVTelemetryImporter.import_csv_content(db_session, csv_data)
    assert summary.status == "partial_success"
    assert summary.valid_rows_imported == 1
    assert summary.error_count == 1
    assert "Duplicate observation timestamp" in summary.errors[0].message
