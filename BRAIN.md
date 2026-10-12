# BRAIN.md — PrognosysAI Master Operating Rulebook

> **Permanent Operating Instructions for Antigravity & Engineering Contributors**  
> *Last Updated: Phase 0 (Workspace & Architecture)*

---

## 1. Project Identity & Core Mission

**Project Name:** PrognosysAI  
**Product Category:** Predictive AIOps / Infrastructure Reliability / Capacity Intelligence  
**Core Mission:** Predict potential infrastructure capacity problems before configured thresholds are breached, detect abnormal behaviour, correlate risks with operational events, and provide evidence-based investigation guidance.  
**Core Philosophy:**  
> *"Monitor what is happening. Predict what may happen next. Understand the evidence. Prepare before the incident."*

PrognosysAI is **not** a basic CRUD application, **not** a decorative dashboard, and **not** a fake AI prototype where an LLM hallucinates numbers or predictions. It is an enterprise-grade predictive infrastructure intelligence platform with genuine backend logic, real statistical and forecasting models, persistent storage, and rigorous evaluation.

---

## 2. Strict Repository Structure & Boundaries

The repository root is strictly constrained to the following layout:

```text
PrognosysAI/
├── frontend/        # Next.js, TypeScript, Tailwind CSS, Recharts
├── backend/         # Python, FastAPI, SQLAlchemy, Alembic, Pandas, scikit-learn
├── README.md        # Comprehensive system documentation & user manual
├── ROADMAP.md       # Development progress and phase tracker
├── BRAIN.md         # Permanent architectural and operational rulebook
└── .gitignore       # Git ignore specifications
```

### Non-Negotiable Boundary Rules:
1. **No Root Clutter:** Absolutely no `docs/`, `scripts/`, `notes/`, `temp/`, `experiments/`, or loose `.md` / `.txt` files at the root.
2. **Consolidated Documentation:** All architectural, mathematical, and algorithmic documentation resides inside `README.md` and `BRAIN.md`.
3. **Internal Organization:** All implementation code, scripts, configurations, and test suites must reside strictly inside `frontend/` or `backend/`.
4. **Approval Required:** Any new root-level file requires explicit user approval before creation.

---

## 3. Architecture & Separation of Concerns

### Frontend Architecture:
- **Framework:** Next.js (App Router), TypeScript, Tailwind CSS, Recharts.
- **Strict Role:** Pure presentation, interactive visualization, and user workflows.
- **Rule 1:** Frontend **never** communicates directly with PostgreSQL or any storage layer.
- **Rule 2:** All state is derived from validated backend REST APIs.
- **Rule 3:** No business or mathematical logic belongs in the frontend.
- **Rule 4:** No fake loading animations, no decorative buttons that do nothing, and no hardcoded mockup metrics.

### Backend Architecture:
The Python backend enforces strict layered separation:
```text
API Routes (FastAPI)
       │
Schemas & Validation (Pydantic v2)
       │
Business Services
       │
├── ML & Forecasting Engines (Persistence, Statistical, ML models)
├── Anomaly Detection Engine (Statistical Z-Score, Isolation Forest)
├── Capacity Risk Engine (Threshold breach, time-to-breach, risk states)
├── Operational Correlation Engine (Deployments, incidents, temporal alignment)
├── What-if Simulator (Read-only scenario impact model)
└── AI Investigator (Grounded synthesis & deterministic templates)
       │
Repositories & Data Access (SQLAlchemy ORM)
       │
Database (PostgreSQL / SQLite development fallback)
```

- **Rule 1:** ML and forecasting logic must **never** be embedded directly in API route handlers.
- **Rule 2:** Database access is strictly handled via SQLAlchemy repositories/services and Alembic migrations.
- **Rule 3:** APIs must strictly validate inputs and outputs with Pydantic schemas.

---

## 4. Machine Learning & Forecasting Principles

1. **Zero LLM Fabrication:**
   - An LLM must **never** invent or forecast infrastructure metrics, capacity percentages, time-to-breach estimates, or anomaly scores.
   - All predictions originate from implemented, reproducible forecasting algorithms (e.g., persistence baseline, exponential smoothing, linear trend models, ARIMA/regression).
2. **Deterministic Fallback:**
   - If an LLM API key is absent, PrognosysAI must produce rich, deterministic, template-driven investigation summaries without failing.
   - The LLM acts solely as an explanation and summarization layer grounded strictly in backend-produced structured evidence.
