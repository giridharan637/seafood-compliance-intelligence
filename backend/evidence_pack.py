import os
import sys
import datetime
import uuid
import json
import hashlib
import math
import pandas as pd
from typing import Dict, Any

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database import get_db_connection
from ml_engine import analyze_single_batch
from workload_engine import check_worker_workload_safety


def _sanitize_for_json(obj: Any) -> Any:
    """Recursively replaces NaN / Inf with None so standard JSON serialization succeeds."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(item) for item in obj]
    return obj


def _canonical_serialize(data: Any) -> str:
    """
    Produces a deterministic, canonical JSON string for SHA-256 hashing.
    All keys sorted, floats normalized to 6 decimal places, timestamps preserved as strings.
    """
    def normalize(obj: Any) -> Any:
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
            return round(obj, 6)
        if isinstance(obj, dict):
            return {k: normalize(v) for k, v in sorted(obj.items())}
        if isinstance(obj, list):
            return [normalize(item) for item in obj]
        return obj

    normalized = normalize(data)
    return json.dumps(normalized, sort_keys=True, ensure_ascii=True, separators=(",", ":"))


def _compute_sha256(canonical_str: str) -> str:
    """Computes SHA-256 hex digest of a canonical string."""
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


def generate_evidence_pack_and_report(batch_id: str) -> Dict[str, Any]:
    """
    Collects and joins disconnected records across all tables into a unified
    structured Compliance Evidence Pack and Audit Report.
    Includes SHA-256 Evidence Integrity Hash embedded in metadata.
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

    # 8. Compliance Events
    cursor.execute("""
        SELECT event_id, event_type, severity, description, timestamp, recommended_action, status
        FROM compliance_events
        WHERE batch_id = ? OR shipment_id = ?
        ORDER BY timestamp ASC
    """, (batch_id, shipment_id))
    compliance_events = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total_logs = len(logs_df)
    missing_logs = int(logs_df["is_missing"].sum()) if not logs_df.empty else 0
    imputed_logs = int(logs_df["is_imputed"].sum()) if not logs_df.empty else 0
    noisy_logs = int(logs_df["is_noisy"].sum()) if not logs_df.empty else 0
    max_temp = float(logs_df["imputed_temp"].max()) if not logs_df.empty else batch["required_temp_max"]
    min_temp = float(logs_df["imputed_temp"].min()) if not logs_df.empty else batch["required_temp_min"]

    if pd.isna(max_temp):
        max_temp = batch["required_temp_max"]
    if pd.isna(min_temp):
        min_temp = batch["required_temp_min"]

    # 9. ML Anomaly Findings
    ml_analysis = analyze_single_batch(batch_id)

    # 10. Audit Trail Traceability Chain (Raw DB Record -> Processing -> Evidence Section -> Integrity Pack)
    traceability_sections = [
        {
            "section_name": "Product Batch Metadata",
            "source_table": "product_batches",
            "source_record_ids": [batch["batch_id"]] if batch.get("batch_id") else ["MISSING_SOURCE_RECORD"],
            "evidence_output_section": "batch_details",
            "required_records": 1,
            "available_records": 1 if batch.get("batch_id") else 0,
            "missing_records": 0 if batch.get("batch_id") else 1,
            "completeness_pct": 100.0 if batch.get("batch_id") else 0.0,
            "traceability_status": "VERIFIED" if batch.get("batch_id") else "MISSING_SOURCE_RECORD",
            "target_completeness_pct": 100.0,
            "lineage_step": "RAW DATABASE RECORD (product_batches) -> SCHEMA VALIDATION -> EVIDENCE PACK"
        },
        {
            "section_name": "Active Reefer Shipment",
            "source_table": "shipments",
            "source_record_ids": [shipment["shipment_id"]] if shipment.get("shipment_id") else ["MISSING_SOURCE_RECORD"],
            "evidence_output_section": "shipment_details",
            "required_records": 1,
            "available_records": 1 if shipment.get("shipment_id") else 0,
            "missing_records": 0 if shipment.get("shipment_id") else 1,
            "completeness_pct": 100.0 if shipment.get("shipment_id") else 0.0,
            "traceability_status": "VERIFIED" if shipment.get("shipment_id") else "MISSING_SOURCE_RECORD",
            "target_completeness_pct": 100.0,
            "lineage_step": "RAW DATABASE RECORD (shipments) -> JOIN BY shipment_id -> EVIDENCE PACK"
        },
        {
            "section_name": "Sensor Telemetry Stream",
            "source_table": "sensor_logs",
            "source_record_ids": [f"SLOG-{batch_id}-N{total_logs}"] if total_logs > 0 else ["MISSING_SOURCE_RECORD"],
            "evidence_output_section": "data_quality_analysis",
            "required_records": 10,
            "available_records": total_logs,
            "missing_records": missing_logs,
            "completeness_pct": round(((total_logs - missing_logs) / max(1, total_logs)) * 100.0, 1) if total_logs > 0 else 0.0,
            "traceability_status": "VERIFIED" if total_logs >= 10 and missing_logs == 0 else ("PARTIAL" if total_logs > 0 else "MISSING_SOURCE_RECORD"),
            "target_completeness_pct": 98.0,
            "lineage_step": "RAW DATABASE RECORD (sensor_logs) -> TEMPORAL IMPUTATION & HAMPEL NOISE FILTER -> EVIDENCE PACK"
        },
        {
            "section_name": "Sensor Calibration Certificates",
            "source_table": "sensor_calibrations",
            "source_record_ids": [c["calibration_id"] for c in calibrations] if calibrations else ["MISSING_SOURCE_RECORD"],
            "evidence_output_section": "calibration_evidence",
            "required_records": 1,
            "available_records": len(calibrations),
            "missing_records": 0 if len(calibrations) >= 1 else 1,
            "completeness_pct": 100.0 if any(c.get("calibration_status") == "VALID" for c in calibrations) else (50.0 if calibrations else 0.0),
            "traceability_status": "VERIFIED" if any(c.get("calibration_status") == "VALID" for c in calibrations) else ("EXPIRED_WARNING" if calibrations else "MISSING_SOURCE_RECORD"),
            "target_completeness_pct": 100.0,
            "lineage_step": "RAW DATABASE RECORD (sensor_calibrations) -> ISO 17025 VALIDATION -> EVIDENCE PACK"
        },
        {
            "section_name": "Custody Transfer & Handover Chain",
            "source_table": "handover_records",
            "source_record_ids": [h["handover_id"] for h in handovers] if handovers else ["MISSING_SOURCE_RECORD"],
            "evidence_output_section": "custody_handovers",
            "required_records": 3,
            "available_records": len(handovers),
            "missing_records": max(0, 3 - len(handovers)),
            "completeness_pct": round(min(100.0, (len(handovers) / 3.0) * 100.0), 1),
            "traceability_status": "VERIFIED" if len(handovers) >= 3 else ("PARTIAL" if handovers else "MISSING_SOURCE_RECORD"),
            "target_completeness_pct": 100.0,
            "lineage_step": "RAW DATABASE RECORD (handover_records) -> PHYSICAL SEAL & CUSTODY CHECK -> EVIDENCE PACK"
        },
        {
            "section_name": "Route & Checkpoint Events",
            "source_table": "route_events",
            "source_record_ids": [r["route_id"] for r in route_events] if route_events else ["MISSING_SOURCE_RECORD"],
            "evidence_output_section": "route_events",
            "required_records": 2,
            "available_records": len(route_events),
            "missing_records": max(0, 2 - len(route_events)),
            "completeness_pct": round(min(100.0, (len(route_events) / 2.0) * 100.0), 1),
            "traceability_status": "VERIFIED" if len(route_events) >= 2 else ("PARTIAL" if route_events else "MISSING_SOURCE_RECORD"),
            "target_completeness_pct": 95.0,
            "lineage_step": "RAW DATABASE RECORD (route_events) -> HIGHWAY / PORT DISPATCH LOG -> EVIDENCE PACK"
        },
        {
            "section_name": "Driver Workload & Duty Safety",
            "source_table": "worker_logs",
            "source_record_ids": [driver_id] if driver_id else ["MISSING_SOURCE_RECORD"],
            "evidence_output_section": "worker_safety_check",
            "required_records": 1,
            "available_records": 1 if driver_id else 0,
            "missing_records": 0 if driver_id else 1,
            "completeness_pct": 100.0 if workload_safety.get("is_safe") else 50.0,
            "traceability_status": "VERIFIED" if workload_safety.get("is_safe") else ("UNSAFE_VIOLATION" if driver_id else "MISSING_SOURCE_RECORD"),
            "target_completeness_pct": 100.0,
            "lineage_step": "RAW DATABASE RECORD (worker_logs) -> MANDATORY REST CONSTRAINT CHECK -> EVIDENCE PACK"
        },
        {
            "section_name": "Regulatory Compliance Events",
            "source_table": "compliance_events",
            "source_record_ids": [ev["event_id"] for ev in compliance_events] if compliance_events else ["NONE_NOMINAL"],
            "evidence_output_section": "compliance_events",
            "required_records": 0,
            "available_records": len(compliance_events),
            "missing_records": 0,
            "completeness_pct": 100.0,
            "traceability_status": "VERIFIED",
            "target_completeness_pct": 100.0,
            "lineage_step": "RAW DATABASE RECORD (compliance_events) -> CORRECTIVE ACTION AUDIT -> EVIDENCE PACK"
        },
        {
            "section_name": "ML Risk & Anomaly Assessment",
            "source_table": "ml_predictions",
            "source_record_ids": [f"ML-PRED-{batch_id}"],
            "evidence_output_section": "ml_anomaly_findings",
            "required_records": 1,
            "available_records": 1 if ml_analysis else 0,
            "missing_records": 0 if ml_analysis else 1,
            "completeness_pct": 100.0 if ml_analysis else 0.0,
            "traceability_status": "VERIFIED" if ml_analysis else "MISSING_SOURCE_RECORD",
            "target_completeness_pct": 95.0,
            "lineage_step": "SQL MULTI-SOURCE INFERENCE -> ISOLATION FOREST + RANDOM FOREST -> EVIDENCE PACK"
        }
    ]

    audit_lineage_summary = {
        "total_sections": len(traceability_sections),
        "verified_sections": sum(1 for s in traceability_sections if s["traceability_status"] == "VERIFIED"),
        "missing_sections": sum(1 for s in traceability_sections if s["traceability_status"] == "MISSING_SOURCE_RECORD"),
        "overall_traceability_pct": round((sum(s["completeness_pct"] for s in traceability_sections) / (len(traceability_sections) * 100.0)) * 100.0, 1),
        "traceability_pipeline": "RAW DATABASE RECORD -> PROCESSING -> EVIDENCE SECTION -> CANONICAL SHA-256 INTEGRITY PACK"
    }

    # 11. Evidence Completeness Score Calculation (0-100%)
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

    overall_status = (
        "PASSED"
        if completeness_score >= 85 and ml_analysis.get("risk_level") != "HIGH" and workload_safety.get("is_safe")
        else "ACTION_REQUIRED"
    )

    # ---- SHA-256 Evidence Integrity Hashing ----
    # Core evidence data that will be integrity-protected
    core_evidence = {
        "report_id": report_id,
        "generated_at": generated_at,
        "batch_id": batch_id,
        "shipment_id": shipment_id,
        "overall_status": overall_status,
        "completeness_score": completeness_score,
        "batch_details": batch,
        "shipment_details": shipment,
        "data_quality_analysis": {
            "total_observations": total_logs,
            "missing_observations": missing_logs,
            "imputed_observations": imputed_logs,
            "noisy_observations": noisy_logs,
            "max_recorded_temp": round(max_temp, 4),
            "min_recorded_temp": round(min_temp, 4),
            "temp_threshold_min": batch["required_temp_min"],
            "temp_threshold_max": batch["required_temp_max"]
        },
        "ml_anomaly_risk_level": ml_analysis.get("risk_level"),
        "worker_is_safe": workload_safety.get("is_safe"),
        "handover_count": len(handovers),
        "route_event_count": len(route_events),
        "calibration_count": len(calibrations),
        "compliance_event_count": len(compliance_events),
        "audit_lineage_summary": audit_lineage_summary,
    }

    canonical_str = _canonical_serialize(core_evidence)
    integrity_hash = _compute_sha256(canonical_str)

    integrity_metadata = {
        "hash_algorithm": "SHA-256",
        "integrity_hash": integrity_hash,
        "hash_timestamp": generated_at,
        "evidence_identifier": report_id,
        "canonical_method": "deterministic JSON (sorted keys, normalized floats)",
        "verification_note": (
            "This SHA-256 hash is computed over canonical serialization of the core evidence fields. "
            "To verify integrity, re-serialize the same fields with the same normalization and compare hashes. "
            "A hash mismatch indicates the evidence has been modified after generation."
        )
    }

    pack_dict = {
        "report_id": report_id,
        "generated_at": generated_at,
        "batch_id": batch_id,
        "shipment_id": shipment_id,
        "overall_status": overall_status,
        "completeness_score": completeness_score,
        "completeness_breakdown": score_components,
        "integrity_metadata": integrity_metadata,
        "audit_trail_traceability": traceability_sections,
        "audit_lineage_summary": audit_lineage_summary,
        "executive_summary": (
            f"Automated Evidence Pack generated for {batch['product_type']} (Batch {batch_id}). "
            f"System joined {total_logs} sensor readings, {len(calibrations)} calibration records, "
            f"{len(handovers)} custody handovers, and worker safety logs. "
            f"Overall audit readiness score: {completeness_score}%. "
            f"SHA-256 evidence integrity hash embedded for tamper detection."
        ),
        "batch_details": batch,
        "shipment_details": shipment,
        "sensor_details": sensor,
        "calibration_evidence": calibrations,
        "custody_handovers": handovers,
        "route_events": route_events,
        "worker_safety_check": workload_safety,
        "compliance_events": compliance_events,
        "ml_anomaly_findings": ml_analysis,
        "data_quality_analysis": {
            "total_observations": total_logs,
            "missing_observations": missing_logs,
            "imputed_observations": imputed_logs,
            "noisy_observations": noisy_logs,
            "max_recorded_temp": round(max_temp, 4),
            "min_recorded_temp": round(min_temp, 4),
            "temp_threshold_min": batch["required_temp_min"],
            "temp_threshold_max": batch["required_temp_max"]
        },
        "recent_sensor_log_sample": (
            logs_df.where(pd.notnull(logs_df), None).head(15).to_dict(orient="records")
            if not logs_df.empty else []
        )
    }

    return _sanitize_for_json(pack_dict)


