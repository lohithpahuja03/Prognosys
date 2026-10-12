export interface DatabaseHealth {
  status: string;
  database_type: string;
  connected: boolean;
  error?: string | null;
}

export interface HealthResponse {
  project: string;
  version: string;
  environment: string;
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  database: DatabaseHealth;
  components: Record<string, string>;
}

export interface MetricDefinition {
  id: number;
  service_id: number;
  name: string;
  unit: string;
  metric_type: string;
  warning_threshold?: number | null;
  critical_threshold?: number | null;
  capacity_limit?: number | null;
  created_at: string;
}

export interface ServiceItem {
  id: number;
  name: string;
  slug: string;
  tier: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  metrics?: MetricDefinition[];
}

export interface MetricObservation {
  id: number;
  metric_id: number;
  timestamp: string;
  value: number;
  is_synthetic: boolean;
  source: string;
  created_at: string;
}

export interface SyntheticGeneratorRequest {
  service_name: string;
  scenario: string;
  duration_minutes: number;
  interval_seconds: number;
  seed?: number;
  noise_level?: number;
}

export interface SyntheticGeneratorResponse {
  service_name: string;
  scenario: string;
  observations_created: number;
  duration_minutes: number;
  metrics_generated: string[];
  start_time: string;
  end_time: string;
  seed_used?: number | null;
}

export interface CSVValidationErrorDetail {
  row_number: number;
  column?: string;
  value?: string;
  message: string;
}

export interface CSVImportSummary {
  total_rows_read: number;
  valid_rows_imported: number;
  error_count: number;
  services_affected: string[];
  metrics_affected: string[];
  errors: CSVValidationErrorDetail[];
  status: "success" | "partial_success" | "failed";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export async function fetchHealthStatus(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch health status: HTTP ${res.status}`);
  }
  return res.json();
}

export async function checkBackendConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  data?: HealthResponse;
  error?: string;
}> {
  const start = performance.now();
  try {
    const data = await fetchHealthStatus();
    const latencyMs = Math.round(performance.now() - start);
    return { connected: true, latencyMs, data };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return { connected: false, latencyMs, error: err.message || "Failed to reach backend" };
  }
}

export async function fetchServices(): Promise<ServiceItem[]> {
  const res = await fetch(`${API_BASE_URL}/services/`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch services: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchServiceWithMetrics(serviceId: number): Promise<ServiceItem> {
  const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch service #${serviceId}: HTTP ${res.status}`);
  }
  return res.json();
}

export async function generateSyntheticTelemetry(
  req: SyntheticGeneratorRequest
): Promise<SyntheticGeneratorResponse> {
  const res = await fetch(`${API_BASE_URL}/telemetry/synthetic/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Generation failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function uploadCSVTelemetry(file: File): Promise<CSVImportSummary> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/telemetry/csv/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `CSV upload failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchMetricObservations(
  metricId: number,
  limit: number = 100
): Promise<MetricObservation[]> {
  const res = await fetch(`${API_BASE_URL}/metrics/${metricId}/observations?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch observations for metric #${metricId}: HTTP ${res.status}`);
  }
  return res.json();
}
