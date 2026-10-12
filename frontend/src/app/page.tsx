"use client";

import { useEffect, useState, useRef } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Gauge,
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
  GitCommit,
  Network,
  History,
  Sparkles,
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
  assessRisk,
  fetchLatestRisk,
  fetchSystemRiskOverview,
  RiskAssessmentResponse,
  SystemRiskOverview,
  createOperationalEvent,
  fetchOperationalEvents,
  fetchEventCorrelation,
  fetchServiceTopology,
  OperationalEventResponse,
  EventCorrelationResponse,
  ServiceTopologyResponse,
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

  // Phase 4: Risk Intelligence State
  const [riskOverview, setRiskOverview] = useState<SystemRiskOverview | null>(null);
  const [loadingRiskOverview, setLoadingRiskOverview] = useState<boolean>(false);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentResponse | null>(null);
  const [assessingRisk, setAssessingRisk] = useState<boolean>(false);

  // Phase 5: Operational Context State
  const [events, setEvents] = useState<OperationalEventResponse[]>([]);
  const [correlatedEvents, setCorrelatedEvents] = useState<EventCorrelationResponse | null>(null);
  const [topology, setTopology] = useState<ServiceTopologyResponse | null>(null);
  const [eventTitle, setEventTitle] = useState<string>("Release v2.14.0 canary rollout");
  const [eventType, setEventType] = useState<string>("deployment");
  const [eventSeverity, setEventSeverity] = useState<string>("info");
  const [loggingEvent, setLoggingEvent] = useState<boolean>(false);
  const [eventSuccess, setEventSuccess] = useState<string | null>(null);

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
      loadRiskOverviewData();
      loadEventsData();
      loadTopologyData();
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

  const loadRiskOverviewData = async () => {
    setLoadingRiskOverview(true);
    try {
      const overview = await fetchSystemRiskOverview();
      setRiskOverview(overview);
    } catch {
      // Backend may not have risk data yet
    }
    setLoadingRiskOverview(false);
  };

  const loadEventsData = async () => {
    try {
      const data = await fetchOperationalEvents();
      setEvents(data);
    } catch {
      // Backend may be offline
    }
  };

  const loadTopologyData = async () => {
    try {
      const topo = await fetchServiceTopology();
      setTopology(topo);
    } catch {
      // Backend may be offline
    }
  };

  const loadCorrelationData = async (metricId: number) => {
    try {
      const corr = await fetchEventCorrelation(metricId);
      setCorrelatedEvents(corr);
    } catch {
      setCorrelatedEvents(null);
    }
  };

  const handleLogEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingEvent(true);
    setEventSuccess(null);
    try {
      await createOperationalEvent({
        service_id: selectedServiceId,
        event_type: eventType,
        title: eventTitle,
        severity: eventSeverity,
      });
      setEventSuccess(`Logged ${eventType}: "${eventTitle}"`);
      loadEventsData();
      if (selectedMetricId) loadCorrelationData(selectedMetricId);
    } catch (err: any) {
      setError(err.message || "Failed to log event");
    }
    setLoggingEvent(false);
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

  useEffect(() => {
    if (selectedMetricId) {
      fetchLatestRisk(selectedMetricId)
        .then((latest) => {
          setRiskAssessment(latest);
        })
        .catch(() => {});
      loadCorrelationData(selectedMetricId);
    }
  }, [selectedMetricId]);

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
      loadRiskOverviewData();
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
      loadRiskOverviewData();
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

  const handleAssessRisk = async () => {
    if (!selectedMetricId) return;
    setAssessingRisk(true);
    setError(null);
    try {
      const res = await assessRisk({
        metric_id: selectedMetricId,
        horizon_minutes: Number(horizonMinutes),
        model_type: forecastModel,
      });
      setRiskAssessment(res);
      loadRiskOverviewData();
    } catch (err: any) {
      setError(err.message || "Risk assessment evaluation failed");
    }
    setAssessingRisk(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getRiskBadgeClasses = (state: string) => {
    switch (state) {
      case "CRITICAL":
        return "bg-rose-950/80 border-rose-800 text-rose-300";
      case "ELEVATED":
        return "bg-amber-950/80 border-amber-800 text-amber-300";
      case "WATCH":
        return "bg-yellow-950/80 border-yellow-800 text-yellow-300";
      case "NORMAL":
        return "bg-emerald-950/80 border-emerald-800 text-emerald-300";
      default:
        return "bg-slate-900 border-slate-700 text-slate-400";
    }
  };

  const getRiskScoreBarColor = (score: number) => {
    if (score >= 80) return "bg-rose-500 shadow-rose-500/50";
    if (score >= 60) return "bg-amber-500 shadow-amber-500/50";
    if (score >= 30) return "bg-yellow-500 shadow-yellow-500/50";
    return "bg-emerald-500 shadow-emerald-500/50";
  };

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
                  v0.4.0-risk-intel
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
              <Gauge className="h-3.5 w-3.5" />
              Phase 4: Capacity Risk Intelligence & Time-to-Breach Estimation
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Predict Capacity Breaches{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                Before Critical Incidents Occur.
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg leading-relaxed">
              Synthesizing multi-horizon time-series trajectories against configured warning,
              critical, and hard capacity thresholds. Compute continuous risk scores and
              deterministic time-to-breach estimations with zero hallucination.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="#risk-intelligence"
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-cyan-500/25 transition text-xs"
              >
                <Gauge className="h-4 w-4" />
                View Risk Intelligence Hub
              </a>
              <a
                href="#forecast-explorer"
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-5 py-2.5 rounded-lg transition text-xs"
              >
                Forecast Explorer
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Phase 4: Capacity Risk Intelligence Hub */}
        <section id="risk-intelligence" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Gauge className="h-5 w-5 text-cyan-400" />
                System Risk Intelligence Overview
              </h2>
              <p className="text-xs text-slate-400">
                Aggregate capacity risk classification and deterministic time-to-breach projection across infrastructure
              </p>
            </div>
            <button
              onClick={loadRiskOverviewData}
              disabled={loadingRiskOverview}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRiskOverview ? "animate-spin" : ""}`} />
              Refresh Overview
            </button>
          </div>

          {/* 4 Risk Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-rose-900/40 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
                <span>CRITICAL</span>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-300 mt-2">
                {riskOverview?.critical_count ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Breach &lt; 30m or active</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-900/40 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
                <span>ELEVATED</span>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-300 mt-2">
                {riskOverview?.elevated_count ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Breach projected 30-60m</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-900/40 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-yellow-400 font-medium">
                <span>WATCH</span>
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-yellow-300 mt-2">
                {riskOverview?.watch_count ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Upper interval touches threshold</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-900/40 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
                <span>NORMAL</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-300 mt-2">
                {riskOverview?.normal_count ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Healthy operating range</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm col-span-2 lg:col-span-1">
              <div className="text-xs text-slate-400 font-medium">TOTAL MONITORED</div>
              <div className="text-2xl font-bold font-mono text-slate-200 mt-2">
                {riskOverview?.total_metrics_evaluated ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {riskOverview?.insufficient_data_count ?? 0} insufficient data
              </div>
            </div>
          </div>

          {/* Detailed Metric Risk Card & Assessment Trigger */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Metric Risk Evaluation Card */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-400">Current Evaluation Target</div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <Server className="h-4 w-4 text-cyan-400" />
                    {metrics.find((m) => m.id === selectedMetricId)?.name || "Select a Metric"}
                    <span className="text-xs text-slate-400 font-normal">
                      ({services.find((s) => s.id === selectedServiceId)?.name || "Service"})
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAssessRisk}
                  disabled={assessingRisk || !selectedMetricId}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-4 py-2 rounded-lg shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 text-xs"
                >
                  <Gauge className={`h-4 w-4 ${assessingRisk ? "animate-spin" : ""}`} />
                  {assessingRisk ? "Evaluating Risk..." : "Assess Capacity Risk"}
                </button>
              </div>

              {riskAssessment ? (
                <div className="space-y-6">
                  {/* Time to Breach Banner */}
                  <div
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${getRiskBadgeClasses(
                      riskAssessment.risk_state
                    )}`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-6 w-6 flex-shrink-0" />
                      <div>
                        <div className="text-xs uppercase tracking-wider font-mono font-semibold">
                          Estimated Time To Breach
                        </div>
                        <div className="text-lg font-bold">
                          {riskAssessment.time_to_breach_display}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-3 py-1 rounded-full border bg-slate-950/80 font-semibold uppercase">
                        State: {riskAssessment.risk_state}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Factor Risk Score Gauge */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Multi-Factor Capacity Risk Score</span>
                      <span className="font-mono text-sm font-bold text-white">
                        {riskAssessment.risk_score} / 100
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getRiskScoreBarColor(
                          riskAssessment.risk_score
                        )}`}
                        style={{ width: `${Math.min(100, Math.max(5, riskAssessment.risk_score))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0 (NORMAL)</span>
                      <span>30 (WATCH)</span>
                      <span>60 (ELEVATED)</span>
                      <span>80-100 (CRITICAL)</span>
                    </div>
                  </div>

                  {/* Threshold Indicators */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">CURRENT VALUE</div>
                      <div className="text-base font-bold text-white font-mono mt-0.5">
                        {riskAssessment.current_value} {riskAssessment.unit}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">WARNING LIMIT</div>
                      <div className="text-base font-bold text-yellow-400 font-mono mt-0.5">
                        {riskAssessment.warning_threshold ?? 80.0} {riskAssessment.unit}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">CRITICAL LIMIT</div>
                      <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
                        {riskAssessment.critical_threshold ?? 90.0} {riskAssessment.unit}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">CAPACITY LIMIT</div>
                      <div className="text-base font-bold text-slate-300 font-mono mt-0.5">
                        {riskAssessment.capacity_limit ?? 100.0} {riskAssessment.unit}
                      </div>
                    </div>
                  </div>

                  {/* Deterministic Explanation */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-cyan-400" />
                      Engineering Assessment Rationale
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono">
                      {riskAssessment.explanation}
                    </p>
                    <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Evaluated: {new Date(riskAssessment.assessed_at).toLocaleTimeString()}</span>
                      <span>Confidence: {riskAssessment.confidence.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-3">
                  <Gauge className="h-8 w-8 text-slate-600 mx-auto" />
                  <div className="text-xs text-slate-400">
                    No risk evaluation performed yet for this metric.
                  </div>
                  <button
                    onClick={handleAssessRisk}
                    disabled={assessingRisk || !selectedMetricId}
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    Run Capacity Risk Evaluation Now &rarr;
                  </button>
                </div>
              )}
            </div>

            {/* Top At-Risk Metrics Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  Top Risk Infrastructure
                </span>
                <span className="text-[10px] font-mono text-slate-500">SORTED BY SCORE</span>
              </div>

              {riskOverview && riskOverview.highest_risk_items.length > 0 ? (
                <div className="space-y-2.5">
                  {riskOverview.highest_risk_items.slice(0, 6).map((item) => (
                    <div
                      key={item.metric_id}
                      onClick={() => setSelectedMetricId(item.metric_id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer hover:border-slate-600 transition space-y-1.5 ${
                        item.metric_id === selectedMetricId
                          ? "bg-slate-800/80 border-cyan-500/80"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          {item.service_name} • {item.metric_name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getRiskBadgeClasses(
                            item.risk_state
                          )}`}
                        >
                          {item.risk_state}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Current: {item.current_value} {item.unit}</span>
                        <span className="text-slate-300 font-semibold">{item.time_to_breach_display}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No risk intelligence data recorded yet. Ingest telemetry and evaluate capacity risks.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Phase 5: Operational Context & Service Topology */}
        <section id="operational-context" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <GitCommit className="h-5 w-5 text-indigo-400" />
                Operational Context & Service Topology
              </h2>
              <p className="text-xs text-slate-400">
                Correlate software deployments and infrastructure events with metric inflection points.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-300">
                Phase 5 Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Event Logger & Live Event Timeline */}
            <div className="space-y-6">
              {/* Event Logger Form */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-400" />
                    Log Operational Event
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">TEMPORAL CONTEXT</span>
                </div>

                <form onSubmit={handleLogEvent} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Event Title</label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. Release v2.14.0 canary rollout"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Event Type</label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      >
                        <option value="deployment">Deployment</option>
                        <option value="config_change">Configuration Change</option>
                        <option value="restart">Service Restart</option>
                        <option value="scale_event">Autoscaling Event</option>
                        <option value="incident">Incident / Outage</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Severity</label>
                      <select
                        value={eventSeverity}
                        onChange={(e) => setEventSeverity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loggingEvent}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-lg transition disabled:opacity-50 text-xs shadow-lg shadow-indigo-600/20"
                  >
                    <GitCommit className={`h-3.5 w-3.5 ${loggingEvent ? "animate-spin" : ""}`} />
                    {loggingEvent ? "Logging Event..." : "Record Operational Event"}
                  </button>
                </form>

                {eventSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 text-xs">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{eventSuccess}</span>
                  </div>
                )}
              </div>

              {/* Recent Events Feed */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-400" />
                    Recent Operational Timeline
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{events.length} EVENTS</span>
                </div>

                {events.length > 0 ? (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {events.slice(0, 5).map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                ev.severity === "critical"
                                  ? "bg-rose-500"
                                  : ev.severity === "warning"
                                  ? "bg-amber-500"
                                  : "bg-indigo-400"
                              }`}
                            />
                            {ev.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                            {ev.event_type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Target: {ev.service_name || "Infrastructure-Wide"}</span>
                          <span>{new Date(ev.occurred_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No operational events logged yet. Record an event to observe temporal correlation.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Temporal Correlation Lead & Topology Graph */}
            <div className="space-y-6">
              {/* Temporal Correlation Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    Temporal Metric Correlation
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    LOOKBACK: 120 MINS
                  </span>
                </div>

                {/* Methodological Disclaimer */}
                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300 leading-relaxed font-mono">
                  {correlatedEvents?.methodology_disclaimer ||
                    "Temporal proximity detects investigative leads, never assumed causation."}
                </div>

                {correlatedEvents && correlatedEvents.correlated_events.length > 0 ? (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto">
                    {correlatedEvents.correlated_events.map((c) => (
                      <div
                        key={c.event_id}
                        className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{c.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                            Lead Score: {c.relevance_lead_score}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {c.relevance_note}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No operational events detected within the 120-minute window of the selected metric.
                  </div>
                )}
              </div>

              {/* Service Dependency Topology */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Network className="h-4 w-4 text-emerald-400" />
                    Service Dependency Topology
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {topology?.nodes.length ?? 0} NODES • {topology?.edges.length ?? 0} EDGES
                  </span>
                </div>

                {topology && topology.nodes.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {topology.nodes.map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white truncate">{n.name}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${getRiskBadgeClasses(
                                n.risk_state
                              )}`}
                            >
                              {n.risk_state}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">Tier: {n.tier}</div>
                        </div>
                      ))}
                    </div>

                    {topology.edges.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          Directed Downstream Links:
                        </span>
                        <div className="space-y-1 font-mono text-[11px]">
                          {topology.edges.map((e) => {
                            const srcNode = topology.nodes.find((x) => x.id === e.source)?.name || e.source;
                            const tgtNode = topology.nodes.find((x) => x.id === e.target)?.name || e.target;
                            return (
                              <div key={e.id} className="flex items-center gap-1.5 text-slate-300">
                                <span>{srcNode}</span>
                                <span className="text-cyan-400">&rarr;</span>
                                <span>{tgtNode}</span>
                                <span className="text-slate-500 text-[10px]">({e.dependency_type})</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Register services to construct upstream/downstream dependency map.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

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
            <span className="text-xs text-slate-400">Phase 4 Verification</span>
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

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
              <span className="flex items-center gap-2 text-emerald-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Phase 3 — Predictive Engine (Multi-Horizon Forecasting & Anomalies)
              </span>
              <span className="font-mono text-emerald-400 uppercase font-semibold">
                Completed
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
              <span className="flex items-center gap-2 text-emerald-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Phase 4 — Risk Intelligence (Thresholds, Breach & Time-to-Breach)
              </span>
              <span className="font-mono text-emerald-400 uppercase font-semibold">
                Completed
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40">
              <span className="flex items-center gap-2 text-cyan-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                Phase 5 — Operational Context & Topology (Events & Correlations)
              </span>
              <span className="font-mono text-cyan-400 uppercase font-semibold">
                Completed
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                Phase 6 — Incident Investigation & AI Copilot (Evidence Synthesis)
              </span>
              <span className="font-mono text-slate-500 uppercase">
                Active
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