def verify_evidence_pack_integrity(evidence_pack_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Verifies the SHA-256 integrity hash of a stored evidence pack.
    Returns INTEGRITY_VERIFIED or TAMPER_DETECTED with diagnostic details.
    """
    integrity_meta = evidence_pack_data.get("integrity_metadata", {})
    stored_hash = integrity_meta.get("integrity_hash")
    stored_algorithm = integrity_meta.get("hash_algorithm")

    if not stored_hash or stored_algorithm != "SHA-256":
        return {
            "verification_status": "UNVERIFIABLE",
            "reason": "No SHA-256 integrity hash found in evidence pack. Pack may have been generated without integrity protection.",
            "stored_hash": stored_hash,
        }

    # Reconstruct core_evidence from the pack
    batch = evidence_pack_data.get("batch_details", {})
    dqa = evidence_pack_data.get("data_quality_analysis", {})
    ml_findings = evidence_pack_data.get("ml_anomaly_findings", {})
    workload_safety = evidence_pack_data.get("worker_safety_check", {})

    core_evidence = {
        "report_id": evidence_pack_data.get("report_id"),
        "generated_at": evidence_pack_data.get("generated_at"),
        "batch_id": evidence_pack_data.get("batch_id"),
        "shipment_id": evidence_pack_data.get("shipment_id"),
        "overall_status": evidence_pack_data.get("overall_status"),
        "completeness_score": evidence_pack_data.get("completeness_score"),
        "batch_details": batch,
        "shipment_details": evidence_pack_data.get("shipment_details", {}),
        "data_quality_analysis": {
            "total_observations": dqa.get("total_observations"),
            "missing_observations": dqa.get("missing_observations"),
            "imputed_observations": dqa.get("imputed_observations"),
            "noisy_observations": dqa.get("noisy_observations"),
            "max_recorded_temp": dqa.get("max_recorded_temp"),
            "min_recorded_temp": dqa.get("min_recorded_temp"),
            "temp_threshold_min": dqa.get("temp_threshold_min"),
            "temp_threshold_max": dqa.get("temp_threshold_max"),
        },
        "ml_anomaly_risk_level": ml_findings.get("risk_level"),
        "worker_is_safe": workload_safety.get("is_safe"),
        "handover_count": len(evidence_pack_data.get("custody_handovers", [])),
        "route_event_count": len(evidence_pack_data.get("route_events", [])),
        "calibration_count": len(evidence_pack_data.get("calibration_evidence", [])),
        "compliance_event_count": len(evidence_pack_data.get("compliance_events", [])),
        "audit_lineage_summary": evidence_pack_data.get("audit_lineage_summary", {}),
    }

    canonical_str = _canonical_serialize(core_evidence)
    recalculated_hash = _compute_sha256(canonical_str)
    hashes_match = (recalculated_hash == stored_hash)

    return {
        "verification_status": "INTEGRITY_VERIFIED" if hashes_match else "TAMPER_DETECTED",
        "hash_algorithm": "SHA-256",
        "stored_hash": stored_hash,
        "recalculated_hash": recalculated_hash,
        "hashes_match": hashes_match,
        "report_id": evidence_pack_data.get("report_id"),
        "evidence_identifier": integrity_meta.get("evidence_identifier"),
        "hash_timestamp": integrity_meta.get("hash_timestamp"),
        "verification_performed_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "diagnostic": (
            "Evidence pack integrity confirmed. The core evidence data has not been modified since generation."
            if hashes_match else
            "TAMPER DETECTED: The recalculated SHA-256 hash does not match the stored hash. "
            "The core evidence data may have been altered after the Evidence Pack was generated."
        )
    }


def get_audit_trail_traceability(batch_id: str) -> Dict[str, Any]:
    """
    Returns the complete evidentiary traceability chain for a batch,
    mapping raw database primary keys across 9 tables to final evidence sections.
    """
    pack = generate_evidence_pack_and_report(batch_id)
    if "error" in pack:
        return pack

    return {
        "batch_id": batch_id,
        "shipment_id": pack.get("shipment_id"),
        "report_id": pack.get("report_id"),
        "overall_status": pack.get("overall_status"),
        "completeness_score": pack.get("completeness_score"),
        "integrity_hash": pack.get("integrity_metadata", {}).get("integrity_hash"),
        "audit_lineage_summary": pack.get("audit_lineage_summary"),
        "sections": pack.get("audit_trail_traceability", [])
    }

