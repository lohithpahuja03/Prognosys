# PrognosysAI — Engineering Roadmap

This document outlines the strict phase-by-phase development lifecycle for PrognosysAI. Each phase represents a discrete, verifiable milestone that must satisfy its acceptance criteria before marking with a green checkmark (✅) and seeking user approval to advance.

---

## Phase Overview

- [x] **Phase 0 — Workspace & Architecture** (✅ COMPLETED)
- [ ] **Phase 1 — Working Foundation** (⬜ Not Started)
- [ ] **Phase 2 — Telemetry Pipeline** (⬜ Not Started)
- [ ] **Phase 3 — Predictive Engine** (⬜ Not Started)
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
**Status:** ⬜ Not Started  
**Objective:** Stand up the FastAPI backend and Next.js frontend, establish database connectivity and migrations with SQLAlchemy and Alembic, configure Docker Compose, and verify cross-service health checks.  
**Deliverables:**
- [ ] FastAPI backend structure (`app/api`, `app/core`, `app/models`, `app/schemas`, `app/services`).
- [ ] SQLAlchemy database engine with PostgreSQL configuration and SQLite dev fallback.
- [ ] Alembic migration environment initialized.
- [ ] Docker Compose setup for local orchestration.
- [ ] Next.js 14+ App Router frontend foundation with Tailwind CSS and TypeScript.
- [ ] Validated backend health check API (`/api/v1/health`) and frontend status verification.  
**Acceptance Criteria:** Frontend runs, backend runs, database connects, migration executes, and frontend communicates with backend over validated API.

---

### Phase 2 — Telemetry Pipeline
**Status:** ⬜ Not Started  
**Objective:** Build high-throughput, validated telemetry ingestion supporting synthetic generation, CSV import, and REST API ingestion.  
**Deliverables:**
- [ ] Service and metric definition database models with foreign keys and indexes.
- [ ] Synthetic telemetry generator simulating realistic patterns (CPU spikes, memory leaks, steady load).
- [ ] Validated CSV telemetry ingestion engine with format, timestamp, and anomaly checks.
- [ ] REST API endpoints for real-time metric point submission.
- [ ] Service inventory and metric catalog APIs.  
**Acceptance Criteria:** User can generate synthetic telemetry, upload CSV telemetry, persist observations, and query historical time-series data with pagination and filtering.

---

### Phase 3 — Predictive Engine
**Status:** ⬜ Not Started  
**Objective:** Implement genuine mathematical and statistical time-series forecasting algorithms and anomaly detection engines.  
**Deliverables:**
- [ ] Base forecasting interface and abstract model lifecycle.
- [ ] Baseline persistence forecasting model ($y_{t+h} = y_t$).
- [ ] Statistical forecasting models (Exponential Smoothing / Holt-Winters, Linear Trend Regression).
- [ ] Multi-horizon forecasting support (15 min, 30 min, 60 min).
- [ ] Anomaly detection engine (Statistical Rolling Z-Score and scikit-learn Isolation Forest).
- [ ] Forecast and anomaly API endpoints with uncertainty bounds.  
**Acceptance Criteria:** User selects a service, metric, and forecast horizon to receive genuine model predictions and anomaly scores with zero LLM fabrication.

---

### Phase 4 — Risk Intelligence
**Status:** ⬜ Not Started  
**Objective:** Calculate capacity risk scores, evaluate threshold breaches, estimate time-to-breach, and determine operational states.  
**Deliverables:**
- [ ] Configurable threshold engine (Warning and Critical limits per metric).
- [ ] Capacity breach trajectory analysis.
- [ ] Time-to-breach calculation with statistical confidence gating.
- [ ] Multi-factor risk scoring engine assigning states (`NORMAL`, `WATCH`, `ELEVATED`, `CRITICAL`, `INSUFFICIENT_DATA`).
- [ ] Risk assessment APIs and historical risk audit logging.  
**Acceptance Criteria:** System accurately classifies risk states and predicts time-to-breach when trends reliably point toward threshold violation.

