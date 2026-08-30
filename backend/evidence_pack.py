import os
import sys
import datetime
import uuid
import pandas as pd
from typing import Dict, Any

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database import get_db_connection
from ml_engine import analyze_single_batch
from workload_engine import check_worker_workload_safety

def generate_evidence_pack_and_report(batch_id: str) -> Dict[str, Any]:
    """
    Collects and joins disconnected records across all tables into a unified 
    structured Compliance Evidence Pack and Audit Report.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Product Batch Details
    cursor.execute("""
        SELECT batch_id, product_type, quantity_kg, processing_date, origin, destination,
               required_temp_min, required_temp_max, export_date, shipment_id, compliance_status
        FROM product_batches
        WHERE batch_id = ?
    """, (batch_id,))
    batch_row = cursor.fetchone()

    if not batch_row:
        conn.close()
        return {"error": f"Batch ID {batch_id} not found."}

    batch = dict(batch_row)
    shipment_id = batch["shipment_id"]

    # 2. Shipment Details
    cursor.execute("""
        SELECT shipment_id, vehicle_id, driver_id, origin, destination, port_airport,
               current_location, current_temp, shipment_status, eta, compliance_status, risk_score
        FROM shipments
        WHERE shipment_id = ?
    """, (shipment_id,))
    shipment_row = cursor.fetchone()
    shipment = dict(shipment_row) if shipment_row else {}

    # 3. Driver & Workload Safety Check
    driver_id = shipment.get("driver_id", "")
    workload_safety = check_worker_workload_safety(driver_id)

    # 4. Handover Records
    cursor.execute("""
        SELECT handover_id, from_person, to_person, timestamp, location, condition, handover_status, notes
        FROM handover_records
        WHERE batch_id = ? OR shipment_id = ?
        ORDER BY timestamp ASC
    """, (batch_id, shipment_id))
    handovers = [dict(r) for r in cursor.fetchall()]

    # 5. Route Events
    cursor.execute("""
        SELECT route_id, event_type, timestamp, location, delay_minutes, route_status, notes
        FROM route_events
        WHERE shipment_id = ?
        ORDER BY timestamp ASC
    """, (shipment_id,))
    route_events = [dict(r) for r in cursor.fetchall()]

    # 6. Sensor Evidence & Calibration
    cursor.execute("""
        SELECT sensor_id, sensor_type, status, battery_status, signal_status, last_calibration_date,
               calibration_due_date, calibration_status, accuracy_rating, technician
        FROM sensors
        WHERE sensor_id IN (SELECT DISTINCT sensor_id FROM sensor_logs WHERE batch_id = ?)
    """, (batch_id,))
    sensor_row = cursor.fetchone()
    sensor = dict(sensor_row) if sensor_row else {}

    cursor.execute("""
        SELECT calibration_id, calibration_date, calibration_due_date, calibration_status, accuracy, technician, notes
        FROM sensor_calibrations
        WHERE sensor_id = ?
    """, (sensor.get("sensor_id", ""),))
    calibrations = [dict(r) for r in cursor.fetchall()]

    # 7. Sensor Logs Summary & Data Quality Analysis
    logs_df = pd.read_sql_query("""
        SELECT timestamp, temperature, original_temp, imputed_temp, humidity, battery_status, is_missing, is_noisy, is_imputed, anomaly_score
        FROM sensor_logs
        WHERE batch_id = ?
        ORDER BY timestamp ASC
    """, conn, params=(batch_id,))

    conn.close()

    total_logs = len(logs_df)
    missing_logs = int(logs_df["is_missing"].sum()) if not logs_df.empty else 0
    imputed_logs = int(logs_df["is_imputed"].sum()) if not logs_df.empty else 0
    noisy_logs = int(logs_df["is_noisy"].sum()) if not logs_df.empty else 0
    max_temp = float(logs_df["imputed_temp"].max()) if not logs_df.empty else batch["required_temp_max"]
    min_temp = float(logs_df["imputed_temp"].min()) if not logs_df.empty else batch["required_temp_min"]

    # 8. ML Anomaly Findings
    ml_analysis = analyze_single_batch(batch_id)

    # 9. Evidence Completeness Score Calculation (0-100%)
    score_components = {
        "batch_metadata": 15 if batch else 0,
        "shipment_metadata": 15 if shipment else 0,
        "sensor_logs": 20 if total_logs > 0 else 0,
        "calibration_evidence": 15 if calibrations and sensor.get("calibration_status") == "VALID" else (8 if calibrations else 0),
        "custody_handovers": 15 if len(handovers) >= 3 else (5 * len(handovers)),
        "route_checkpoints": 10 if len(route_events) >= 3 else (3 * len(route_events)),
        "worker_safety": 10 if workload_safety.get("is_safe") else 2
    }
    completeness_score = min(100, sum(score_components.values()))

    # Report Metadata
    report_id = f"AUD-{datetime.datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    generated_at = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    overall_status = "PASSED" if completeness_score >= 85 and ml_analysis.get("risk_level") != "HIGH" and workload_safety.get("is_safe") else "ACTION_REQUIRED"

    return {
        "report_id": report_id,
        "generated_at": generated_at,
        "batch_id": batch_id,
        "shipment_id": shipment_id,
        "overall_status": overall_status,
        "completeness_score": completeness_score,
        "completeness_breakdown": score_components,
        "executive_summary": f"Automated Evidence Pack generated for {batch['product_type']} (Batch {batch_id}). System joined {total_logs} sensor readings, {len(calibrations)} calibration certificates, {len(handovers)} custody handovers, and worker safety logs. Overall audit readiness score: {completeness_score}%.",
        "batch_details": batch,
        "shipment_details": shipment,
        "sensor_details": sensor,
        "calibration_evidence": calibrations,
        "custody_handovers": handovers,
        "route_events": route_events,
        "worker_safety_check": workload_safety,
        "ml_anomaly_findings": ml_analysis,
        "data_quality_analysis": {
            "total_observations": total_logs,
            "missing_observations": missing_logs,
            "imputed_observations": imputed_logs,
            "noisy_observations": noisy_logs,
            "max_recorded_temp": max_temp,
            "min_recorded_temp": min_temp,
            "temp_threshold_min": batch["required_temp_min"],
            "temp_threshold_max": batch["required_temp_max"]
        },
        "recent_sensor_log_sample": logs_df.head(15).to_dict(orient="records") if not logs_df.empty else []
    }
