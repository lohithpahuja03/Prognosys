"use client";

import { useEffect, useState, useRef } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  LineChart,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";
import {
  checkBackendConnection,
  HealthResponse,
  fetchServices,
  ServiceItem,
  generateSyntheticTelemetry,
  uploadCSVTelemetry,
  SyntheticGeneratorRequest,
  CSVImportSummary,
} from "@/lib/api";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [latency, setLatency] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("");

  // Telemetry Pipeline State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [genSuccess, setGenSuccess] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<CSVImportSummary | null>(null);

  // Synthetic Generator Form
  const [scenario, setScenario] = useState<string>("memory_leak");
  const [serviceName, setServiceName] = useState<string>("api-service");
  const [duration, setDuration] = useState<number>(120);
  const [seed, setSeed] = useState<number>(42);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const result = await checkBackendConnection();
    setLatency(result.latencyMs);
    if (result.connected && result.data) {
      setHealth(result.data);
      setLastChecked(new Date().toLocaleTimeString());
      loadServices();
    } else {
      setError(result.error || "Unable to reach FastAPI backend");
      setHealth(null);
    }
    setLoading(false);
  };

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const data = await fetchServices();
      setServices(data);
    } catch {
      // Backend may be offline or no services registered yet
    }
    setLoadingServices(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenSuccess(null);
    try {
      const req: SyntheticGeneratorRequest = {
        service_name: serviceName,
        scenario: scenario,
        duration_minutes: Number(duration),
        interval_seconds: 60,
        seed: Number(seed),
      };
      const res = await generateSyntheticTelemetry(req);
      setGenSuccess(
        `Generated ${res.observations_created} observations across ${res.metrics_generated.length} metrics for '${res.service_name}'.`
      );
      loadServices();
    } catch (err: any) {
      setError(err.message || "Failed to generate synthetic telemetry");
    }
    setGenerating(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadSummary(null);
    try {
      const summary = await uploadCSVTelemetry(file);
      setUploadSummary(summary);
      loadServices();
    } catch (err: any) {
      setError(err.message || "Failed to upload CSV file");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                Prognosys<span className="text-cyan-400">AI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                  v0.2.0-pipeline
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                {health?.status === "healthy" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                )}
              </span>
              <span className="text-slate-300">
                Backend:{" "}
                <span
                  className={
                    health?.status === "healthy"
                      ? "text-emerald-400 font-semibold"
                      : "text-amber-400 font-semibold"
                  }
                >
                  {loading
                    ? "Probing..."
                    : health
                    ? `${health.status.toUpperCase()} (${latency}ms)`
                    : "DISCONNECTED"}
                </span>
              </span>
            </div>

            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800/60 transition border border-transparent hover:border-slate-700"
            >
              API Docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <a
              href="https://github.com/lohithpahuja03/Prognosys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 rounded-md font-medium border border-slate-700 transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full space-y-10">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-[#0c1220]/80 to-[#070b14] p-8 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-xs font-medium text-cyan-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Phase 2: Telemetry Ingestion Pipeline
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Ingest, Validate & Store{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                High-Fidelity Telemetry.
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg leading-relaxed">
              Every prediction starts with genuine, structured telemetry. PrognosysAI
              ingests multi-metric infrastructure feeds via deterministic synthetic
              simulators, strict CSV validators, and high-throughput REST APIs.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="#telemetry-console"
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-cyan-500/25 transition"
              >
                <Play className="h-4 w-4" />
                Launch Telemetry Simulator
              </a>
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-5 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh Pipeline
              </button>
            </div>
          </div>
        </div>

        {/* Phase 2 Telemetry Ingestion Console */}
        <section id="telemetry-console" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" />
                Telemetry Generator & Data Ingestion Console
              </h2>
              <p className="text-xs text-slate-400">
                Generate reproducible operational scenarios or upload infrastructure CSV telemetry
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Synthetic Telemetry Generator Form */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-cyan-400" />
                  <span className="font-semibold text-sm text-white">
                    Deterministic Scenario Simulator
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  REPRODUCIBLE
                </span>
              </div>

              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Target Service</label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                      placeholder="e.g. api-service"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Scenario</label>
                    <select
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="memory_leak">Memory Leak (Gradual climb to 90%)</option>
                      <option value="cpu_saturation">CPU Saturation (Surge to 95%)</option>
                      <option value="traffic_spike">Traffic Spike (4x surge with latency)</option>
                      <option value="db_pressure">DB Pool Exhaustion</option>
                      <option value="normal">Normal (Healthy baseline)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Duration (Minutes)</label>
                    <input
                      type="number"
                      value={duration}
                      min={15}
                      max={720}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Random Seed</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-4 py-2.5 rounded-lg transition disabled:opacity-50 text-xs shadow-lg shadow-cyan-600/20"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
                  {generating ? "Generating Telemetry..." : "Generate Telemetry Dataset"}
                </button>
              </form>

              {genSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 text-xs">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{genSuccess}</span>
                </div>
              )}
            </div>

            {/* CSV Telemetry Importer */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-sm text-white">
                    Validated CSV Telemetry Upload
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300">
                  STRICT VALIDATION
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-400">
                <p>
                  Upload your historical or operational infrastructure time-series. Required columns:
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300">
                  timestamp, service, metric, value, unit
                </div>
                <p className="text-[11px] text-slate-500">
                  Strictly checks percentage bounds [0, 100], ISO 8601 timestamps, duplicate records, and monotonic ordering. Zero silent discards.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-slate-950/40 hover:bg-slate-900/50 transition"
                >
                  <Upload className={`h-6 w-6 text-slate-400 ${uploading ? "animate-bounce" : ""}`} />
                  <span className="text-xs font-medium text-slate-300">
                    {uploading ? "Uploading & Validating..." : "Click to select CSV telemetry file"}
                  </span>
                  <span className="text-[10px] text-slate-500">Maximum file size: 10 MB</span>
                </label>
              </div>

              {uploadSummary && (
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                    uploadSummary.status === "success"
                      ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-300"
                      : uploadSummary.status === "partial_success"
                      ? "bg-amber-950/30 border-amber-800/50 text-amber-300"
                      : "bg-red-950/30 border-red-800/50 text-red-300"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>Import Status: {uploadSummary.status.toUpperCase()}</span>
                    <span>
                      {uploadSummary.valid_rows_imported} / {uploadSummary.total_rows_read} rows
                    </span>
                  </div>
                  {uploadSummary.errors.length > 0 && (
                    <div className="pt-1 text-[11px] opacity-90">
                      Found {uploadSummary.error_count} validation errors. First error: row{" "}
                      {uploadSummary.errors[0].row_number} - {uploadSummary.errors[0].message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Monitored Services & Catalog Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Server className="h-5 w-5 text-cyan-400" />
                Service Catalog & Active Metrics ({services.length})
              </h2>
              <p className="text-xs text-slate-400">
                Monitored infrastructure services with configured capacity thresholds
              </p>
            </div>
            <button
              onClick={loadServices}
              disabled={loadingServices}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingServices ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {services.length === 0 ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-3">
              <Server className="h-8 w-8 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">
                No Services Monitored Yet
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate a synthetic telemetry scenario above or upload a CSV file to register monitored services and metric definitions.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40 backdrop-blur-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="p-4">Service Name</th>
                    <th className="p-4">Tier</th>
                    <th className="p-4">Configured Metrics</th>
                    <th className="p-4">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {services.map((svc) => (
                    <tr key={svc.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 font-semibold text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                        {svc.name}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase border ${
                            svc.tier === "critical"
                              ? "bg-red-950/70 border-red-800/60 text-red-300"
                              : "bg-slate-800 border-slate-700 text-slate-300"
                          }`}
                        >
                          {svc.tier}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-400">
                        {svc.metrics && svc.metrics.length > 0
                          ? svc.metrics.map((m) => m.name).join(", ")
                          : "Metrics Ingested"}
                      </td>
                      <td className="p-4 font-mono text-slate-500 text-[11px]">
                        {new Date(svc.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Roadmap Milestones */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              Roadmap Status
            </h3>
            <span className="text-xs text-slate-400">Phase 2 Verification</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
              <span className="flex items-center gap-2 text-emerald-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Phase 0 — Workspace & Architecture
              </span>
              <span className="font-mono text-emerald-400 uppercase font-semibold">
                Completed
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
              <span className="flex items-center gap-2 text-emerald-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Phase 1 — Working Foundation (FastAPI & Next.js)
              </span>
              <span className="font-mono text-emerald-400 uppercase font-semibold">
                Completed
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40">
              <span className="flex items-center gap-2 text-cyan-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                Phase 2 — Telemetry Pipeline (Synthetic Generator & CSV Ingestion)
              </span>
              <span className="font-mono text-cyan-400 uppercase font-semibold">
                Verifying
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                Phase 3 — Predictive Engine (Multi-Horizon Forecasting & Anomalies)
              </span>
              <span className="font-mono text-slate-500 uppercase">
                Queued
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            PrognosysAI • AI-Powered Predictive Infrastructure Intelligence
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            Strict Architecture Enforced • Zero LLM Number Fabrication
          </div>
        </div>
      </footer>
    </div>
  );
}