---

### Phase 5 — Operational Context
**Status:** ⬜ Not Started  
**Objective:** Integrate operational events (deployments, config updates, incidents) with telemetry and map basic service dependencies.  
**Deliverables:**
- [ ] Operational event persistence and API ingestion.
- [ ] Temporal correlation engine aligning metric anomalies and risk state changes with operational events.
- [ ] Evidence-based correlation builder respecting the principle that correlation is not causation.
- [ ] Service dependency topology model (e.g., Web App -> API -> DB / Queue -> Worker).  
**Acceptance Criteria:** Telemetry trends, forecast warnings, and deployment/operational events are displayed together in a unified chronological view.

---

### Phase 6 — Frontend Command Centre
**Status:** ⬜ Not Started  
**Objective:** Develop the complete responsive enterprise UI command centre.  
**Deliverables:**
- [ ] Enterprise landing page explaining core value proposition and architecture.
- [ ] Infrastructure command dashboard with active risks, system health, and freshness indicators.
- [ ] Metrics Explorer with interactive Recharts visualizations (observed vs predicted with confidence intervals).
- [ ] Anomaly & Risk management views with service drill-downs.
- [ ] Service topology and event timeline viewer.  
**Acceptance Criteria:** Primary SRE workflows are operable entirely through an accessible, responsive, dark-navy enterprise interface.

---

### Phase 7 — AI Investigator & What-if Simulator
**Status:** ⬜ Not Started  
**Objective:** Build the grounded AI explanation engine and read-only decision-support simulator.  
**Deliverables:**
- [ ] Provider-agnostic AI Investigator service with strict grounding in structured backend outputs.
- [ ] Deterministic fallback explanation engine when LLM credentials are absent.
- [ ] Read-only What-if Simulator (e.g., replica scaling, traffic reduction, capacity increases).
- [ ] Scenario comparison metrics with explicit assumptions and trade-offs.  
**Acceptance Criteria:** AI explanations accurately describe backend metrics without hallucinating numbers; simulator provides read-only capacity impact projections.

---

### Phase 8 — Model Evaluation Lab
**Status:** ⬜ Not Started  
**Objective:** Measure empirical predictive accuracy against baselines and quantify alert reliability.  
**Deliverables:**
- [ ] Chronological cross-validation engine preventing temporal data leakage.
- [ ] Comparative metric suite (MAE, RMSE, MAPE, Forecast Bias vs Persistence Baseline).
- [ ] Alerting performance quantification (Precision, Recall, Lead Time to Incident).
- [ ] Evaluation experiment storage and comparative UI reporting.  
**Acceptance Criteria:** System quantifies and proves whether the predictive models outperform simple baselines on historical and synthetic test suites.

---

### Phase 9 — Hardening & Security
**Status:** ⬜ Not Started  
**Objective:** Conduct security audits, input validation hardening, edge case handling, and end-to-end integration testing.  
**Deliverables:**
- [ ] Comprehensive CSV and API input validation security checks.
- [ ] Rate limiting, CORS policies, and secure error masking.
- [ ] Automated end-to-end integration test suite (Telemetry -> Forecast -> Risk -> UI).
- [ ] Performance profiling and query optimization.  
**Acceptance Criteria:** Test suite passes with full branch coverage on critical engines; zero high-severity vulnerabilities.

---

### Phase 10 — Deployment & Portfolio Readiness
**Status:** ⬜ Not Started  
**Objective:** Production build packaging, Docker containerization, CI/CD pipeline, and complete deployment guide.  
**Deliverables:**
- [ ] Production-optimized Dockerfiles for frontend and backend.
- [ ] Multi-container Docker Compose production setup.
- [ ] GitHub Actions CI pipeline for automated testing and linting.
- [ ] Final user manual and verified demonstration scripts.  
**Acceptance Criteria:** Single-command local startup via Docker Compose; automated CI pass on GitHub; reproducible from clean clone.
