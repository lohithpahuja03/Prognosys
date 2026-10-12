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

// Phase 3: Predictive Engine Schemas
export interface ForecastPointSchema {
  target_timestamp: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  confidence_level: number;
}

export interface HistoricalPointSchema {
  timestamp: string;
  value: number;
}

export interface ForecastRequest {
  metric_id: number;
  horizon_minutes: number;
  model_type: string;
  confidence_level?: number;
}

export interface ForecastResponse {
  run_id: number;
  metric_id: number;
  metric_name: string;
  service_name: string;
  unit: string;
  model_name: string;
  model_version: string;
  horizon_minutes: number;
  training_points_count: number;
  generated_at: string;
  points: ForecastPointSchema[];
  historical_points: HistoricalPointSchema[];
  summary: string;
}

export interface AnomalyDetectionRequest {
  metric_id: number;
  model_type: string;
  lookback_minutes?: number;
  sensitivity?: number;
}

export interface AnomalyDetectionItem {
  id?: number | null;
  timestamp: string;
  actual_value: number;
  expected_value?: number | null;
  anomaly_score: number;
  is_anomaly: boolean;
  severity: string;
  explanation?: string | null;
}

export interface AnomalyDetectionResponse {
  metric_id: number;
  service_name: string;
  metric_name: string;
  model_name: string;
  model_version: string;
  lookback_minutes: number;
  total_points_analyzed: number;
  anomalies_detected_count: number;
  detections: AnomalyDetectionItem[];
  summary: string;
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

export async function fetchMetricsForService(serviceId: number): Promise<MetricDefinition[]> {
  const res = await fetch(`${API_BASE_URL}/metrics/?service_id=${serviceId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch metrics for service #${serviceId}: HTTP ${res.status}`);
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

export async function generateForecast(req: ForecastRequest): Promise<ForecastResponse> {
  const res = await fetch(`${API_BASE_URL}/forecast/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Forecast generation failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchLatestForecast(metricId: number): Promise<ForecastResponse | null> {
  const res = await fetch(`${API_BASE_URL}/forecast/latest/${metricId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch latest forecast: HTTP ${res.status}`);
  }
  return res.json();
}

export async function detectAnomalies(req: AnomalyDetectionRequest): Promise<AnomalyDetectionResponse> {
  const res = await fetch(`${API_BASE_URL}/anomalies/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Anomaly detection failed: HTTP ${res.status}`);
  }
  return res.json();
}

// Phase 4: Capacity Risk Intelligence Schemas
export interface RiskAssessmentRequest {
  metric_id: number;
  horizon_minutes?: number;
  model_type?: string;
}

export interface RiskAssessmentResponse {
  id?: number | null;
  metric_id: number;
  metric_name: string;
  service_name: string;
  unit: string;
  risk_state: "CRITICAL" | "ELEVATED" | "WATCH" | "NORMAL" | "INSUFFICIENT_DATA";
  risk_score: number;
  current_value: number;
  warning_threshold?: number | null;
  critical_threshold?: number | null;
  capacity_limit?: number | null;
  predicted_breach_type: "none" | "warning" | "critical" | "capacity";
  time_to_breach_minutes?: number | null;
  time_to_breach_display: string;
  confidence: string;
  explanation: string;
  assessed_at: string;
  forecast_run_id?: number | null;
}

export interface RiskOverviewItem {
  metric_id: number;
  metric_name: string;
  service_name: string;
  unit: string;
  risk_state: string;
  risk_score: number;
  current_value: number;
  time_to_breach_display: string;
}

export interface SystemRiskOverview {
  critical_count: number;
  elevated_count: number;
  watch_count: number;
  normal_count: number;
  insufficient_data_count: number;
  total_metrics_evaluated: number;
  highest_risk_items: RiskOverviewItem[];
  generated_at: string;
}

export async function assessRisk(req: RiskAssessmentRequest): Promise<RiskAssessmentResponse> {
  const res = await fetch(`${API_BASE_URL}/risk/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Risk assessment failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchLatestRisk(metricId: number): Promise<RiskAssessmentResponse | null> {
  const res = await fetch(`${API_BASE_URL}/risk/latest/${metricId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch risk assessment: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSystemRiskOverview(): Promise<SystemRiskOverview> {
  const res = await fetch(`${API_BASE_URL}/risk/overview`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch system risk overview: HTTP ${res.status}`);
  }
  return res.json();
}

// Phase 5: Operational Context & Topology Schemas
export interface OperationalEventCreate {
  service_id?: number | null;
  event_type: string;
  title: string;
  description?: string;
  severity?: string;
  metadata_json?: string;
  occurred_at?: string;
}

export interface OperationalEventResponse {
  id: number;
  service_id?: number | null;
  service_name?: string | null;
  event_type: string;
  title: string;
  description?: string | null;
  severity: string;
  metadata_json?: string | null;
  occurred_at: string;
  created_at: string;
}

export interface TopologyNode {
  id: number;
  name: string;
  slug: string;
  tier: string;
  risk_state: string;
}

export interface TopologyEdge {
  id: number;
  source: number;
  target: number;
  dependency_type: string;
}

export interface ServiceTopologyResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface CorrelatedEventItem {
  event_id: number;
  event_type: string;
  title: string;
  occurred_at: string;
  minutes_before_inflection: number;
  relevance_lead_score: number;
  relevance_note: string;
}

export interface EventCorrelationResponse {
  metric_id: number;
  metric_name: string;
  service_name: string;
  reference_timestamp: string;
  lookback_minutes: number;
  total_events_in_window: number;
  correlated_events: CorrelatedEventItem[];
  methodology_disclaimer: string;
}

export async function createOperationalEvent(
  req: OperationalEventCreate
): Promise<OperationalEventResponse> {
  const res = await fetch(`${API_BASE_URL}/events/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to log event: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchOperationalEvents(
  serviceId?: number,
  eventType?: string
): Promise<OperationalEventResponse[]> {
  const params = new URLSearchParams();
  if (serviceId) params.append("service_id", serviceId.toString());
  if (eventType) params.append("event_type", eventType);

  const res = await fetch(`${API_BASE_URL}/events/?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch events: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchEventCorrelation(
  metricId: number,
  lookbackMinutes = 120
): Promise<EventCorrelationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/events/correlate/${metricId}?lookback_minutes=${lookbackMinutes}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to correlate events: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchServiceTopology(): Promise<ServiceTopologyResponse> {
  const res = await fetch(`${API_BASE_URL}/topology/`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch service topology: HTTP ${res.status}`);
  }
  return res.json();
}
