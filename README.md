# Seafood Compliance Intelligence
## Automated Seafood Export Compliance & Evidence System

> **Capstone Project & Production Reference**  
> An automated cold-chain telemetry, ML risk assessment, store-and-forward resilience, and 1-click audit evidence package generation system for seafood exporters.

---

## 🌟 Key Features

1. **Role-Based Workspaces & Interactive Dashboards**:
   - **Compliance Officer Hub**: Real-time telemetry monitoring, critical temperature alerts, ML risk predictions, and instant Audit Evidence Pack generation.
   - **Transport & Operations Panel**: Fleet tracking, checkpoint route events, custody transfer verification, driver duty safety constraints, and Store & Forward offline simulation.
   - **System Administrator Panel**: System health telemetry, database explorer with pagination & sorting, multi-sheet Excel/CSV exports, threshold sensitivity tuning, and dataset generator (10,000+ relational records).
   - **Manual Compliance Entry**: Operational telemetry aggregator with real database auto-fill, sample demo presets, thermal excursion rule validation, and instant audit generation.
   - **Field Workflow Map**: Complete interactive lifecycle stage visualization linking physical checkpoints to database records.

2. **Scientific Experiment & Benchmark Engine**:
   - **Baseline vs Proposed Benchmark**: Measures manual workflow (~4.2 hrs/shipment across disconnected paper and digital records) vs automated system (<2 sec/shipment), demonstrating dramatic audit preparation time reduction.
   - **Missing Data Experiment**: Evaluates forward-fill temporal imputation with ISO metadata tagging (`is_imputed=1`) at controlled loss rates (1%–50%), maintaining 99.8% evidence completeness with mathematically bounded recovery rates (`0% <= rate <= 100%`).
   - **Noise Filtering Experiment**: Two-pass iterative Hampel filter combining Global-MAD pre-screening (4.0σ breakdown robustness) and centered rolling Hampel outlier suppression (window=7, 3.0σ MAD) on injected synthetic noise spikes (4°C–12°C), achieving high spike recall (≥75%) and suppressing false breach alarms across 1% to 25% noise densities.
   - **Threshold Sensitivity Tuning**: Dynamic trade-off analysis between False Positives (FP) and True Anomaly Recall across thermal excursion offsets (+0.0°C to +4.0°C) with dynamic confusion matrix calculations.
   - **Stakeholder Validation Protocol**: Formal evaluation framework (`/api/validations`, `/api/validations/template`) implementing the Review 2 evaluator directive. Strictly isolates programmatic synthetic survey fixtures from empirical Mock/Real stakeholder evaluations across 7 standardized interview domains.

3. **Production-Grade Resilience & Cryptographic Integrity**:
   - **SHA-256 Evidence Integrity Engine**: Deterministic canonical JSON serialization and 64-character SHA-256 digest calculation for tamper-evident compliance audit packages (`/api/evidence-pack/{batch_id}/verify`).
   - **Store & Forward Resilience**: Handles network outages via local buffering with SHA-256 deduplication and automated restoration sync with item-level error isolation (`/api/store-forward/stress-test`).
   - **Worker Safety Engine**: Hard-blocks unsafe driver duty assignments violating legal hours and minimum rest periods.
   - **Sensor Calibration Verification**: Automated validation of sensor calibration records against ISO 17025-related cold-chain calibration standards.
   - **Liquid Glass & Dual Theme UI**: Complete Dark / Light theme support with accessible contrast and responsive layouts.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (with `venv` support)
- **Node.js 18+** and `npm`

---

### 1. Unified Single-Command Run (Recommended)

From the project root directory:

```bash
# Run with virtual environment Python
.\venv\Scripts\python.exe run.py

# Or on macOS/Linux:
# ./venv/bin/python run.py
```

This starts the unified FastAPI server on port `8001` serving:
- **Web Application & UI**: `http://localhost:8001/`
- **Interactive API Documentation (Swagger)**: `http://localhost:8001/docs`
- **API Health Check**: `http://localhost:8001/api/health`

---

### 2. Manual Backend Setup

```bash
# Navigate to backend directory
cd backend

# Start the FastAPI server (Port 8001)
..\venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8001 --reload
```

---

### 3. Manual Frontend Development Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not installed)
npm install

# Start development server
npm run dev
```

Open the development application at: `http://localhost:5173`

---

### 4. Production Frontend Build

```bash
cd frontend
npm run build
```

This compiles TypeScript and builds optimized static assets to `frontend/dist`. When running `python run.py` or FastAPI on port 8001, the built frontend is automatically served with client-side SPA fallback routes (`/compliance`, `/transport`, `/admin/dashboard`, `/manual-entry`, `/workflow-map`, `/failure-modes`, `/dataset-explorer`, etc.).

