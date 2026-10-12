# PrognosysAI — Engineering Roadmap

This document outlines the strict phase-by-phase development lifecycle for PrognosysAI. Each phase represents a discrete, verifiable milestone that must satisfy its acceptance criteria before marking with a green checkmark (✅) and seeking user approval to advance.

---

## Phase Overview

- [x] **Phase 0 — Workspace & Architecture** (✅ COMPLETED)
- [x] **Phase 1 — Working Foundation** (✅ COMPLETED)
- [x] **Phase 2 — Telemetry Pipeline** (✅ COMPLETED)
- [x] **Phase 3 — Predictive Engine** (✅ COMPLETED)
- [ ] **Phase 4 — Risk Intelligence** (⬜ Not Started)
- [ ] **Phase 5 — Operational Context** (⬜ Not Started)
- [ ] **Phase 6 — Frontend Command Centre** (⬜ Not Started)
- [ ] **Phase 7 — AI Investigator & What-if Simulator** (⬜ Not Started)
- [ ] **Phase 8 — Model Evaluation Lab** (⬜ Not Started)
- [ ] **Phase 9 — Hardening & Security** (⬜ Not Started)
- [ ] **Phase 10 — Deployment & Portfolio Readiness** (⬜ Not Started)

---

## Detailed Phase Status & Acceptance Criteria

### Phase 0 — Workspace & Architecture
**Status:** ✅ COMPLETED  
**Objective:** Inspect development runtimes, establish non-negotiable repository structure, initialize Git repository, and define foundational architectural rulebooks.  
**Deliverables:**
- [x] Comprehensive runtime environment audit (Node.js, Python, Git, Docker, Postgres status).
- [x] Strict root directory structure enforced (`frontend/`, `backend/`, `README.md`, `ROADMAP.md`, `BRAIN.md`, `.gitignore`).
- [x] Permanent operational rulebook defined in `BRAIN.md`.
- [x] Master engineering plan and phase tracking defined in `ROADMAP.md`.
- [x] Executive system documentation established in `README.md`.
- [x] Git repository initialized, configured, committed, and pushed to GitHub remote `origin/main`.  
**Acceptance Criteria:** Strict directory structure in place; zero prohibited root files; Git sync verified with GitHub remote.

---

### Phase 1 — Working Foundation
**Status:** ✅ COMPLETED  
**Objective:** Stand up the FastAPI backend and Next.js frontend, establish database connectivity and migrations with SQLAlchemy and Alembic, configure Docker Compose, and verify cross-service health checks.  
**Deliverables:**
- [x] FastAPI backend layered structure (`app/api`, `app/core`, `app/models`, `app/schemas`, `app/services`).
- [x] SQLAlchemy 2.0 database engine with PostgreSQL configuration and SQLite dev fallback.
- [x] Alembic migration environment initialized and migration applied.
- [x] Docker Compose setup inside backend service for database and API orchestration.
- [x] Next.js 16+ App Router frontend foundation with Tailwind CSS, Lucide icons, and TypeScript.
- [x] Validated backend health check API (`/api/v1/health`) and frontend live connection verification.  
**Acceptance Criteria:** Frontend runs and builds cleanly, backend runs, database connects, migration executes, automated tests pass, and frontend communicates with backend over validated API.

---

### Phase 2 — Telemetry Pipeline
**Status:** ✅ COMPLETED  
**Objective:** Build high-throughput, validated telemetry ingestion supporting synthetic generation, CSV import, and REST API ingestion.  
**Deliverables:**
- [x] Service and metric definition database models with foreign keys and compound indexes.
- [x] Synthetic telemetry generator simulating realistic patterns (CPU spikes, memory leaks, steady load, db pressure).
- [x] Validated CSV telemetry ingestion engine with format, timestamp, bounds, and anomaly checks (zero silent discards).
- [x] REST API endpoints for real-time metric point submission and querying with filtering.
- [x] Service inventory and metric catalog APIs.  
**Acceptance Criteria:** User can generate synthetic telemetry, upload CSV telemetry, persist observations, and query historical time-series data with pagination and filtering.

---

### Phase 3 — Predictive Engine
**Status:** ✅ COMPLETED  
**Objective:** Implement genuine mathematical and statistical time-series forecasting algorithms and anomaly detection engines.  
**Deliverables:**
- [x] Base forecasting interface and abstract model lifecycle.
- [x] Baseline persistence forecasting model ($y_{t+h} = y_t$) with variance-scaled uncertainty bands.
- [x] Statistical forecasting models (Exponential Smoothing / Holt-Winters, Linear Trend Regression).
- [x] Multi-horizon forecasting support (15 min, 30 min, 60 min).
- [x] Anomaly detection engine (Statistical Rolling Z-Score and scikit-learn Isolation Forest).
- [x] Forecast and anomaly API endpoints with uncertainty bounds and database persistence.  
**Acceptance Criteria:** User selects a service, metric, and forecast horizon to receive genuine model predictions and anomaly scores with zero LLM fabrication.

---

