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

export interface RootStatusResponse {
  project: string;
  version: string;
  status: string;
  docs: string;
  api_v1: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export async function fetchHealthStatus(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, {
    cache: "no-store",
  });
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