---

### 5. Running Automated Tests & Verification

```bash
# Run complete Pytest test suite (142 unit, integration, stress, and cryptographic tests)
.\venv\Scripts\pytest backend\tests\ -v --tb=short

# Run full automated endpoint audit script
.\venv\Scripts\python.exe backend\test_audit.py

# Run standalone experiments suite
.\venv\Scripts\python.exe backend\test_experiments.py
```

---

## 📁 Repository Structure

```
seafood-compliance-system/
├── run.py                    # Root single-command application launcher
├── backend/
│   ├── main.py               # FastAPI REST API & SPA static file router
│   ├── database.py           # SQLite3 schema definition & connection factory
│   ├── data_generator.py     # Relational dataset generator (10,000+ records)
│   ├── ml_engine.py          # Isolation Forest & Random Forest models
│   ├── workload_engine.py    # Driver duty hour & rest safety constraint engine
│   ├── experiments_engine.py # Baseline, missing data, noise & threshold tuning
│   ├── evidence_pack.py      # Unified multi-table Evidence Pack & Audit generator
│   ├── store_forward.py      # Offline buffering & network sync engine
│   ├── manual_entry.py       # Manual compliance entry validation & save pipeline
│   ├── export_csv.py         # CSV export utility
│   ├── test_audit.py         # Full automated backend test & audit suite
│   ├── test_experiments.py   # Full standalone experiments test suite
│   └── seafood_compliance.db # SQLite relational database
├── frontend/
│   ├── src/
│   │   ├── components/       # React views, dashboards, modals, and charts
│   │   ├── config/api.ts     # Centralized API client with environment fallback
│   │   ├── context/          # ToastContext & ThemeContext
│   │   ├── types/index.ts    # TypeScript schemas and data interfaces
│   │   ├── App.tsx           # Main SPA router & navigation state
│   │   └── index.css         # Liquid glass styling, theme tokens & design system
│   ├── package.json
│   └── vite.config.ts
├── dataset_csv/              # Exported relational CSV datasets
├── experiments/              # Jupyter notebook with experimental figures
├── TECHNICAL_DOCUMENTATION.md # Comprehensive technical reference
└── README.md
```

---

## 🎬 Presentation & Demo Script

Follow this sequence for live presentations:

1. **Home / Landing Page** (`/`): Select role (Compliance Officer, Transport & Operations, System Administrator, Manual Entry, or Experiments).
2. **Compliance Officer Dashboard** (`/compliance`):
   - Review live KPIs and sensor health.
   - Inspect active telemetry under *Live Cold Chain*.
   - View *Alerts & Anomaly Log* to showcase thermal breach flags.
   - Click **Generate Evidence Pack** on any batch to display the instant digital audit package and completeness breakdown.
3. **Transport & Operations Panel** (`/transport`):
   - Filter and search active reefer shipments.
   - Test **Refresh** button for real-time fleet synchronization.
   - Open *Driver / Worker Workload* and test safety validation on driver assignments.
   - Open *Store & Forward*, toggle network to **OFFLINE**, demonstrate telemetry buffering, then switch to **ONLINE** and show automated synchronization.
4. **Manual Compliance Entry** (`/manual-entry`):
   - Click **Load Sample Demo Record** to auto-fill verified cold-chain telemetry.
   - Edit temperature to test validation checks.
   - Submit and click **Generate Complete Audit Report** to view the resulting audit modal.
5. **Experiments & Benchmarks** (`/admin/experiments` or `/experiments`):
   - Review *Baseline vs Proposed* benchmark (4.2 hrs vs 1.35 sec).
   - Adjust *Missing Data* slider to show forward-fill recovery.
6. **Field Workflow Map** (`/workflow-map`):
   - Click through lifecycle stages from Fishing Dock to Final Port Import.
7. **Stakeholder Validation & User Feedback** (`/feedback`):
   - Switch between **Stakeholder Validation Sessions** and **Synthetic Test Feedback**.
   - Review the 7-domain interview protocol or record a new session with evidence artifacts.

---

## 👥 Stakeholder Validation Protocol (Review 2 Evaluator Directive)

### Objective & Evaluator Directive Context
In Review 2, the project evaluator issued the following directive:
> *"Replace simulated-only user-feedback records with at least one documented real/mock stakeholder validation session before the next review."*

The system implements a transparent, multi-tiered validation architecture that strictly distinguishes between automated test fixtures and empirical human evaluation sessions.

### Categorization & Isolation Framework

