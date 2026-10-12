from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session

from app.models.metric import MetricObservation
from app.services.service_inventory import get_or_create_service, get_or_create_metric
from app.schemas.telemetry import SyntheticGeneratorRequest, SyntheticGeneratorResponse


class SyntheticTelemetryGenerator:
    """Deterministic synthetic infrastructure telemetry simulator."""

    def __init__(self, seed: Optional[int] = 42):
        self.seed = seed
        self.rng = np.random.default_rng(seed)

    def generate(
        self,
        db: Session,
        req: SyntheticGeneratorRequest,
    ) -> SyntheticGeneratorResponse:
        # 1. Ensure service exists
        service = get_or_create_service(
            db,
            name=req.service_name,
            tier="critical" if req.scenario in ["memory_leak", "cpu_saturation"] else "standard",
            description=f"Simulated {req.scenario} environment",
        )

        # 2. Time points calculation
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(minutes=req.duration_minutes)
        step_seconds = req.interval_seconds
        total_steps = int((req.duration_minutes * 60) / step_seconds)
        time_index = [start_time + timedelta(seconds=i * step_seconds) for i in range(total_steps)]

        # Reset RNG with seed if requested
        if req.seed is not None:
            self.rng = np.random.default_rng(req.seed)

        # 3. Generate scenario profiles
        metric_series = self._generate_scenario_profiles(
            scenario=req.scenario,
            total_steps=total_steps,
            noise_level=req.noise_level,
        )

        # 4. Persist observations
        total_observations = 0
        metrics_generated = []

        for metric_spec in metric_series:
            metric_name = metric_spec["name"]
            metrics_generated.append(metric_name)
            values = metric_spec["values"]

            metric_def = get_or_create_metric(
                db,
                service_id=service.id,
                name=metric_name,
                unit=metric_spec["unit"],
                metric_type=metric_spec["metric_type"],
                warning_threshold=metric_spec.get("warning_threshold"),
                critical_threshold=metric_spec.get("critical_threshold"),
                capacity_limit=metric_spec.get("capacity_limit"),
            )

            observations = []
            for t, val in zip(time_index, values):
                observations.append(
                    MetricObservation(
                        metric_id=metric_def.id,
                        timestamp=t,
                        value=float(val),
                        is_synthetic=True,
                        source="synthetic",
                    )
                )

            db.bulk_save_objects(observations)
            total_observations += len(observations)

        db.commit()

        return SyntheticGeneratorResponse(
            service_name=service.name,
            scenario=req.scenario,
            observations_created=total_observations,
            duration_minutes=req.duration_minutes,
            metrics_generated=metrics_generated,
            start_time=start_time,
            end_time=now,
            seed_used=req.seed,
        )

    def _generate_scenario_profiles(
        self,
        scenario: str,
        total_steps: int,
        noise_level: float,
    ) -> List[Dict[str, Any]]:
        t = np.linspace(0, 1, total_steps)

        if scenario == "memory_leak":
            # Memory steadily increases from 45% toward 88%
            mem_base = 45.0 + 42.0 * t
            mem_noise = self.rng.normal(0, noise_level * 10, total_steps)
            memory_vals = np.clip(mem_base + mem_noise, 30.0, 99.0)

            # CPU stays modest around 35-45% with small diurnal sine wave
            cpu_base = 35.0 + 8.0 * np.sin(2 * np.pi * t * 2)
            cpu_noise = self.rng.normal(0, noise_level * 12, total_steps)
            cpu_vals = np.clip(cpu_base + cpu_noise, 15.0, 80.0)

            # Latency slightly elevates as memory pressure mounts
            latency_base = 25.0 + 30.0 * (t ** 2)
            latency_vals = np.clip(latency_base + self.rng.normal(0, 2.0, total_steps), 10.0, 200.0)

            return [
                {
                    "name": "memory_utilization",
                    "unit": "percent",
                    "metric_type": "gauge",
                    "warning_threshold": 80.0,
                    "critical_threshold": 90.0,
                    "capacity_limit": 100.0,
                    "values": memory_vals,
                },
                {
                    "name": "cpu_utilization",
                    "unit": "percent",
                    "metric_type": "gauge",
                    "warning_threshold": 75.0,
                    "critical_threshold": 88.0,
                    "capacity_limit": 100.0,
                    "values": cpu_vals,
                },
                {
                    "name": "request_latency_ms",
                    "unit": "ms",
                    "metric_type": "gauge",
                    "warning_threshold": 100.0,
                    "critical_threshold": 250.0,
                    "capacity_limit": 500.0,
                    "values": latency_vals,
                },
            ]

        elif scenario == "cpu_saturation":
            # Normal until 60% mark, then surges to 94%
            cpu_vals = np.zeros(total_steps)
            split_idx = int(total_steps * 0.5)
            cpu_vals[:split_idx] = 35.0 + self.rng.normal(0, 5, split_idx)
            cpu_vals[split_idx:] = 92.0 + self.rng.normal(0, 3, total_steps - split_idx)
            cpu_vals = np.clip(cpu_vals, 10.0, 99.5)

            # Memory is stable around 60%
            mem_vals = np.clip(58.0 + self.rng.normal(0, 3, total_steps), 30.0, 85.0)

            # Latency surges when CPU saturates
            latency_vals = np.zeros(total_steps)
            latency_vals[:split_idx] = 22.0 + self.rng.normal(0, 3, split_idx)
            latency_vals[split_idx:] = 320.0 + self.rng.normal(0, 25, total_steps - split_idx)
            latency_vals = np.clip(latency_vals, 10.0, 1000.0)

            return [
                {
                    "name": "cpu_utilization",
                    "unit": "percent",
                    "metric_type": "gauge",
                    "warning_threshold": 75.0,
                    "critical_threshold": 88.0,
                    "capacity_limit": 100.0,
                    "values": cpu_vals,
                },
                {
                    "name": "memory_utilization",
                    "unit": "percent",
                    "metric_type": "gauge",
                    "warning_threshold": 80.0,
                    "critical_threshold": 90.0,
                    "capacity_limit": 100.0,
                    "values": mem_vals,
                },
                {
                    "name": "request_latency_ms",
                    "unit": "ms",
                    "metric_type": "gauge",
                    "warning_threshold": 100.0,
                    "critical_threshold": 250.0,
                    "capacity_limit": 500.0,
                    "values": latency_vals,
                },
            ]

        elif scenario == "traffic_spike":
            # Gaussian bell curve surge in traffic
            center = 0.5
            width = 0.12
            spike = np.exp(-((t - center) ** 2) / (2 * width ** 2))

            rps_vals = np.clip(150.0 + 800.0 * spike + self.rng.normal(0, 20, total_steps), 50.0, 1200.0)
            cpu_vals = np.clip(28.0 + 55.0 * spike + self.rng.normal(0, 4, total_steps), 15.0, 95.0)
            mem_vals = np.clip(45.0 + 15.0 * spike + self.rng.normal(0, 2, total_steps), 30.0, 80.0)

            return [
                {
                    "name": "request_rate_rps",
                    "unit": "rps",
                    "metric_type": "gauge",
                    "warning_threshold": 800.0,
                    "critical_threshold": 1000.0,
                    "capacity_limit": 1500.0,
                    "values": rps_vals,
                },
                {
                    "name": "cpu_utilization",
                    "unit": "percent",
                    "metric_type": "gauge",
                    "warning_threshold": 75.0,
                    "critical_threshold": 88.0,
                    "capacity_limit": 100.0,
                    "values": cpu_vals,
                },
                {
                    "name": "memory_utilization",
                    "unit": "percent",
                    "metric_type": "gauge",
                    "warning_threshold": 80.0,
                    "critical_threshold": 90.0,
                    "capacity_limit": 100.0,
                    "values": mem_vals,
                },
            ]

        elif scenario == "db_pressure":
            # DB connection pool exhaustion (limit 100)
            db_conn_vals = np.clip(25.0 + 68.0 * (t ** 1.3) + self.rng.normal(0, 3, total_steps), 10.0, 100.0)
            latency_vals = np.clip(18.0 + 180.0 * (t ** 2) + self.rng.normal(0, 8, total_steps), 10.0, 500.0)

            return [
                {
                    "name": "db_connections_active",
                    "unit": "count",
                    "metric_type": "gauge",
                    "warning_threshold": 75.0,
                    "critical_threshold": 90.0,
                    "capacity_limit": 100.0,
                    "values": db_conn_vals,
                },
                {
                    "name": "request_latency_ms",
                    "unit": "ms",
                    "metric_type": "gauge",
                    "warning_threshold": 100.0,
                    "critical_threshold": 250.0,
                    "capacity_limit": 500.0,
                    "values": latency_vals,
                },
            ]

        else:  # "normal"
            # Stable healthy baseline
            cpu_vals = np.clip(32.0 + 8.0 * np.sin(2 * np.pi * t) + self.rng.normal(0, 3, total_steps), 10.0, 65.0)
            mem_vals = np.clip(48.0 + 4.0 * np.sin(2 * np.pi * t * 0.5) + self.rng.normal(0, 2, total_steps), 35.0, 65.0)
            latency_vals = np.clip(22.0 + self.rng.normal(0, 2, total_steps), 12.0, 45.0)

            return [
                {
                    "name": "cpu_utilization",
                    "unit": "percent",
                    "metric_type": "gauge",
                    "warning_threshold": 75.0,
                    "critical_threshold": 88.0,
                    "capacity_limit": 100.0,
                    "values": cpu_vals,
                },
                {
                    "name": "memory_utilization",
                    "unit": "percent",
                    "metric_type": "gauge",
                    "warning_threshold": 80.0,
                    "critical_threshold": 90.0,
                    "capacity_limit": 100.0,
                    "values": mem_vals,
                },
                {
                    "name": "request_latency_ms",
                    "unit": "ms",
                    "metric_type": "gauge",
                    "warning_threshold": 100.0,
                    "critical_threshold": 250.0,
                    "capacity_limit": 500.0,
                    "values": latency_vals,
                },
            ]
