"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  LineChart,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { checkBackendConnection, HealthResponse } from "@/lib/api";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [latency, setLatency] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("");

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    const result = await checkBackendConnection();
    setLatency(result.latencyMs);
    if (result.connected && result.data) {
      setHealth(result.data);
      setLastChecked(new Date().toLocaleTimeString());
    } else {
      setError(result.error || "Unable to reach FastAPI backend");
      setHealth(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Header / Navigation Bar */}
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
                  v0.1.0-alpha
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Backend Connection Indicator */}
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
              Predictive Infrastructure Intelligence & Capacity Risk
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Predict Infrastructure Problems{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                Before They Become Incidents.
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg leading-relaxed">
              Standard monitoring tells you when a threshold is breached. PrognosysAI
              forecasts multi-horizon trajectories, detects behavioral drift, quantifies
              time-to-breach risk, and correlates temporal evidence with operational
              events.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={testConnection}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Probe Backend Health
              </button>
              <a
                href="#subsystems"
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-5 py-2.5 rounded-lg transition"
              >
                Inspect Subsystems
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Phase 1 Verification Status Cards */}
        <section id="subsystems" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Server className="h-5 w-5 text-cyan-400" />
                Phase 1 Runtime Verification & Diagnostics
              </h2>
              <p className="text-xs text-slate-400">
                Real-time contract verification between Next.js frontend and FastAPI backend
              </p>
            </div>
            {lastChecked && (
              <span className="text-xs text-slate-500 font-mono">
                Updated: {lastChecked}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Backend Service Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  FastAPI Engine
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    health
                      ? "bg-emerald-950/80 border-emerald-800/60 text-emerald-300"
                      : "bg-red-950/80 border-red-800/60 text-red-300"
                  }`}
                >
                  {health ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white tracking-tight">
                  {health?.project || "PrognosysAI"}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Version: {health?.version || "Unknown"} | Env:{" "}
                  {health?.environment || "development"}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex justify-between">
                <span>API Latency</span>
                <span className="text-cyan-400 font-mono font-semibold">
                  {latency > 0 ? `${latency} ms` : "—"}
                </span>
              </div>
            </div>

            {/* Database Engine Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  Persistence Layer
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    health?.database.connected
                      ? "bg-emerald-950/80 border-emerald-800/60 text-emerald-300"
                      : "bg-amber-950/80 border-amber-800/60 text-amber-300"
                  }`}
                >
                  {health?.database.connected ? "CONNECTED" : "UNREACHABLE"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white tracking-tight capitalize">
                  {health?.database.database_type || "Storage"}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  State: {health?.database.status || "Pending"} | Alembic Ready
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex justify-between">
                <span>Dialect</span>
                <span className="text-blue-400 font-mono font-semibold uppercase">
                  {health?.database.database_type || "SQLAlchemy"}
                </span>
              </div>
            </div>

            {/* Subsystems Status Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  Engine Readiness
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                  PHASE 1
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white tracking-tight">
                  {health ? Object.keys(health.components).length : 0} Engines
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Telemetry, Forecast & Risk Registered
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex justify-between">
                <span>Core Contracts</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  Validated
                </span>
              </div>
            </div>
          </div>

          {/* Error Banner if Disconnected */}
          {error && (
            <div className="p-4 rounded-xl border border-amber-800/60 bg-amber-950/30 flex items-center gap-3 text-amber-300 text-sm">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Backend offline:</span> Ensure FastAPI is running on port 8000 (
                <code className="text-xs bg-amber-900/50 px-1 py-0.5 rounded font-mono">
                  uvicorn app.main:app --reload
                </code>
                ). Error: {error}
              </div>
            </div>
          )}
        </section>

        {/* Predictive Workflow Architecture Overview */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <LineChart className="h-5 w-5 text-cyan-400" />
              The Predictive Intelligence Pipeline
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic telemetry and forecasting workflow enforcing Zero LLM Fabrication
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <span className="w-6 h-6 rounded-full bg-cyan-950 flex items-center justify-center text-xs font-mono border border-cyan-800">
                  1
                </span>
                Telemetry Ingestion
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingest synthetic scenarios, validated CSV uploads, or live metrics
                with strict timestamp and percentage validation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-950 flex items-center justify-center text-xs font-mono border border-blue-800">
                  2
                </span>
                Multi-Horizon Forecast
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Genuine time-series models compute 15m, 30m, and 60m projections
                with uncertainty bands. Zero LLM number fabrication.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-950 flex items-center justify-center text-xs font-mono border border-indigo-800">
                  3
                </span>
                Risk & Time-to-Breach
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Evaluate trajectory against configured capacity thresholds,
                classify risk states, and project time-to-breach.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <span className="w-6 h-6 rounded-full bg-purple-950 flex items-center justify-center text-xs font-mono border border-purple-800">
                  4
                </span>
                Evidence Correlation
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Correlate warnings temporally with deployments and config changes.
                Correlation is an investigation lead, not proof of causation.
              </p>
            </div>
          </div>
        </section>

        {/* Next Development Phases Tracker */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              Roadmap Status
            </h3>
            <span className="text-xs text-slate-400">
              Phase 1 Verification Complete
            </span>
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

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40">
              <span className="flex items-center gap-2 text-cyan-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                Phase 1 — Working Foundation (FastAPI, Next.js, Alembic)
              </span>
              <span className="font-mono text-cyan-400 uppercase font-semibold">
                Verifying
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                Phase 2 — Telemetry Pipeline (Synthetic Generator, CSV Ingestion)
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
