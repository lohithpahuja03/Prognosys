import io
from datetime import datetime, timezone
from typing import List, Dict, Set, Tuple
import pandas as pd
from sqlalchemy.orm import Session

from app.models.metric import MetricObservation
from app.services.service_inventory import get_or_create_service, get_or_create_metric
from app.schemas.telemetry import CSVImportSummary, CSVValidationErrorDetail


REQUIRED_COLUMNS = {"timestamp", "service", "metric", "value"}


class CSVTelemetryImporter:
    """Robust, validated infrastructure telemetry CSV parser and importer."""

    @classmethod
    def import_csv_content(
        cls,
        db: Session,
        content: bytes,
    ) -> CSVImportSummary:
        errors: List[CSVValidationErrorDetail] = []
        services_affected: Set[str] = set()
        metrics_affected: Set[str] = set()

        # 1. Parse CSV stream
        try:
            df = pd.read_csv(io.BytesIO(content))
        except Exception as exc:
            return CSVImportSummary(
                total_rows_read=0,
                valid_rows_imported=0,
                error_count=1,
                services_affected=[],
                metrics_affected=[],
                errors=[
                    CSVValidationErrorDetail(
                        row_number=0,
                        column="file",
                        message=f"Malformed CSV encoding or syntax: {str(exc)}",
                    )
                ],
                status="failed",
            )

        total_rows = len(df)
        if total_rows == 0:
            return CSVImportSummary(
                total_rows_read=0,
                valid_rows_imported=0,
                error_count=1,
                services_affected=[],
                metrics_affected=[],
                errors=[
                    CSVValidationErrorDetail(
                        row_number=0,
                        column="file",
                        message="The uploaded CSV file contains no data rows.",
                    )
                ],
                status="failed",
            )

        # Standardize column headers (lowercase, trimmed)
        df.columns = [str(c).strip().lower() for c in df.columns]

        # 2. Validate header presence
        missing_headers = REQUIRED_COLUMNS - set(df.columns)
        if missing_headers:
            return CSVImportSummary(
                total_rows_read=total_rows,
                valid_rows_imported=0,
                error_count=len(missing_headers),
                services_affected=[],
                metrics_affected=[],
                errors=[
                    CSVValidationErrorDetail(
                        row_number=1,
                        column=col,
                        message=f"Missing mandatory CSV column header: '{col}'. Required columns: {sorted(list(REQUIRED_COLUMNS))}",
                    )
                    for col in missing_headers
                ],
                status="failed",
            )

        # 3. Row-by-row validation & deduplication
        seen_keys: Set[Tuple[str, str, str]] = set()
        valid_records: List[Dict] = []

        for idx, row in df.iterrows():
            row_num = idx + 2  # 1-indexed including header row

            service_val = str(row.get("service", "")).strip()
            metric_val = str(row.get("metric", "")).strip()
            raw_ts = row.get("timestamp")
            raw_val = row.get("value")
            unit_val = str(row.get("unit", "percent")).strip() if "unit" in df.columns and pd.notna(row.get("unit")) else "percent"

            # Check null/empty required fields
            if not service_val or pd.isna(row.get("service")):
                errors.append(
                    CSVValidationErrorDetail(
                        row_number=row_num,
                        column="service",
                        message="Service name cannot be empty.",
                    )
                )
                continue

            if not metric_val or pd.isna(row.get("metric")):
                errors.append(
                    CSVValidationErrorDetail(
                        row_number=row_num,
                        column="metric",
                        message="Metric name cannot be empty.",
                    )
                )
                continue

            # Check timestamp format
            if pd.isna(raw_ts):
                errors.append(
                    CSVValidationErrorDetail(
                        row_number=row_num,
                        column="timestamp",
                        message="Timestamp cannot be null.",
                    )
                )
                continue

            try:
                parsed_ts = pd.to_datetime(raw_ts, utc=True)
                if pd.isna(parsed_ts):
                    raise ValueError("Parsed to NaT")
                dt = parsed_ts.to_pydatetime()
            except Exception:
                errors.append(
                    CSVValidationErrorDetail(
                        row_number=row_num,
                        column="timestamp",
                        value=str(raw_ts),
                        message="Invalid timestamp format. Expected ISO 8601 (e.g. 2026-10-12T14:30:00Z).",
                    )
                )
                continue

            # Check numeric value
            try:
                numeric_val = float(raw_val)
                import math
                if math.isnan(numeric_val) or math.isinf(numeric_val):
                    raise ValueError("NaN or Inf")
            except Exception as exc:
                errors.append(
                    CSVValidationErrorDetail(
                        row_number=row_num,
                        column="value",
                        value=str(raw_val),
                        message=f"Metric value must be a valid finite number ({exc}).",
                    )
                )
                continue

            # Check percentage bounds (0 - 100)
            is_percentage = unit_val == "percent" or "percent" in metric_val or "utilization" in metric_val
            if is_percentage and (numeric_val < 0.0 or numeric_val > 100.0):
                errors.append(
                    CSVValidationErrorDetail(
                        row_number=row_num,
                        column="value",
                        value=str(numeric_val),
                        message=f"Percentage utilization value {numeric_val} is out of allowable [0, 100] bounds.",
                    )
                )
                continue

            # Check duplicate records within this upload
            ts_str = dt.isoformat()
            record_key = (service_val, metric_val, ts_str)
            if record_key in seen_keys:
                errors.append(
                    CSVValidationErrorDetail(
                        row_number=row_num,
                        column="timestamp",
                        value=ts_str,
                        message=f"Duplicate observation timestamp for {service_val}:{metric_val} already present in batch.",
                    )
                )
                continue
            seen_keys.add(record_key)

            services_affected.add(service_val)
            metrics_affected.add(metric_val)
            valid_records.append({
                "service": service_val,
                "metric": metric_val,
                "timestamp": dt,
                "value": numeric_val,
                "unit": unit_val,
            })

        # 4. Sort observations chronologically to guarantee monotonic ordering
        valid_records.sort(key=lambda r: r["timestamp"])

        # 5. Persist valid observations
        service_cache = {}
        metric_cache = {}
        observations_to_save = []

        for rec in valid_records:
            svc_name = rec["service"]
            if svc_name not in service_cache:
                service_cache[svc_name] = get_or_create_service(db, name=svc_name)
            svc = service_cache[svc_name]

            m_name = rec["metric"]
            cache_key = (svc.id, m_name)
            if cache_key not in metric_cache:
                metric_cache[cache_key] = get_or_create_metric(
                    db,
                    service_id=svc.id,
                    name=m_name,
                    unit=rec["unit"],
                )
            m_def = metric_cache[cache_key]

            observations_to_save.append(
                MetricObservation(
                    metric_id=m_def.id,
                    timestamp=rec["timestamp"],
                    value=rec["value"],
                    is_synthetic=False,
                    source="csv_import",
                )
            )

        if observations_to_save:
            db.bulk_save_objects(observations_to_save)
            db.commit()

        status_str = "success" if len(errors) == 0 else ("partial_success" if len(valid_records) > 0 else "failed")

        return CSVImportSummary(
            total_rows_read=total_rows,
            valid_rows_imported=len(valid_records),
            error_count=len(errors),
            services_affected=sorted(list(services_affected)),
            metrics_affected=sorted(list(metrics_affected)),
            errors=errors[:100],  # Return up to first 100 errors to prevent payload bloat
            status=status_str,
        )
