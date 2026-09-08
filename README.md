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
   - **Baseline vs Proposed Benchmark**: Measures manual workflow (~4.2 hrs/shipment across disconnected systems) vs automated system (<2 sec/shipment), demonstrating dramatic audit preparation time reduction.
   - **Missing Data Experiment**: Tests temporal gap imputation at controlled loss rates (1%–50%) maintaining high evidence completeness.
   - **Noise Filtering Experiment**: Evaluates rolling Z-score and adaptive median suppression under injected sensor electrical noise.
   - **Threshold Sensitivity Tuning**: Dynamic trade-off analysis between False Positives (FP) and True Anomaly Recall with dynamic confusion matrix calculations.
   - **User Feedback & Usability Scoring**: Interactive survey module and live empirical rating breakdown.

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
# Run complete Pytest test suite (119 unit & integration tests)
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
   - Test *Noise Filtering* and *Threshold Sensitivity Tuning*.
6. **Field Workflow Map** (`/workflow-map`):
   - Click through lifecycle stages from Fishing Dock to Final Port Import.

---

## 🛡️ License & Academic Integrity
Developed as a capstone project for Seafood Cold-Chain Compliance Automation. All relational records and experimental data are generated with consistent relational schemas and validated against ISO 17025 cold-chain standards.