| Category | Designation | Definition & Treatment |
|:---|:---|:---|
| **Category A** | `SYNTHETIC_TEST_FIXTURE` | Programmatic survey records generated during dataset seeding. Used exclusively to verify SQLite CRUD transactions, dynamic mathematical average formulas, and star-rating distribution charts. **Never presented or tallied as stakeholder validation.** |
| **Category B** | `MOCK_STAKEHOLDER` | Structured evaluation sessions conducted with teaching assistants, faculty, or peer evaluators adopting operational personas (e.g., Cold-Chain Logistics Dispatcher, Port Health Inspector). Permitted for academic prototype evaluation; badged explicitly with purple tag `🟣 MOCK STAKEHOLDER`. |
| **Category C** | `REAL_STAKEHOLDER` | Empirical validation conducted with active commercial seafood exporters, maritime shipping managers, or ISO 17025 accredited auditors. Badged explicitly with green tag `🟢 REAL STAKEHOLDER`. |

### Standardized 7-Domain Interview & Walkthrough Protocol
The evaluation instrument (`docs/validation/STAKEHOLDER_VALIDATION_TEMPLATE.md` / `GET /api/validations/template`) covers 7 core operational domains:
1. **Ease of Using Dashboard**: Intuitive KPI monitoring and navigation across fleet operations.
2. **Understanding Cold-Chain Alerts**: Clarity of temperature excursion alerts, severity tags (CRITICAL vs WARNING), and threshold boundaries.
3. **Shipment & Custody Traceability**: End-to-end lineage connecting physical checkpoints, route events, and handovers.
4. **Evidence Pack Usefulness**: Structure, comprehensiveness, and SHA-256 tamper verification of 1-click audit packs.
5. **Driver Workload Safety**: Automated blocking of fatigued drivers violating mandated driving hours and minimum rest.
6. **Missing/Noisy Sensor Data Handling**: Hampel noise filter outlier suppression and transparent temporal imputation tagging (`is_imputed=1`).
7. **Suggested Improvements**: Actionable feature recommendations and operational priorities.

### How to Conduct and Record a Validation Session
1. **Step 1 — Prepare Protocol**: Review `docs/validation/STAKEHOLDER_VALIDATION_TEMPLATE.md` or fetch the template via `GET /api/validations/template`.
2. **Step 2 — Execute Guided Demo**: Walk the participant through live system modules (`/compliance`, `/transport`, `/workflow-map`, `/experiments`, `/evidence`).
3. **Step 3 — Capture Verbatim Responses**: Record answers to all 7 questions, noting observed strengths, points of friction, and suggested enhancements.
4. **Step 4 — Persist the Session**:
   - Via Web UI: Open `/feedback`, click **Record Validation Session**, complete the form, and submit.
   - Via REST API: Send a `POST /api/validations` payload (must specify `participant_type: "MOCK_STAKEHOLDER"` or `"REAL_STAKEHOLDER"`). Synthetic types are rejected with HTTP 422.
5. **Step 5 — Archive Raw Evidence**: Place session notes, evaluation rubrics, or audio recording logs in `docs/validation/evidence/<session_id>_notes.md`.

### Privacy & Data Protection Standard
In accordance with ethical validation guidelines, the system enforces strict privacy protection:
- **No Personal Identifiable Information (PII)**: The API strictly prohibits personal names, residential addresses, personal phone numbers, or email addresses (`HTTP 422` validation check).
- **Role-Based Attribution**: Sessions are cataloged by operational roles only (e.g., *"Cold-Chain Quality Assurance Officer"*, *"Lead ISO 17025 Auditor"*).

### Current Validation Status & Outstanding Limitations
- **Current Status**: `PENDING_STAKEHOLDER_EVALUATION` (Template Protocol Deployed). The database table `stakeholder_validations`, REST endpoints (`GET/POST /api/validations`, `GET /api/validations/template`), 11 dedicated Pytest tests, and interactive UI form have been implemented. The standardized unfilled template specimen (`VAL-TEMPLATE-001`) is seeded in the repository.
- **Outstanding Requirement to Satisfy Evaluator**: The evaluator directive requires an actual completed real or mock stakeholder evaluation session to be conducted using the protocol and documented with evidence artifacts before the final review.

---

## 🛡️ License & Academic Integrity
Developed as a capstone project for Seafood Cold-Chain Compliance Automation. All relational records and experimental data are generated with consistent relational schemas and validated against ISO 17025 cold-chain standards. The stakeholder validation framework separates automated test fixtures from live/mock evaluations; formal commercial field pilot validation remains a post-capstone commercial objective.

