# PrognosysAI

> **Predictive Infrastructure Intelligence & Capacity Risk Platform**  
> *Monitor what is happening. Predict what may happen next. Understand the evidence. Prepare before the incident.*

[![GitHub Repository](https://img.shields.io/badge/GitHub-lohithpahuja03%2FPrognosys-blue?logo=github)](https://github.com/lohithpahuja03/Prognosys)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20Separation-brightgreen)](#7-system-architecture)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. What is PrognosysAI?

**PrognosysAI** is an AI-powered predictive infrastructure intelligence platform designed to forecast potential cloud infrastructure and capacity issues before configured critical thresholds are breached.

Instead of merely alerting SREs after a system degradation or outage has occurred, PrognosysAI ingests time-series telemetry (CPU, memory, database connections, disk usage, queue depth, latency, and traffic), computes multi-horizon statistical and machine learning forecasts, detects abnormal behavioral drift, estimates capacity risk and time-to-threshold breach, and correlates warnings with recent operational events (such as software deployments and traffic shifts).

---

## 2. What Problem Does It Solve?

Traditional monitoring systems (such as Prometheus, Datadog, or Grafana alerts) predominantly operate on **reactive static threshold evaluation**:
- They trigger an alert when a metric *crosses* 90% utilization.
- By the time an on-call engineer receives a pager notification, the service is often already experiencing cascading degradation, queue saturation, or latency spikes.
- Engineers are forced to scramble in high-stress firefighting mode, attempting to deduce when the trend began and whether a recent code deployment or configuration change was temporally related.

**PrognosysAI shifts operations from reactive firefighting to predictive intervention.** If memory utilization is climbing at 78% following a deployment and mathematically projected to breach the 90% threshold in 25 minutes, PrognosysAI sounds an early warning with contextual evidence, giving engineering teams a 25-minute window to investigate, scale capacity, or roll back safely.

---

## 3. Who Can Use It?

PrognosysAI is purpose-built for:
- **Site Reliability Engineers (SREs):** To detect capacity exhaustion before SLO breaches occur.
- **DevOps & Platform Engineers:** To monitor deployment blast radius and assess resource sizing.
- **Cloud Infrastructure Engineers:** To optimize cloud capacity and right-size cluster resources based on forecasted demand.
- **Infrastructure Operations Teams:** To triage emerging incidents with structured, evidence-grounded investigation guidance.

---

## 4. Why This Problem Matters

1. **Outage Cost & Downtime Prevention:** Infrastructure failures frequently stem from slow, cumulative resource exhaustion (e.g., memory leaks, database connection pool exhaustion, uncollected disk caches) rather than sudden instant drops.
2. **Mean Time to Detect (MTTD) & Lead Time:** Providing a 15-to-60-minute predictive lead time allows teams to avert customer-facing downtime altogether.
3. **Alert Fatigue Reduction:** By distinguishing between harmless transient spikes and persistent trajectory drift approaching critical thresholds, alert noise is substantially reduced.

---

## 5. How PrognosysAI Works

The end-to-end operational pipeline follows eight distinct stages:

```text
Telemetry Ingestion
       ↓
Data Validation & Cleaning
       ↓
Time-Series Forecasting (15m / 30m / 60m horizons)
       ↓
Anomaly Detection (Z-Score & Isolation Forest)
       ↓
Capacity Risk & Time-to-Breach Engine
       ↓
Operational Event Correlation (Deployments & Config changes)
       ↓
AI Investigator (Structured Evidence & Synthesis)
       ↓
What-if Response Simulation (Read-only scenario analysis)
       ↓
Empirical Model Evaluation (vs. Baselines)
```

---

## 6. PrognosysAI vs. Conventional Monitoring

| Capability | Conventional Monitoring (Prometheus/Grafana) | PrognosysAI |
| :--- | :--- | :--- |
| **Alerting Paradigm** | Reactive (Triggers *after* threshold is breached) | Predictive (Triggers *before* threshold is breached) |
| **Operational Warning** | "Memory is at 91% (CRITICAL ALERT)" | "Memory is at 78%, predicted to breach 90% in 25 min" |
| **Forward Visibility** | 0 minutes (Current state only) | 15 min, 30 min, and 60 min forecast horizons |
| **Event Context** | Disconnected graphs in separate dashboards | Temporal alignment with deployments and configuration changes |
| **Root Cause Language** | Static threshold alert rules | Clear distinction: correlation is an investigation lead, not proof of causation |
| **Validation Layer** | Relies on manual dashboard inspection | Empirical Model Evaluation Lab measuring MAE/RMSE and lead time |
| **Decision Support** | Manual engineer guesswork | Read-only What-if Simulation comparing mitigation scenarios |

---

## 7. System Architecture

PrognosysAI enforces a strict architectural separation of concerns between frontend, backend, and machine learning components:

```text
┌────────────────────────────────────────────────────────┐
│                   Next.js Frontend                     │
│  (Landing Page, Infrastructure Command Centre, Charts) │
└──────────────────────────┬─────────────────────────────┘
                           │ Validated REST APIs (JSON)
┌──────────────────────────▼─────────────────────────────┐
│                    FastAPI Backend                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ API Routes & Pydantic v2 Validation Schemas      │  │
│  └───────────────────────┬──────────────────────────┘  │
│  ┌───────────────────────▼──────────────────────────┐  │
│  │ Business Services & Domain Logic                 │  │
│  │  • Telemetry Ingestion (Synthetic, CSV, API)     │  │
│  │  • Forecasting Engine (Persistence, Exponential) │  │
│  │  • Anomaly Engine (Rolling Z-Score, Isolation)   │  │
│  │  • Risk Engine (States, Time-to-Breach)          │  │
│  │  • Event Correlation (Temporal Alignment)        │  │
│  │  • AI Investigator (Grounded Evidence Generator) │  │
│  │  • What-if Simulator (Read-Only Capacity Model)  │  │
│  │  • Model Evaluation Lab (Chronological Splits)   │  │
│  └───────────────────────┬──────────────────────────┘  │
│  ┌───────────────────────▼──────────────────────────┐  │
│  │ SQLAlchemy ORM & Alembic Migrations              │  │
│  └───────────────────────┬──────────────────────────┘  │
└──────────────────────────┼─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│             PostgreSQL Database / SQLite Dev            │
│  (Services, Metrics, Events, Forecasts, Risk Logs)     │
└────────────────────────────────────────────────────────┘
```

---

## 8. Technology Stack

- **Frontend:**
  - Next.js (React 19 / App Router)
  - TypeScript
  - Tailwind CSS
  - Recharts (Time-series observed vs. predicted charts)
  - Lucide Icons
- **Backend:**
  - Python 3.12+ (tested on Python 3.14)
  - FastAPI
  - Pydantic v2
  - SQLAlchemy 2.0 (ORM)
  - Alembic (Database migrations)
  - Pandas & NumPy (Time-series wrangling)
  - scikit-learn & Statsmodels (Forecasting & anomaly detection)
- **Database & Storage:**
  - PostgreSQL (Primary production target)
  - SQLite (Local development and automated test runner fallback)
- **Orchestration & Tooling:**
  - Docker & Docker Compose
  - Git & GitHub CLI

---

## 9. Installation & Prerequisites

### Prerequisites
- **Node.js:** v18.0.0 or later (v24+ recommended)
- **Python:** v3.11 or later
- **Git:** v2.30+
- **Docker Desktop** (optional for containerized setup)

### Clone the Repository
```bash
git clone https://github.com/lohithpahuja03/Prognosys.git
cd Prognosys
```

---

## 10. Configuration & Environment Variables

Copy template environment variables inside the backend and frontend modules:

### Backend Configuration (`backend/.env`):
```ini
ENVIRONMENT=development
PORT=8000
DATABASE_URL=sqlite:///./prognosys.db
# For PostgreSQL: postgresql+psycopg2://postgres:postgres@localhost:5432/prognosys
CORS_ORIGINS=["http://localhost:3000"]
OPENAI_API_KEY="" # Optional: Falls back to deterministic templates if omitted
```

### Frontend Configuration (`frontend/.env.local`):
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 11. Running Frontend & Backend

### 1. Backend Setup:
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` to access the application.

---

## 12. Database Setup

Database migrations are managed via Alembic:
```bash
cd backend
alembic upgrade head
```

---

## 13. Telemetry Ingestion (Synthetic & CSV)

PrognosysAI supports three telemetry ingestion channels:
1. **Synthetic Telemetry Generator:** Generate reproducible, seed-based datasets simulating realistic traffic spikes, memory leaks, and steady-state patterns for experimentation.
2. **CSV Import:** Upload infrastructure logs and time-series metrics with strict schema, timestamp, and anomaly validation.
3. **REST API Ingestion:** Direct programmatic streaming of infrastructure metrics into `/api/v1/telemetry/ingest`.

---

## 14. Forecasting & Anomaly Detection

- Forecasts are generated across **15-minute, 30-minute, and 60-minute** horizons.
- Baseline models include **Persistence Forecasting** ($y_{t+h} = y_t$) and **Exponential Smoothing**.
- Anomaly detection utilizes rolling statistical Z-scores and Isolation Forests to flag unexpected deviations without generating false alarm storms.

---

## 15. Capacity Risk & Operational Correlation

Monitored resources are categorized into five distinct risk states:
- `NORMAL` | `WATCH` | `ELEVATED` | `CRITICAL` | `INSUFFICIENT_DATA`

Warnings include calculated time-to-threshold breach when mathematically defensible and display temporally adjacent operational events (such as recent software deployments).

> **Core Principle:** Temporal correlation is an investigation lead, **never** definitive proof of causation.

---

## 16. AI Investigator & What-if Simulator

- **AI Investigator:** Translates structured metric telemetry, forecast deltas, and correlated events into actionable executive summaries. If LLM credentials are not configured, deterministic template engines synthesize the findings seamlessly.
- **What-if Simulator:** A strictly **read-only** decision-support sandbox enabling engineers to evaluate hypothetical mitigations (such as adding replicas or traffic shedding) without modifying live infrastructure.

---

## 17. Model Evaluation Lab

PrognosysAI includes an integrated evaluation framework to verify whether its machine learning models deliver measurable value over simple baselines:
- **Accuracy Metrics:** Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and Forecast Bias.
- **Alert Quality:** Precision, Recall, and Mean Warning Lead Time before threshold breach.
- **Integrity:** Strict chronological splits prevent temporal data leakage.

---

## 18. Testing

Run automated backend and frontend test suites:
```bash
# Backend Tests:
cd backend
pytest -v

# Frontend Tests:
cd frontend
npm test
```

---

## 19. Security & Hardening

- Environment-based secrets management.
- Comprehensive CSV file-size limits, MIME checks, and row validation.
- Strict CORS policies and sanitized error responses.
- No execution of AI-generated shell commands or direct cluster mutations.

---

## 20. Current Limitations & Project Status

- **Current Stage:** Phases 0 through 5 (Workspace & Architecture, Working Foundation, Telemetry Pipeline, Predictive Engine, Capacity Risk Intelligence, and Operational Context & Topology) complete.
- **Runtime Foundations:** 
  - FastAPI backend operational with layered architecture (`core`, `api/v1`, `models`, `schemas`, `services`), CORS middleware, and dynamic health probes (`/api/v1/health`).
  - Database connectivity active via SQLAlchemy 2.0 with PostgreSQL production readiness and automatic SQLite local development fallback. Initial schema, telemetry, predictive engine, risk assessment, and operational context migrations executed via Alembic.
  - Next.js 16+ App Router frontend operational with TypeScript, Tailwind CSS, Lucide icons, and real-time backend contract verification.
- **Telemetry Pipeline Active:**
  - Relational time-series tables (`services`, `metric_definitions`, `metric_observations`) with compound indexing.
  - Deterministic synthetic generator with random seed support for reproducible benchmark scenarios (`memory_leak`, `cpu_saturation`, `traffic_spike`, `db_pressure`, `normal`).
  - Validated CSV ingestion with strict error collection (zero silent discards) and REST observation APIs.
- **Predictive Engine Active:**
  - Genuine multi-horizon forecasting models (Persistence baseline $y_{t+h} = y_t$, Double Exponential Smoothing / Holt Linear trend, Linear Trend regression) with calibrated 95% uncertainty intervals. Zero LLM number fabrication.
  - Time-series anomaly detectors (Rolling Statistical Z-Score filter and scikit-learn unsupervised Isolation Forest) with normalized scores ($0.0 - 1.0$) and severity classification.
- **Risk Intelligence Active:**
  - Multi-factor capacity risk score ($0.0 - 100.0$) and operational states (`NORMAL`, `WATCH`, `ELEVATED`, `CRITICAL`, `INSUFFICIENT_DATA`).
  - Deterministic time-to-breach linear interpolation projection against warning and critical thresholds.
  - System-wide risk aggregation endpoint (`/api/v1/risk/overview`) and frontend Risk Intelligence Hub with breach countdown clock and top at-risk infrastructure listing.
- **Operational Context Active:**
  - Operational event tracking (deployments, config changes, restarts, incidents).
  - Temporal event correlation engine mapping events to metric inflection points with relevance lead scoring.
  - Directed service dependency topology mapping with real-time risk states.
- **Implementation in Progress:** AI Investigator & What-If Simulator scheduled for Phase 6/7. Refer to [ROADMAP.md](ROADMAP.md) for milestone tracking.

---

## 21. Engineering Roadmap

Detailed milestone tracking is maintained in [ROADMAP.md](ROADMAP.md). Operating rules and engineering standards are maintained in [BRAIN.md](BRAIN.md).