3. **Temporal Leakage Prevention:**
   - Time-series models must strictly use chronological train/test splits.
   - Future data points must never leak into model training or feature normalization.
4. **Explicit Uncertainty & Limitations:**
   - When historical data is insufficient, stale, or erratic, the system must explicitly emit `INSUFFICIENT_DATA` or display wide confidence bands rather than manufacturing false certainty.

---

## 5. Capacity Risk & Operational Correlation Principles

1. **Capacity Risk States:**
   - `NORMAL`: Well within safe capacity thresholds with flat or healthy trends.
   - `WATCH`: Metric exhibits upward trend or early statistical drift.
   - `ELEVATED`: Metric is forecasted to approach warning/critical thresholds.
   - `CRITICAL`: Imminent breach predicted within the forecast horizon.
   - `INSUFFICIENT_DATA`: History is too short or gaps prevent reliable forecasting.
2. **Time-to-Breach Estimation:**
   - Calculated only when the trajectory has statistical validity. If noisy or oscillating, report "Indeterminate" with explanation.
3. **Correlation is Not Causation:**
   - The system establishes temporal proximity (e.g., "Metric growth accelerated 12 minutes following Deployment v2.4").
   - It must **never** definitively state "Deployment v2.4 caused the memory leak." It presents correlated events as investigative leads.

---

## 6. What-if Response Simulator Principles

1. **Read-Only Decision Support:**
   - The simulator computes mathematical projections of potential mitigation strategies (e.g., scaling replicas, reducing traffic, increasing connection pool size).
2. **Zero Infrastructure Mutation:**
   - The simulator **never** executes commands against live infrastructure, clouds, or clusters.
   - All scenario outcomes must clearly state underlying assumptions and limitations.

---

## 7. Model Evaluation Lab Principles

1. **Continuous Benchmarking:**
   - Every forecasting model must be evaluated against the standard **Persistence Baseline** ($y_{t+h} = y_t$).
2. **Defensible Metrics:**
   - Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and Forecast Bias.
   - Mean Absolute Percentage Error (MAPE) only when denominators are bounded away from zero.
   - Precision, Recall, False Positive Rate, and Mean Warning Lead Time for anomaly and breach alerts.
3. **Honesty Over Optimism:**
   - If evaluation data is insufficient, report: *"Insufficient labelled data for this metric."*

---

## 8. Phase Control Workflow (Mandatory Protocol)

The development process strictly enforces the **COMPLETE → VERIFY → DOCUMENT → COMMIT → PUSH → ASK** protocol:

```text
Complete Current Phase
         ↓
Run Verification Tests & Automated Checks
         ↓
Diagnose and Fix Discovered Issues
         ↓
Update ROADMAP.md (Mark ✅ ONLY if genuinely verified)
         ↓
Update README.md & BRAIN.md (if architecture changed)
         ↓
Review Git Status & Clean Artifacts
         ↓
Git Commit with Meaningful Conventional Message
         ↓
Push to GitHub Origin
         ↓
Present Detailed Report to User (Built, Tested, Limitations)
         ↓
STOP & ASK FOR EXPLICIT PERMISSION BEFORE NEXT PHASE
```

> **CRITICAL RULE:** Under no circumstances should Antigravity proceed to the next phase without explicit user approval.

---

## 9. Git & Commit Guidelines

- **Format:** `feat(phase-X): <description>` or `fix(phase-X): <description>`
- **Cleanliness:** No unneeded files, temporary test logs, or credentials committed.
- **Verification:** Ensure local branch is clean and in sync with `origin/main`.

---

## 10. Error Handling & Resolution Standard

When any error or regression occurs:
1. **Observe:** Capture exact error message, stack trace, and failing input.
2. **Identify:** Pinpoint the exact root cause in the architecture or implementation.
3. **Minimal Correct Fix:** Implement the cleanest architectural fix without monkey-patching or suppressing errors.
4. **Verify:** Re-run the failing test and the full test suite.
5. **No Test Weakening:** Never modify or delete a test simply to make a build pass.

---

## 11. Definition of "Done"

A feature or phase is **DONE** only when:
1. Code is fully implemented with proper architecture and separation of concerns.
2. Input validation and error handling are robust.
3. Automated unit and integration tests pass.
4. It is executed and verified in the runtime environment.
5. Documentation in `README.md` and `ROADMAP.md` accurately describes its verified behavior.
6. Zero fabricated or hardcoded placeholder data is used.
7. Phase commit is pushed to GitHub and approved by the user.
