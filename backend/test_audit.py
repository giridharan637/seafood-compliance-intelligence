import os
import sys
import sqlite3
import json
import time

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from fastapi.testclient import TestClient
from main import app
from database import init_db, get_db_connection
from data_generator import generate_dataset
from ml_engine import preprocess_and_train_models, analyze_single_batch
from workload_engine import check_worker_workload_safety
from experiments_engine import (
    run_baseline_experiment,
    run_threshold_tuning_experiment,
    get_error_analysis_data,
    get_dataset_sample_statistics,
    run_missing_data_experiment,
    run_noise_experiment
)
from evidence_pack import generate_evidence_pack_and_report
from store_forward import get_network_status, toggle_network_status, sync_offline_records, buffer_offline_log
from manual_entry import (
    ManualComplianceEntryPayload,
    get_search_options,
    autofill_from_db,
    get_sample_record,
    validate_compliance_record,
    save_manual_compliance_record
)

def run_all_tests():
    print("=== 1. DATABASE & SCHEMA AUDIT ===")
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cursor.fetchall()]
    print(f"Verified {len(tables)} tables: {', '.join(tables)}")
    assert "shipments" in tables
    assert "product_batches" in tables
    assert "sensors" in tables
    assert "sensor_logs" in tables
    assert "sensor_calibrations" in tables
    assert "handover_records" in tables
    assert "route_events" in tables
    assert "worker_logs" in tables
    assert "compliance_events" in tables
    assert "ml_predictions" in tables
    assert "user_feedback" in tables
    assert "system_settings" in tables
    assert "offline_buffer" in tables
    conn.close()

    print("\n=== 2. FASTAPI CLIENT & ENDPOINTS AUDIT ===")
    client = TestClient(app)

    # Health
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health failed: {r.text}"
    print("[PASS] GET /api/health:", r.json())

    # KPI
    r = client.get("/api/kpi")
    assert r.status_code == 200, f"KPI failed: {r.text}"
    print("[PASS] GET /api/kpi:", r.json())

    # Shipments
    r = client.get("/api/shipments")
    assert r.status_code == 200, f"Shipments failed: {r.text}"
    shipments = r.json()
    print(f"[PASS] GET /api/shipments: {len(shipments)} records")
    if shipments:
        first_id = shipments[0]["shipment_id"]
        r_det = client.get(f"/api/shipments/{first_id}")
        assert r_det.status_code == 200
        print(f"[PASS] GET /api/shipments/{first_id}: fetched detail with {len(r_det.json().get('sensor_logs', []))} logs")

    # Batches
    r = client.get("/api/batches")
    assert r.status_code == 200
    batches = r.json()
    print(f"[PASS] GET /api/batches: {len(batches)} records")

    # Sensors
    r = client.get("/api/sensors")
    assert r.status_code == 200
    print(f"[PASS] GET /api/sensors: {len(r.json())} records")

    # Workers
    r = client.get("/api/workers")
    assert r.status_code == 200
    print(f"[PASS] GET /api/workers: {len(r.json())} records")

    # Alerts
    r = client.get("/api/alerts")
    assert r.status_code == 200
    print(f"[PASS] GET /api/alerts: {len(r.json())} alerts")

    # ML Predictions
    r = client.get("/api/ml-predictions")
    assert r.status_code == 200
    print(f"[PASS] GET /api/ml-predictions: {len(r.json())} predictions")

    # System Health
    r = client.get("/api/system-health")
    assert r.status_code == 200
    print("[PASS] GET /api/system-health: Status =", r.json().get("status"))

    # Settings GET and POST
    r = client.get("/api/settings")
    assert r.status_code == 200
    sett = r.json()
    r = client.post("/api/settings", json={
        "temp_warning_threshold": 2.5,
        "temp_critical_threshold": 5.5,
        "max_allowed_delay_mins": 45,
        "alert_sensitivity": "HIGH",
        "store_forward_sync_interval": 15,
        "auto_impute_missing": True
    })
    assert r.status_code == 200
    print("[PASS] GET & POST /api/settings: updated successfully")

    # Dataset Explorer Batch Pagination
    r = client.get("/api/dataset/batches?page=1&page_size=10")
    assert r.status_code == 200
    assert "data" in r.json()
    print(f"[PASS] GET /api/dataset/batches: Total = {r.json().get('total')}, Page size = 10")

    # Dataset Summary
    r = client.get("/api/dataset/summary")
    assert r.status_code == 200
    print("[PASS] GET /api/dataset/summary:", r.json())

    # Dataset Sensor Logs
    if batches:
        first_batch = batches[0]["batch_id"]
        r = client.get(f"/api/dataset/sensor-logs/{first_batch}?page=1&page_size=15")
        assert r.status_code == 200
        print(f"[PASS] GET /api/dataset/sensor-logs/{first_batch}: Total = {r.json().get('total')}")

    # Failure Cases 1 to 5
    for case_id in range(1, 6):
        r = client.post(f"/api/failure-cases/{case_id}")
        assert r.status_code == 200
        print(f"[PASS] POST /api/failure-cases/{case_id}: {r.json().get('title')} -> {r.json().get('final_compliance_status')}")

    # Experiments
    r = client.get("/api/experiments/baseline")
    assert r.status_code == 200
    print("[PASS] GET /api/experiments/baseline: Target Accuracy =", r.json().get("target_model", {}).get("accuracy"))

    r = client.post("/api/experiments/threshold-tuning", json={
        "temp_warning_threshold": 2.0,
        "temp_critical_threshold": 5.0,
        "max_allowed_delay_mins": 60
    })
    assert r.status_code == 200
    print("[PASS] POST /api/experiments/threshold-tuning: Tradeoff =", r.json().get("optimal_tradeoff"))

    r = client.post("/api/experiments/missing-data", json={"missing_rate": 0.10})
    assert r.status_code == 200
    print("[PASS] POST /api/experiments/missing-data: Imputed R2 =", r.json().get("imputation_r2"))

    r = client.post("/api/experiments/noise-filtering", json={"noise_level": 0.12})
    assert r.status_code == 200
    print("[PASS] POST /api/experiments/noise-filtering: Outliers cleaned =", r.json().get("outliers_cleaned"))

    r = client.get("/api/experiments/dataset-stats")
    assert r.status_code == 200
    print("[PASS] GET /api/experiments/dataset-stats: batches count =", r.json().get("dataset_counts", {}).get("product_batches"))

    r = client.get("/api/error-analysis")
    assert r.status_code == 200
    print("[PASS] GET /api/error-analysis: Total analyzed =", r.json().get("total_samples_analyzed"))

    # User Feedback GET & POST
    r = client.post("/api/feedback", json={
        "role": "Compliance Officer",
        "usability_rating": 5,
        "report_clarity": 5,
        "alert_usefulness": 5,
        "evidence_pack_usefulness": 5,
        "ease_of_navigation": 5,
        "comments": "Automated audit report saves hours of manual paperwork."
    })
    assert r.status_code == 200
    r = client.get("/api/feedback")
    assert r.status_code == 200
    print(f"[PASS] Feedback API: {r.json().get('total_responses')} responses, Avg rating = {r.json().get('avg_rating')}")

    # Workload Check
    r = client.post("/api/workload-check", json={"driver_id": "DRV-101", "additional_hours": 2.0})
    assert r.status_code == 200
    print("[PASS] POST /api/workload-check:", r.json())

    # Store & Forward
    r = client.get("/api/network-status")
    assert r.status_code == 200
    print("[PASS] GET /api/network-status:", r.json().get("status"))

    r = client.post("/api/network-toggle", json={"status": "OFFLINE"})
    assert r.status_code == 200
    assert r.json().get("status") == "OFFLINE"
    print("[PASS] POST /api/network-toggle -> OFFLINE")

    r = client.post("/api/buffer-log", json={
        "payload_type": "OFFLINE_SENSOR_TELEMETRY",
        "payload_data": {"sensor_id": "SNS-101", "temp": -19.2, "status": "BUFFERED"}
    })
    assert r.status_code == 200
    print("[PASS] POST /api/buffer-log: Buffered offline record")

    r = client.post("/api/network-toggle", json={"status": "ONLINE"})
    assert r.status_code == 200
    print("[PASS] POST /api/network-toggle -> ONLINE")

    r = client.post("/api/network-sync")
    assert r.status_code == 200
    print("[PASS] POST /api/network-sync:", r.json())

    # Manual Entry flow
    r = client.get("/api/manual-entry/options")
    assert r.status_code == 200
    print(f"[PASS] GET /api/manual-entry/options: {len(r.json())} options")

    r = client.get("/api/manual-entry/sample")
    assert r.status_code == 200
    sample_data = r.json()
    print("[PASS] GET /api/manual-entry/sample:", sample_data.get("shipment_id"), sample_data.get("batch_id"))

    # Test Validation & Save
    test_entry = {
        "shipment_id": "SHP-DEMO-2026-999",
        "batch_id": "BTC-DEMO-999",
        "product_type": "Black Tiger Shrimp (Chilled)",
        "origin": "Portland Marine Cold Terminal",
        "destination": "Los Angeles Cold Logistics Center",
        "port_airport": "Los Angeles International Air Cargo (LAX)",
        "transport_mode": "Refrigerated Reefer Trailer",
        "quantity_kg": 2500.0,
        "required_temp_min": 0.0,
        "required_temp_max": 4.0,
        "current_temp": 1.5,
        "sensor_id": "SNS-DEMO-999",
        "sensor_type": "Multi-Sensor IoT Cold Logger",
        "calibration_date": "2026-08-20",
        "calibration_due_date": "2026-11-20",
        "calibration_status": "VALID",
        "route_status": "On Schedule",
        "last_custody_handover": "Portland Terminal Ramp Handoff",
        "driver_id": "DRV-101",
        "driver_name": "Maria Garcia",
        "notes": "Verified pre-shipment compliance inspection."
    }

    r = client.post("/api/manual-entry/validate", json=test_entry)
    assert r.status_code == 200
    print("[PASS] POST /api/manual-entry/validate:", r.json().get("compliance_status"), "Valid =", r.json().get("is_valid"))

    r = client.post("/api/manual-entry/save", json=test_entry)
    assert r.status_code == 200
    print("[PASS] POST /api/manual-entry/save:", r.json().get("message"))

    r = client.post("/api/manual-entry/generate-evidence-pack", json={"batch_id": "BTC-DEMO-999"})
    assert r.status_code == 200
    pack = r.json()
    print("[PASS] POST /api/manual-entry/generate-evidence-pack: Report ID =", pack.get("report_id"), "Readiness =", f"{pack.get('completeness_score')}%")

    print("\n=======================================================")
    print("ALL API ENDPOINTS & LOGICAL INTEGRATIONS FULLY AUDITED!")
    print("=======================================================")

if __name__ == "__main__":
    run_all_tests()