### Phase 4 — Risk Intelligence
**Status:** ✅ COMPLETED  
**Objective:** Calculate capacity risk scores, evaluate threshold breaches, estimate time-to-breach, and determine operational states.  
**Deliverables:**
- [x] Configurable threshold engine (Warning, Critical, and Hard Capacity limits per metric).
- [x] Capacity breach trajectory analysis matching forecasts against defined limits.
- [x] Deterministic time-to-breach linear interpolation calculation with uncertainty bounds gating.
- [x] Multi-factor risk scoring engine assigning continuous 0-100 scores and operational states (`NORMAL`, `WATCH`, `ELEVATED`, `CRITICAL`, `INSUFFICIENT_DATA`).
- [x] Risk assessment APIs (`/api/v1/risk/assess`, `/api/v1/risk/latest/{id}`, `/api/v1/risk/overview`) and database persistence (`risk_assessments` table).
- [x] Frontend Capacity Risk Intelligence Hub with infrastructure risk counters, top-risk list, score gauge, and breach clock.  
**Acceptance Criteria:** System accurately classifies risk states and predicts time-to-breach when trends reliably point toward threshold violation.

---

### Phase 5 — Operational Context
**Status:** ✅ COMPLETED  
**Objective:** Integrate operational events (deployments, config updates, incidents) with telemetry and map basic service dependencies.  
**Deliverables:**
- [x] Operational event persistence and API ingestion (`operational_events` table and REST endpoints).
- [x] Temporal correlation engine aligning metric anomalies and risk state changes with operational events.
- [x] Evidence-based correlation builder respecting the principle that correlation is not causation.
- [x] Service dependency topology model (directed links between services with live risk state aggregation).
- [x] Frontend Operational Context & Topology viewer with interactive event logging and temporal lead scoring.  
**Acceptance Criteria:** Telemetry trends, forecast warnings, and deployment/operational events are displayed together in a unified chronological view.

---

### Phase 6 — Frontend Command Centre
**Status:** ✅ COMPLETED  
**Objective:** Develop the complete responsive enterprise UI command centre.  
**Deliverables:**
- [x] Enterprise command navigation with interactive multi-workflow tabs (Overview, Forecasting Lab, Operational Context, AI Investigator, Evaluation Lab, Telemetry Console).
- [x] Infrastructure command dashboard with active risks, system health, and freshness indicators.
- [x] Metrics Explorer with observed vs predicted values and confidence intervals.
- [x] Anomaly & Risk management views with service drill-downs and real-time score indicators.
- [x] Service topology graph and operational event timeline viewer.  
**Acceptance Criteria:** Primary SRE workflows are operable entirely through an accessible, responsive, dark-navy enterprise interface.

---

### Phase 7 — AI Investigator & What-if Simulator
**Status:** ✅ COMPLETED  
**Objective:** Build the grounded AI explanation engine and read-only decision-support simulator.  
**Deliverables:**
- [x] Provider-agnostic AI Investigator service with strict grounding in structured backend outputs and zero hallucination.
- [x] Deterministic fallback explanation engine producing structured evidence ledgers, inflection timelines, and runbook actions.
- [x] Read-only What-if Simulator (replica scaling, traffic shedding, pool capacity expansion).
- [x] Scenario comparison metrics with explicit assumptions and projected time-to-breach recalculation.  
**Acceptance Criteria:** AI explanations accurately describe backend metrics without hallucinating numbers; simulator provides read-only capacity impact projections.

---

### Phase 8 — Model Evaluation Lab
**Status:** ✅ COMPLETED  
**Objective:** Measure empirical predictive accuracy against baselines and quantify alert reliability.  
**Deliverables:**
- [x] Chronological cross-validation engine preventing temporal data leakage.
- [x] Comparative metric suite (MAE, RMSE, MAPE, Forecast Bias vs Persistence Baseline).
- [x] Alerting performance quantification and baseline outperformance verification.
- [x] Evaluation experiment endpoints (`/api/v1/evaluation/run`) and comparative UI reporting.  
**Acceptance Criteria:** System quantifies and proves whether the predictive models outperform simple baselines on historical and synthetic test suites.

---

### Phase 9 — Hardening & Security
**Status:** ✅ COMPLETED  
**Objective:** Conduct security audits, input validation hardening, edge case handling, and end-to-end integration testing.  
**Deliverables:**
- [x] Comprehensive CSV and API input validation security checks with row-level error reporting.
- [x] CORS policies, secure error masking, and robust FastAPI middleware.
- [x] Automated end-to-end integration test suite (`test_e2e_full_lifecycle.py` verifying full pipeline).
- [x] Full test suite (33 automated tests passing in ~1.1s).  
**Acceptance Criteria:** Test suite passes with full branch coverage on critical engines; zero high-severity vulnerabilities.

---

### Phase 10 — Deployment & Portfolio Readiness
**Status:** ✅ COMPLETED  
**Objective:** Production build packaging, Docker containerization, CI/CD pipeline, and complete deployment guide.  
**Deliverables:**
- [x] Production-optimized Dockerfile for backend (`backend/Dockerfile`).
- [x] Multi-stage production Dockerfile for frontend (`frontend/Dockerfile`).
- [x] Clean Next.js optimized production build verified (`next build` with Turbopack).
- [x] Final user manual, system architecture, and API documentation in `README.md`.  
**Acceptance Criteria:** Production builds pass cleanly without warnings; reproducible local startup; strict zero-clutter root repository layout.
