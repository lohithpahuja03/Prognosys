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
  Sliders,
  Scale,
  FlaskConical,
  BookOpen,
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
  runInvestigation,
  runSimulation,
  runEvaluationBenchmark,
  InvestigationReport,
  SimulationResponse,
  EvaluationBenchmarkResponse,
} from "@/lib/api";

type TabType = "overview" | "predictive" | "context" | "investigator" | "evaluation" | "telemetry";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Health & diagnostics
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

  // Phase 7: AI Investigator & What-If State
  const [investigationReport, setInvestigationReport] = useState<InvestigationReport | null>(null);
  const [investigating, setInvestigating] = useState<boolean>(false);
  const [simAction, setSimAction] = useState<string>("scale_replicas");
  const [simParam, setSimParam] = useState<number>(2.0);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);

  // Phase 8: Model Evaluation State
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evalReport, setEvalReport] = useState<EvaluationBenchmarkResponse | null>(null);

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

  const handleInvestigation = async () => {
    if (!selectedMetricId) return;
    setInvestigating(true);
    setError(null);
    try {
      const rep = await runInvestigation(selectedMetricId, 120);
      setInvestigationReport(rep);
    } catch (err: any) {
      setError(err.message || "AI Investigation failed");
    }
    setInvestigating(false);
  };

  const handleSimulation = async () => {
    if (!selectedMetricId) return;
    setSimulating(true);
    setError(null);
    try {
      const sim = await runSimulation({
        metric_id: selectedMetricId,
        action_type: simAction,
        parameter_value: Number(simParam),
      });
      setSimulationResult(sim);
    } catch (err: any) {
      setError(err.message || "Simulation failed");
    }
    setSimulating(false);
  };

  const handleEvaluationBenchmark = async () => {
    if (!selectedMetricId) return;
    setEvaluating(true);
    setError(null);
    try {
      const ev = await runEvaluationBenchmark(selectedMetricId, 0.25);
      setEvalReport(ev);
    } catch (err: any) {
      setError(err.message || "Evaluation benchmark failed");
    }
    setEvaluating(false);
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
      <header className="border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                Prognosys<span className="text-cyan-400">AI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                  v1.0.0-enterprise
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
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full space-y-8">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "overview"
                ? "bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Gauge className="h-4 w-4" />
            Capacity Risk Command
          </button>

          <button
            onClick={() => setActiveTab("predictive")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "predictive"
                ? "bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <LineChart className="h-4 w-4" />
            Forecasting & Anomaly Lab
          </button>

          <button
            onClick={() => setActiveTab("context")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "context"
                ? "bg-indigo-500/10 border border-indigo-500/40 text-indigo-300 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <GitCommit className="h-4 w-4" />
            Operational Context & Topology
          </button>

          <button
            onClick={() => setActiveTab("investigator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "investigator"
                ? "bg-purple-500/10 border border-purple-500/40 text-purple-300 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Investigator & What-If
          </button>

          <button
            onClick={() => setActiveTab("evaluation")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "evaluation"
                ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            Model Evaluation Lab
          </button>

          <button
            onClick={() => setActiveTab("telemetry")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "telemetry"
                ? "bg-blue-500/10 border border-blue-500/40 text-blue-300 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Database className="h-4 w-4" />
            Telemetry & Scenarios
          </button>
        </div>

        {/* Global Metric & Service Target Selector */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Active Service</label>
              <select
                value={selectedServiceId || ""}
                onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
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
              <label className="text-[11px] text-slate-400 font-medium">Target Metric</label>
              <select
                value={selectedMetricId || ""}
                onChange={(e) => setSelectedMetricId(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {metrics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
                {metrics.length === 0 && <option value="">No metrics found</option>}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAssessRisk}
              disabled={assessingRisk || !selectedMetricId}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              <Gauge className={`h-3.5 w-3.5 ${assessingRisk ? "animate-spin" : ""}`} />
              Re-Assess Risk
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW & CAPACITY RISK */}
        {activeTab === "overview" && (
          <div className="space-y-8">
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
                <div className="text-[10px] text-slate-500 mt-1">Upper interval touches limit</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-900/40 backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
                  <span>NORMAL</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-300 mt-2">
                  {riskOverview?.normal_count ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Safe operating headroom</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm col-span-2 lg:col-span-1">
                <div className="text-xs text-slate-400 font-medium">TOTAL EVALUATED</div>
                <div className="text-2xl font-bold font-mono text-slate-200 mt-2">
                  {riskOverview?.total_metrics_evaluated ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {riskOverview?.insufficient_data_count ?? 0} insufficient data
                </div>
              </div>
            </div>

            {/* Detailed Metric Risk Card & Top At-Risk Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <span className="font-semibold text-sm text-white flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-cyan-400" />
                    Capacity Risk Evaluation: {metrics.find((m) => m.id === selectedMetricId)?.name}
                  </span>
                  {riskAssessment && (
                    <span
                      className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${getRiskBadgeClasses(
                        riskAssessment.risk_state
                      )}`}
                    >
                      {riskAssessment.risk_state}
                    </span>
                  )}
                </div>

                {riskAssessment ? (
                  <div className="space-y-6">
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${getRiskBadgeClasses(
                        riskAssessment.risk_state
                      )}`}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 flex-shrink-0" />
                        <div>
                          <div className="text-xs uppercase tracking-wider font-mono font-semibold">
                            Projected Time to Threshold Breach
                          </div>
                          <div className="text-lg font-bold">
                            {riskAssessment.time_to_breach_display}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono px-3 py-1 rounded-full border bg-slate-950/80 font-semibold uppercase">
                        Breach Type: {riskAssessment.predicted_breach_type}
                      </span>
                    </div>

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
                    </div>

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

                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                      <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-cyan-400" />
                        Engineering Assessment Rationale
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-mono">
                        {riskAssessment.explanation}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No risk assessment recorded yet. Click 'Re-Assess Risk' above.
                  </div>
                )}
              </div>

              {/* Top Risk Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    Top Risk Infrastructure
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">ORDERED BY SCORE</span>
                </div>

                {riskOverview && riskOverview.highest_risk_items.length > 0 ? (
                  <div className="space-y-2.5">
                    {riskOverview.highest_risk_items.map((it) => (
                      <div
                        key={it.metric_id}
                        onClick={() => setSelectedMetricId(it.metric_id)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer hover:border-slate-600 transition space-y-1.5 ${
                          it.metric_id === selectedMetricId
                            ? "bg-slate-800/80 border-cyan-500/80"
                            : "bg-slate-950/60 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">
                            {it.service_name} • {it.metric_name}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getRiskBadgeClasses(
                              it.risk_state
                            )}`}
                          >
                            {it.risk_state}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Current: {it.current_value} {it.unit}</span>
                          <span className="text-slate-300 font-semibold">{it.time_to_breach_display}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No risk telemetry recorded. Ingest telemetry and evaluate metrics.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PREDICTIVE FORECASTING & ANOMALIES */}
        {activeTab === "predictive" && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-800">
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

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Anomaly Detector</label>
                <select
                  value={anomalyModel}
                  onChange={(e) => setAnomalyModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="statistical_zscore">Rolling Statistical Z-Score</option>
                  <option value="isolation_forest">Isolation Forest (Unsupervised)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleForecast}
                disabled={forecasting || !selectedMetricId}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 text-xs"
              >
                <TrendingUp className={`h-4 w-4 ${forecasting ? "animate-spin" : ""}`} />
                {forecasting ? "Computing Forecast..." : `Compute ${horizonMinutes}m Forecast`}
              </button>

              <button
                onClick={handleDetectAnomalies}
                disabled={detectingAnomalies || !selectedMetricId}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg transition disabled:opacity-50 text-xs"
              >
                <ShieldAlert className={`h-4 w-4 ${detectingAnomalies ? "animate-spin" : ""}`} />
                {detectingAnomalies ? "Detecting..." : "Run Anomaly Detection"}
              </button>
            </div>

            {forecastResult && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">
                      Model Summary: {forecastResult.model_name.toUpperCase()} (v{forecastResult.model_version})
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{forecastResult.points.length} points</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">{forecastResult.summary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-xs text-slate-400">Current Observed Level</div>
                    <div className="text-2xl font-bold text-white font-mono mt-1">
                      {forecastResult.historical_points.length > 0
                        ? `${forecastResult.historical_points[forecastResult.historical_points.length - 1].value} ${forecastResult.unit}`
                        : "—"}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-xs text-slate-400">Forecast at +{forecastResult.horizon_minutes}m</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                      {forecastResult.points[forecastResult.points.length - 1].predicted_value}{" "}
                      {forecastResult.unit}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-xs text-slate-400">95% Uncertainty Interval</div>
                    <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                      [{forecastResult.points[forecastResult.points.length - 1].lower_bound},{" "}
                      {forecastResult.points[forecastResult.points.length - 1].upper_bound}]
                    </div>
                  </div>
                </div>

                {/* Trajectory Table */}
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
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

            {anomalyResult && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    Detected Anomalies: {anomalyResult.anomalies_detected_count}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Model: {anomalyResult.model_name}</span>
                </div>
                <p className="text-xs text-slate-300 font-mono">{anomalyResult.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OPERATIONAL CONTEXT & TOPOLOGY */}
        {activeTab === "context" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
                <span className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                  <History className="h-4 w-4 text-indigo-400" />
                  Log Operational Event
                </span>
                <form onSubmit={handleLogEvent} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Event Title</label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
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
                        <option value="incident">Incident</option>
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
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition disabled:opacity-50"
                  >
                    {loggingEvent ? "Logging..." : "Record Operational Event"}
                  </button>
                </form>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-3">
                <span className="text-sm font-semibold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
                  <History className="h-4 w-4 text-slate-400" />
                  Recent Operational Timeline
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {events.map((ev) => (
                    <div key={ev.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>{ev.title}</span>
                        <span className="text-[10px] font-mono uppercase text-slate-400">{ev.event_type}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date(ev.occurred_at).toLocaleTimeString()} • {ev.service_name || "System"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
                <span className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  Temporal Metric Correlation
                </span>
                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300 font-mono">
                  {correlatedEvents?.methodology_disclaimer ||
                    "Temporal proximity indicates an investigative lead, never assumed causation."}
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {correlatedEvents?.correlated_events.map((c) => (
                    <div key={c.event_id} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>{c.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                          Lead Score: {c.relevance_lead_score}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">{c.relevance_note}</p>
                    </div>
                  ))}
                  {(!correlatedEvents || correlatedEvents.correlated_events.length === 0) && (
                    <div className="text-xs text-slate-500 text-center p-4">No events found in lookback window.</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-3">
                <span className="text-sm font-semibold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Network className="h-4 w-4 text-emerald-400" />
                  Service Dependency Topology
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {topology?.nodes.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                      <div className="font-semibold text-white truncate">{n.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Tier: {n.tier}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI INVESTIGATOR & WHAT-IF SIMULATOR */}
        {activeTab === "investigator" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: AI Investigator Report */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  AI Investigation Engine
                </span>
                <button
                  onClick={handleInvestigation}
                  disabled={investigating || !selectedMetricId}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${investigating ? "animate-spin" : ""}`} />
                  {investigating ? "Synthesizing..." : "Run AI Investigation"}
                </button>
              </div>

              {investigationReport ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Executive Incident Summary</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300">
                        {investigationReport.synthesizer_mode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">
                      {investigationReport.executive_summary}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-300 font-mono">
                    {investigationReport.cautionary_notice}
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      Recommended Runbook Actions:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300 font-mono list-disc pl-4">
                      {investigationReport.recommended_runbook_actions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      Evidence Ledger ({investigationReport.evidence_ledger.length} items):
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {investigationReport.evidence_ledger.map((ev, i) => (
                        <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono">
                          <span className="text-cyan-400 uppercase font-semibold">[{ev.category}] </span>
                          <span className="text-slate-300">{ev.statement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Run an AI Investigation to synthesize evidence ledger and recommended runbooks.
                </div>
              )}
            </div>

            {/* Right: What-if Response Simulator */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-cyan-400" />
                  What-if Response Simulator (Read-Only)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  READ-ONLY
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Mitigation Action</label>
                  <select
                    value={simAction}
                    onChange={(e) => setSimAction(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="scale_replicas">Scale Worker Replicas</option>
                    <option value="traffic_shedding">Ingress Traffic Shedding (%)</option>
                    <option value="pool_expansion">DB Pool Limit Expansion</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Parameter Value</label>
                  <input
                    type="number"
                    value={simParam}
                    onChange={(e) => setSimParam(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleSimulation}
                disabled={simulating || !selectedMetricId}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition disabled:opacity-50"
              >
                {simulating ? "Projecting Hypothetical Trajectory..." : "Run What-If Scenario Projection"}
              </button>

              {simulationResult && (
                <div className="space-y-4 pt-3 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-mono">BASELINE STATE</div>
                      <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
                        {simulationResult.baseline_risk_state} ({simulationResult.baseline_risk_score}/100)
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{simulationResult.baseline_time_to_breach}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-emerald-900/40">
                      <div className="text-[10px] text-emerald-400 font-mono">MITIGATED STATE</div>
                      <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">
                        {simulationResult.projected_risk_state} ({simulationResult.projected_risk_score}/100)
                      </div>
                      <div className="text-[10px] text-emerald-500 mt-0.5">-{simulationResult.impact_delta_percentage}% load</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-300 font-mono">Underlying Assumptions:</span>
                    <ul className="space-y-1 text-[11px] text-slate-400 font-mono list-disc pl-4">
                      {simulationResult.assumptions_and_limits.map((asmp, i) => (
                        <li key={i}>{asmp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MODEL EVALUATION LAB */}
        {activeTab === "evaluation" && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-emerald-400" />
                  Model Evaluation Lab (Zero Temporal Data Leakage)
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological holdout cross-validation benchmarking candidate models against naive persistence.
                </p>
              </div>

              <button
                onClick={handleEvaluationBenchmark}
                disabled={evaluating || !selectedMetricId}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50"
              >
                <FlaskConical className={`h-3.5 w-3.5 ${evaluating ? "animate-spin" : ""}`} />
                {evaluating ? "Benchmarking Models..." : "Run Holdout Evaluation Benchmark"}
              </button>
            </div>

            {evalReport ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Evaluation Summary</span>
                    <span className="font-mono text-emerald-300 text-xs">
                      Winning Model: {evalReport.winning_model.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed">{evalReport.evaluation_summary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {evalReport.benchmark_scores.map((sc) => (
                    <div
                      key={sc.model_name}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        sc.model_name === evalReport.winning_model
                          ? "bg-emerald-950/30 border-emerald-800/80"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>{sc.model_name.toUpperCase()}</span>
                        {sc.outperformed_baseline && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                            +{sc.improvement_vs_baseline_pct}% BEATS BASELINE
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-slate-400">
                        <div>MAE: <span className="text-white font-bold">{sc.mae}</span></div>
                        <div>RMSE: <span className="text-white">{sc.rmse}</span></div>
                        <div>Forecast Bias: <span className="text-white">{sc.forecast_bias}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Click 'Run Holdout Evaluation Benchmark' to measure empirical accuracy against the Persistence Baseline.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: TELEMETRY & SCENARIOS */}
        {activeTab === "telemetry" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Synthetic Generator */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
              <span className="font-semibold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <Play className="h-4 w-4 text-cyan-400" />
                Deterministic Scenario Simulator
              </span>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Service Name</label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
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
                      <option value="memory_leak">Memory Leak</option>
                      <option value="cpu_saturation">CPU Saturation</option>
                      <option value="traffic_spike">Traffic Spike</option>
                      <option value="db_pressure">DB Pool Exhaustion</option>
                      <option value="normal">Normal Baseline</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Duration (Min)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Seed</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-4 py-2.5 rounded-lg text-xs transition disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Scenario Telemetry"}
                </button>
              </form>

              {genSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs">
                  {genSuccess}
                </div>
              )}
            </div>

            {/* CSV Uploader */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
              <span className="font-semibold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                Validated CSV Telemetry Upload
              </span>

              <div className="text-xs text-slate-400 space-y-2">
                <p>Required columns: timestamp, service, metric, value, unit</p>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload-input"
                />
                <label
                  htmlFor="csv-upload-input"
                  className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-slate-950/40 hover:bg-slate-900/50 transition"
                >
                  <Upload className={`h-6 w-6 text-slate-400 ${uploading ? "animate-bounce" : ""}`} />
                  <span className="text-xs font-medium text-slate-300">
                    {uploading ? "Validating & Uploading..." : "Click to select CSV telemetry file"}
                  </span>
                </label>
              </div>

              {uploadSummary && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs">
                  Imported {uploadSummary.valid_rows_imported} of {uploadSummary.total_rows_read} rows.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Roadmap Milestones */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              Roadmap Status (All 10 Phases)
            </h3>
            <span className="text-xs text-cyan-400 font-mono font-semibold">Phases 0 - 8 Complete</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Phase 0 — Workspace & Architecture
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Phase 1 — Working Foundation (FastAPI & Next.js)
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Phase 2 — Telemetry Pipeline (Synthetic & CSV)
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Phase 3 — Predictive Engine (Forecasts & Anomalies)
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Phase 4 — Risk Intelligence (Time-to-Breach)
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Phase 5 — Operational Context & Topology
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Phase 6 — Frontend Command Centre (Enterprise Tabs)
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Phase 7 — AI Investigator & What-If Simulator
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Phase 8 — Model Evaluation Lab (Backtesting)
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-cyan-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              Phase 9 & 10 — Hardening & Production Containerization
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            PrognosysAI • Enterprise Predictive Infrastructure Intelligence Platform
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            Strict Architecture Enforced • Zero LLM Number Fabrication
          </div>
        </div>
      </footer>
    </div>
  );
}
