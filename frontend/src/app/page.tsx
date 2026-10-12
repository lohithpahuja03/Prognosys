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
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import {
  checkBackendConnection,
  HealthResponse,
  fetchServices,
  ServiceItem,
  MetricDefinition,
  fetchMetricsForService,
  generateSyntheticTelemetry,
  uploadCSVTelemetry,
  SyntheticGeneratorRequest,
  CSVImportSummary,
  generateForecast,
  ForecastResponse,
  detectAnomalies,
  AnomalyDetectionResponse,
} from "@/lib/api";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [latency, setLatency] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("");

  // Services & Metrics
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [selectedMetricId, setSelectedMetricId] = useState<number | null>(null);

  // Synthetic Generator & CSV Upload
  const [generating, setGenerating] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [genSuccess, setGenSuccess] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<CSVImportSummary | null>(null);
  const [scenario, setScenario] = useState<string>("memory_leak");
  const [serviceName, setServiceName] = useState<string>("api-service");
  const [duration, setDuration] = useState<number>(120);
  const [seed, setSeed] = useState<number>(42);

  // Phase 3: Forecast & Anomaly State
  const [horizonMinutes, setHorizonMinutes] = useState<number>(30);
  const [forecastModel, setForecastModel] = useState<string>("exponential_smoothing");
  const [forecasting, setForecasting] = useState<boolean>(false);
  const [forecastResult, setForecastResult] = useState<ForecastResponse | null>(null);

  const [anomalyModel, setAnomalyModel] = useState<string>("statistical_zscore");
  const [detectingAnomalies, setDetectingAnomalies] = useState<boolean>(false);
  const [anomalyResult, setAnomalyResult] = useState<AnomalyDetectionResponse | null>(null);

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
      if (data.length > 0 && !selectedServiceId) {
        setSelectedServiceId(data[0].id);
      }
    } catch {
      // Backend may be offline
    }
    setLoadingServices(false);
  };

  useEffect(() => {
    if (selectedServiceId) {
      fetchMetricsForService(selectedServiceId)
        .then((m) => {
          setMetrics(m);
          if (m.length > 0) setSelectedMetricId(m[0].id);
        })
        .catch(() => {});
    }
  }, [selectedServiceId]);

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

  const handleForecast = async () => {
    if (!selectedMetricId) return;
    setForecasting(true);
    setError(null);
    try {
      const res = await generateForecast({
        metric_id: selectedMetricId,
        horizon_minutes: Number(horizonMinutes),
        model_type: forecastModel,
        confidence_level: 0.95,
      });
      setForecastResult(res);
    } catch (err: any) {
      setError(err.message || "Forecasting failed");
    }
    setForecasting(false);
  };

  const handleDetectAnomalies = async () => {
    if (!selectedMetricId) return;
    setDetectingAnomalies(true);
    setError(null);
    try {
      const res = await detectAnomalies({
        metric_id: selectedMetricId,
        model_type: anomalyModel,
        lookback_minutes: 120,
        sensitivity: 2.5,
      });
      setAnomalyResult(res);
    } catch (err: any) {
      setError(err.message || "Anomaly detection failed");
    }
    setDetectingAnomalies(false);
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
                  v0.3.0-predictive
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
              <TrendingUp className="h-3.5 w-3.5" />
              Phase 3: Multi-Horizon Forecasting & Anomaly Engine
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Predict What May Happen Next{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                With Mathematical Rigor.
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg leading-relaxed">
              Generate genuine 15, 30, and 60-minute time-series projections with
              calibrated prediction intervals. Zero LLM number fabrication. Compare
              persistence baselines against statistical exponential smoothing and
              unsupervised Isolation Forests.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="#forecast-explorer"
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-cyan-500/25 transition"
              >
                <TrendingUp className="h-4 w-4" />
                Open Forecast Explorer
              </a>
              <a
                href="#telemetry-console"
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-5 py-2.5 rounded-lg transition"
              >
                Ingest Telemetry First
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Phase 3: Interactive Predictive Forecast & Anomaly Explorer */}
        <section id="forecast-explorer" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <LineChart className="h-5 w-5 text-cyan-400" />
                Predictive Forecasting & Anomaly Lab
              </h2>
              <p className="text-xs text-slate-400">
                Execute mathematical forecasts and detect structural behavioral drift
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
            {/* Control Bar: Service, Metric, Horizon, Model selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Select Service</label>
                <select
                  value={selectedServiceId || ""}
                  onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.tier})
                    </option>
                  ))}
                  {services.length === 0 && <option value="">No services registered</option>}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Select Metric</label>
                <select
                  value={selectedMetricId || ""}
                  onChange={(e) => setSelectedMetricId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {metrics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                  {metrics.length === 0 && <option value="">No metrics found</option>}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Forecast Horizon</label>
                <select
                  value={horizonMinutes}
                  onChange={(e) => setHorizonMinutes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value={15}>15 Minutes Horizon</option>
                  <option value={30}>30 Minutes Horizon</option>
                  <option value={60}>60 Minutes Horizon</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Forecasting Model</label>
                <select
                  value={forecastModel}
                  onChange={(e) => setForecastModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="exponential_smoothing">Exponential Smoothing (Holt Linear)</option>
                  <option value="persistence">Persistence Baseline (Naive)</option>
                  <option value="linear_trend">Linear Trend Regression (OLS)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleForecast}
                disabled={forecasting || !selectedMetricId}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 text-xs"
              >
                <TrendingUp className={`h-4 w-4 ${forecasting ? "animate-spin" : ""}`} />
                {forecasting ? "Computing Forecast..." : `Compute ${horizonMinutes}m Forecast`}
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <select
                  value={anomalyModel}
                  onChange={(e) => setAnomalyModel(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
                >
                  <option value="statistical_zscore">Statistical Z-Score (Rolling)</option>
                  <option value="isolation_forest">Isolation Forest (Unsupervised)</option>
                </select>

                <button
                  onClick={handleDetectAnomalies}
                  disabled={detectingAnomalies || !selectedMetricId}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg transition disabled:opacity-50 text-xs"
                >
                  <ShieldAlert className={`h-4 w-4 ${detectingAnomalies ? "animate-spin" : ""}`} />
                  {detectingAnomalies ? "Detecting..." : "Run Anomaly Detection"}
                </button>
              </div>
            </div>

            {/* Forecast Output Visualization / Cards */}
            {forecastResult && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-white text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-cyan-400" />
                      Model Forecast: {forecastResult.service_name} • {forecastResult.metric_name}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                      {forecastResult.model_name.toUpperCase()} (v{forecastResult.model_version})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {forecastResult.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-xs text-slate-400">Current Observed Level</div>
                    <div className="text-2xl font-bold text-white font-mono mt-1">
                      {forecastResult.historical_points.length > 0
                        ? `${forecastResult.historical_points[forecastResult.historical_points.length - 1].value} ${forecastResult.unit}`
                        : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Based on {forecastResult.training_points_count} training points
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-xs text-slate-400">
                      Forecast at +{forecastResult.horizon_minutes}m
                    </div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                      {forecastResult.points[forecastResult.points.length - 1].predicted_value}{" "}
                      {forecastResult.unit}
                    </div>
                    <div className="text-[10px] text-cyan-500/80 mt-1">
                      Delta:{" "}
                      {forecastResult.historical_points.length > 0
                        ? (
                            forecastResult.points[forecastResult.points.length - 1].predicted_value -
                            forecastResult.historical_points[forecastResult.historical_points.length - 1].value
                          ).toFixed(2)
                        : "0"}{" "}
                      {forecastResult.unit}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-xs text-slate-400">95% Uncertainty Interval</div>
                    <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                      [{forecastResult.points[forecastResult.points.length - 1].lower_bound},{" "}
                      {forecastResult.points[forecastResult.points.length - 1].upper_bound}]
                    </div>
                    <div className="text-[10px] text-indigo-400/80 mt-1">
                      Statistical confidence interval
                    </div>
                  </div>
                </div>

                {/* Trajectory Table Sample */}
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
                  <div className="p-3 bg-slate-950/80 border-b border-slate-800 text-xs font-semibold text-slate-300">
                    Projected Time-Series Trajectory Sample
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/60 border-b border-slate-800/80 text-slate-400 font-mono text-[11px]">
                        <tr>
                          <th className="p-3">Target Time</th>
                          <th className="p-3">Predicted Value</th>
                          <th className="p-3">Lower Bound (95%)</th>
                          <th className="p-3">Upper Bound (95%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                        {forecastResult.points.slice(0, 10).map((pt, i) => (
                          <tr key={i} className="hover:bg-slate-800/20">
                            <td className="p-3 text-slate-400">
                              {new Date(pt.target_timestamp).toLocaleTimeString()}
                            </td>
                            <td className="p-3 font-semibold text-cyan-300">
                              {pt.predicted_value} {forecastResult.unit}
                            </td>
                            <td className="p-3 text-slate-400">{pt.lower_bound}</td>
                            <td className="p-3 text-slate-400">{pt.upper_bound}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Anomaly Detection Output */}
            {anomalyResult && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white text-sm flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-400" />
                      Anomaly Analysis: {anomalyResult.anomalies_detected_count} Anomalies Detected
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{anomalyResult.summary}</p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                    Model: {anomalyResult.model_name}
                  </span>
                </div>

                {anomalyResult.anomalies_detected_count > 0 && (
                  <div className="space-y-2">
                    {anomalyResult.detections
                      .filter((d) => d.is_anomaly)
                      .slice(0, 5)
                      .map((anom, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <span className="font-semibold text-amber-300 flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  anom.severity === "critical"
                                    ? "bg-red-500"
                                    : anom.severity === "high"
                                    ? "bg-amber-500"
                                    : "bg-yellow-500"
                                }`}
                              ></span>
                              {new Date(anom.timestamp).toLocaleTimeString()} • Value:{" "}
                              {anom.actual_value} (Expected: {anom.expected_value})
                            </span>
                            <p className="text-slate-400 text-[11px]">{anom.explanation}</p>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 uppercase">
                            Score: {anom.anomaly_score} ({anom.severity})
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Telemetry Generator & Ingestion Section */}
        <section id="telemetry-console" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" />
                Telemetry Ingestion & Synthetic Scenarios
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
                <p>Upload your historical or operational infrastructure time-series. Required columns:</p>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300">
                  timestamp, service, metric, value, unit
                </div>
                <p className="text-[11px] text-slate-500">
                  Validates percentage bounds [0, 100], ISO 8601 timestamps, duplicate records, and monotonic ordering.
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

        {/* Roadmap Milestones */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              Roadmap Status
            </h3>
            <span className="text-xs text-slate-400">Phase 3 Verification</span>
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

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
              <span className="flex items-center gap-2 text-emerald-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Phase 2 — Telemetry Pipeline (Synthetic Generator & CSV Ingestion)
              </span>
              <span className="font-mono text-emerald-400 uppercase font-semibold">
                Completed
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40">
              <span className="flex items-center gap-2 text-cyan-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                Phase 3 — Predictive Engine (Multi-Horizon Forecasting & Anomalies)
              </span>
              <span className="font-mono text-cyan-400 uppercase font-semibold">
                Verifying
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                Phase 4 — Risk Intelligence (Thresholds, Breach & Time-to-Breach)
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
