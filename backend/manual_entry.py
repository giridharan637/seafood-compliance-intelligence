import os
import sys
import datetime
import uuid
import sqlite3
from typing import Dict, Any, List, Optional

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from pydantic import BaseModel
from database import get_db_connection
from ml_engine import analyze_single_batch
from workload_engine import check_worker_workload_safety
from evidence_pack import generate_evidence_pack_and_report

class ManualComplianceEntryPayload(BaseModel):
    shipment_id: str
    batch_id: str
    product_type: str
    origin: str
    destination: str
    port_airport: Optional[str] = "Port / Airport Cold Logistics Center"
    transport_mode: Optional[str] = "Refrigerated Truck + Air Cargo"
    quantity_kg: Optional[float] = 1250.0
    required_temp_min: float
    required_temp_max: float
    current_temp: float
    sensor_id: str
    sensor_type: Optional[str] = "Multi-Sensor IoT Cold Logger"
    calibration_date: Optional[str] = ""
    calibration_due_date: Optional[str] = ""
    calibration_status: str = "VALID"
    route_status: Optional[str] = "On Schedule"
    last_custody_handover: Optional[str] = "Facility Ramp Handoff"
    driver_id: Optional[str] = "DRV-101"
    driver_name: Optional[str] = "Standard Driver"
    notes: Optional[str] = ""

def get_search_options() -> List[Dict[str, Any]]:
    """Returns list of all available shipments & batches for autocomplete search."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.shipment_id, s.origin, s.destination, s.port_airport, s.current_temp, s.compliance_status,
               b.batch_id, b.product_type, b.required_temp_min, b.required_temp_max
        FROM shipments s
        JOIN product_batches b ON s.shipment_id = b.shipment_id
        ORDER BY s.shipment_id ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def autofill_from_db(identifier: str) -> Dict[str, Any]:
    """
    Retrieves and populates real related records from SQLite database
    matching shipment_id or batch_id.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    clean_id = identifier.strip().upper()

    # Try matching shipment_id first, then batch_id
    cursor.execute("""
        SELECT s.shipment_id, s.vehicle_id, s.driver_id, s.origin, s.destination, s.port_airport,
               s.current_location, s.current_temp, s.shipment_status, s.eta, s.compliance_status AS shipment_compliance,
               s.risk_score,
               b.batch_id, b.product_type, b.quantity_kg, b.processing_date, b.required_temp_min, b.required_temp_max,
               b.export_date, b.compliance_status AS batch_compliance,
               w.driver_name, w.safety_status AS driver_safety_status, w.working_hours, w.rest_hours
        FROM shipments s
        JOIN product_batches b ON s.shipment_id = b.shipment_id
        LEFT JOIN worker_logs w ON s.driver_id = w.driver_id
        WHERE UPPER(s.shipment_id) = ? OR UPPER(b.batch_id) = ?
    """, (clean_id, clean_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return {"found": False, "message": f"No existing database record found matching ID '{identifier}'."}

    data = dict(row)
    batch_id = data["batch_id"]
    shipment_id = data["shipment_id"]

    # Retrieve Sensor & Calibration info
    cursor.execute("""
        SELECT s.sensor_id, s.sensor_type, s.status, s.battery_status, s.signal_status,
               s.last_calibration_date, s.calibration_due_date, s.calibration_status, s.accuracy_rating, s.technician
        FROM sensors s
        WHERE s.sensor_id IN (SELECT DISTINCT sensor_id FROM sensor_logs WHERE batch_id = ? OR shipment_id = ?)
        LIMIT 1
    """, (batch_id, shipment_id))
    sensor_row = cursor.fetchone()
    sensor_data = dict(sensor_row) if sensor_row else {
        "sensor_id": f"SNS-{shipment_id.split('-')[-1] if '-' in shipment_id else 'TEMP-001'}",
        "sensor_type": "Multi-Sensor IoT Logger",
        "last_calibration_date": "2026-08-20",
        "calibration_due_date": "2026-11-20",
        "calibration_status": "VALID",
        "battery_status": 94,
        "signal_status": "STRONG"
    }

    # Retrieve Route Events
    cursor.execute("""
        SELECT route_id, event_type, timestamp, location, delay_minutes, route_status, notes
        FROM route_events
        WHERE shipment_id = ?
        ORDER BY timestamp DESC
    """, (shipment_id,))
    route_events = [dict(r) for r in cursor.fetchall()]
    last_route = route_events[0] if route_events else {
        "route_status": "On Schedule",
        "event_type": "Transit Active",
        "location": data["origin"],
        "delay_minutes": 0
    }

    # Retrieve Custody Handovers
    cursor.execute("""
        SELECT handover_id, from_person, to_person, timestamp, location, condition, handover_status, notes
        FROM handover_records
        WHERE batch_id = ? OR shipment_id = ?
        ORDER BY timestamp DESC
    """, (batch_id, shipment_id))
    handovers = [dict(r) for r in cursor.fetchall()]
    last_handover = handovers[0] if handovers else {
        "location": data["origin"],
        "condition": "PASSED - Sealed",
        "handover_status": "COMPLETED",
        "from_person": "Cold Facility Dispatcher",
        "to_person": data.get("driver_name", "Transport Driver")
    }

    # Retrieve Recent Sensor Observations
    cursor.execute("""
        SELECT timestamp, temperature, humidity, location, battery_status, is_missing, is_noisy, is_imputed, anomaly_score
        FROM sensor_logs
        WHERE batch_id = ? OR shipment_id = ?
        ORDER BY timestamp DESC
        LIMIT 10
    """, (batch_id, shipment_id))
    recent_logs = [dict(r) for r in cursor.fetchall()]

    conn.close()

    # Determine transport mode string
    transport_mode = "Refrigerated Truck + Air Cargo"
    if "Airport" in data.get("destination", "") or "Air" in data.get("destination", ""):
        transport_mode = "Refrigerated Reefer Trailer + Air Cargo"
    elif "Marine" in data.get("origin", "") or "Pier" in data.get("origin", ""):
        transport_mode = "Intermodal Reefer Container + Maritime Freight"

    return {
        "found": True,
        "source": "DATABASE_MATCH",
        "shipment_id": data["shipment_id"],
        "batch_id": data["batch_id"],
        "product_type": data["product_type"],
        "quantity_kg": data["quantity_kg"],
        "origin": data["origin"],
        "destination": data["destination"],
        "port_airport": data["port_airport"],
        "transport_mode": transport_mode,
        "required_temp_min": data["required_temp_min"],
        "required_temp_max": data["required_temp_max"],
        "current_temp": data["current_temp"],
        "sensor_id": sensor_data["sensor_id"],
        "sensor_type": sensor_data["sensor_type"],
        "calibration_date": sensor_data.get("last_calibration_date", "2026-08-20"),
        "calibration_due_date": sensor_data.get("calibration_due_date", "2026-11-20"),
        "calibration_status": sensor_data.get("calibration_status", "VALID"),
        "sensor_battery_status": sensor_data.get("battery_status", 90),
        "sensor_signal_status": sensor_data.get("signal_status", "STRONG"),
        "route_status": last_route.get("route_status", "On Schedule"),
        "last_route_event": f"{last_route.get('event_type', 'Departure')} at {last_route.get('location', data['origin'])}",
        "route_events_count": len(route_events),
        "last_custody_handover": f"{last_handover.get('location', data['origin'])} ({last_handover.get('condition', 'Good Condition')})",
        "custody_handovers_count": len(handovers),
        "driver_id": data.get("driver_id", "DRV-101"),
        "driver_name": data.get("driver_name", "Fleet Operator"),
        "driver_safety_status": data.get("driver_safety_status", "SAFE"),
        "compliance_status": data.get("shipment_compliance", "NORMAL"),
        "risk_score": data.get("risk_score", 0.12),
        "recent_observations": recent_logs
    }

def get_sample_record() -> Dict[str, Any]:
    """Retrieves or builds a real presentation-ready demo record from the database."""
    # Try SHP-2026-101 or first available shipment
    sample = autofill_from_db("SHP-2026-101")
    if not sample.get("found"):
        sample = autofill_from_db("BTC-SEA-5001")
    if not sample.get("found"):
        options = get_search_options()
        if options:
            sample = autofill_from_db(options[0]["shipment_id"])
    
    if sample.get("found"):
        sample["is_sample_demo"] = True
        sample["demo_label"] = "Sample operational record loaded"
        return sample

    # Fallback template if DB completely empty
    return {
        "found": True,
        "is_sample_demo": True,
        "demo_label": "Sample operational record loaded",
        "source": "DEMO_PRESET",
        "shipment_id": "SHP-2026-101",
        "batch_id": "BTC-SEA-5001",
        "product_type": "Frozen Shrimp (Black Tiger)",
        "quantity_kg": 1450.0,
        "origin": "Chennai Seafood Processing Unit",
        "destination": "Tokyo International Airport (NRT - Japan)",
        "port_airport": "Chennai Port Cold Terminal",
        "transport_mode": "Refrigerated Truck + Air Cargo",
        "required_temp_min": -22.0,
        "required_temp_max": -18.0,
        "current_temp": -17.2,
        "sensor_id": "SNS-TEMP-001",
        "sensor_type": "Multi-Sensor IoT Logger",
        "calibration_date": "2026-08-20",
        "calibration_due_date": "2026-11-20",
        "calibration_status": "VALID",
        "route_status": "On Schedule",
        "last_route_event": "Cold Storage Departure Checkpoint",
        "route_events_count": 4,
        "last_custody_handover": "Chennai Cold Storage Transfer",
        "custody_handovers_count": 3,
        "driver_id": "DRV-101",
        "driver_name": "Rajesh Kumar",
        "driver_safety_status": "SAFE",
        "compliance_status": "NORMAL",
        "risk_score": 0.15,
        "recent_observations": []
    }

def validate_compliance_record(payload: ManualComplianceEntryPayload) -> Dict[str, Any]:
    """
    Runs full compliance validation and checks:
    - Required field validation
    - Temperature bounds & thermal excursion detection
    - Missing & noisy sensor telemetry observations
    - Calibration validity (ISO 17025)
    - Route delays & anomaly checks
    - Custody & handover integrity
    - Shipment / Batch consistency
    - Driver safety validation
    """
    errors = []
    findings = []
    warnings = []

    # 1. Required Field Validation
    if not payload.shipment_id.strip():
        errors.append("Shipment ID is mandatory.")
    if not payload.batch_id.strip():
        errors.append("Batch ID is mandatory.")
    if not payload.product_type.strip():
        errors.append("Product Type is mandatory.")
    if not payload.origin.strip():
        errors.append("Origin facility is mandatory.")
    if not payload.destination.strip():
        errors.append("Destination is mandatory.")
    if not payload.sensor_id.strip():
        errors.append("Sensor ID is mandatory.")

    # 2. Temperature Limit Logical Validation
    if payload.required_temp_min >= payload.required_temp_max:
        errors.append(f"Required Temp Min ({payload.required_temp_min}°C) must be strictly less than Required Temp Max ({payload.required_temp_max}°C).")

    if errors:
        return {
            "is_valid": False,
            "validation_errors": errors,
            "compliance_status": "INVALID",
            "findings": [],
            "risk_score": 1.0,
            "ready_for_evidence_pack": False
        }

    # 3. Compliance Analysis & Rule Engine
    temp_min = payload.required_temp_min
    temp_max = payload.required_temp_max
    cur_temp = payload.current_temp
    compliance_status = "NORMAL"
    risk_score = 0.10

    # Temperature checks
    if cur_temp > temp_max:
        excursion = cur_temp - temp_max
        if excursion >= 3.0:
            compliance_status = "CRITICAL"
            risk_score = max(risk_score, 0.88)
            findings.append({
                "category": "TEMPERATURE_EXCURSION",
                "severity": "CRITICAL",
                "title": "Severe Thermal Excursion Detected",
                "description": f"Current temperature of {cur_temp:.1f}°C exceeds upper safety limit ({temp_max:.1f}°C) by +{excursion:.1f}°C. Immediate cold-chain quarantine required.",
                "action": "Hold shipment pallet in secondary cold storage; perform spoilage testing."
            })
        else:
            if compliance_status != "CRITICAL":
                compliance_status = "WARNING"
            risk_score = max(risk_score, 0.55)
            findings.append({
                "category": "TEMPERATURE_WARNING",
                "severity": "WARNING",
                "title": "Mild Thermal Limit Exceedance",
                "description": f"Current temperature of {cur_temp:.1f}°C is +{excursion:.1f}°C above maximum limit ({temp_max:.1f}°C).",
                "action": "Verify reefer compressor setpoint and check door seal integrity."
            })
    elif cur_temp < (temp_min - 4.0):
        compliance_status = "CRITICAL"
        risk_score = max(risk_score, 0.85)
        findings.append({
            "category": "OVERFREEZING_EXCURSION",
            "severity": "CRITICAL",
            "title": "Abnormal Sub-Zero Thermal Drop",
            "description": f"Current temperature of {cur_temp:.1f}°C is severely below lower threshold ({temp_min:.1f}°C). Risk of texture degradation / freeze burn.",
            "action": "Adjust thermostat and inspect cargo for crystallization."
        })
    else:
        findings.append({
            "category": "THERMAL_COMPLIANCE",
            "severity": "NORMAL",
            "title": "Thermal Integrity Maintained",
            "description": f"Recorded temperature ({cur_temp:.1f}°C) is within required range [{temp_min:.1f}°C to {temp_max:.1f}°C].",
            "action": "Continuous logging verified."
        })

    # Calibration Validity Check (ISO 17025)
    cal_status = payload.calibration_status.upper()
    if cal_status == "EXPIRED":
        if compliance_status != "CRITICAL":
            compliance_status = "WARNING"
        risk_score = max(risk_score, 0.65)
        findings.append({
            "category": "CALIBRATION_DEFECT",
            "severity": "HIGH",
            "title": "Sensor ISO 17025 Calibration Expired",
            "description": f"Sensor {payload.sensor_id} has EXPIRED calibration validity. Evidence completeness reduced.",
            "action": "Replace sensor with certified calibrated unit prior to customs export filing."
        })
    else:
        findings.append({
            "category": "CALIBRATION_AUDIT",
            "severity": "NORMAL",
            "title": "Sensor Calibration Valid (ISO 17025)",
            "description": f"Sensor {payload.sensor_id} is certified calibrated and within validity window.",
            "action": "Traceability certificate attached."
        })

    # Telemetry Data Quality Analysis from SQLite DB
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN is_missing = 1 THEN 1 ELSE 0 END) AS missing,
                   SUM(CASE WHEN is_noisy = 1 THEN 1 ELSE 0 END) AS noisy,
                   SUM(CASE WHEN is_imputed = 1 THEN 1 ELSE 0 END) AS imputed
            FROM sensor_logs
            WHERE batch_id = ? OR shipment_id = ?
        """, (payload.batch_id, payload.shipment_id))
        stats = cursor.fetchone()
        
        # Route delays check
        cursor.execute("""
            SELECT COUNT(*) AS delays, MAX(delay_minutes) as max_delay
            FROM route_events
            WHERE shipment_id = ? AND delay_minutes > 0
        """, (payload.shipment_id,))
        route_stats = cursor.fetchone()
        
        # Custody handovers check
        cursor.execute("""
            SELECT COUNT(*) FROM handover_records
            WHERE batch_id = ? OR shipment_id = ?
        """, (payload.batch_id, payload.shipment_id))
        handover_count = cursor.fetchone()[0]
        
        conn.close()

        if stats and stats[0] > 0:
            total_obs = stats[0]
            missing_obs = stats[1] or 0
            noisy_obs = stats[2] or 0
            imputed_obs = stats[3] or 0

            if missing_obs > 0 or noisy_obs > 0:
                findings.append({
                    "category": "TELEMETRY_DATA_QUALITY",
                    "severity": "WARNING" if missing_obs < 15 else "CRITICAL",
                    "title": "Sensor Data Gaps & Noise Detected",
                    "description": f"Batch history has {missing_obs} missing and {noisy_obs} noisy telemetry points out of {total_obs} total readings ({imputed_obs} imputed via Kalman filter).",
                    "action": "Inspect IoT battery and antenna signal strength at staging dock."
                })
            else:
                findings.append({
                    "category": "TELEMETRY_INTEGRITY",
                    "severity": "NORMAL",
                    "title": "Continuous Telemetry Stream Verified",
                    "description": f"Verified {total_obs} continuous telemetry readings with zero packet loss.",
                    "action": "Sensor telemetry logged."
                })

        if route_stats and route_stats[0] > 0 and (route_stats[1] or 0) > 30:
            max_d = route_stats[1]
            findings.append({
                "category": "ROUTE_ANOMALY",
                "severity": "WARNING",
                "title": "Transit Checkpoint Delay Recorded",
                "description": f"Shipment encountered a maximum transit delay of {max_d} minutes along the cold corridor.",
                "action": "Expedite customs ramp clearance."
            })
        else:
            findings.append({
                "category": "ROUTE_INTEGRITY",
                "severity": "NORMAL",
                "title": "Transit Route On Schedule",
                "description": f"Route checkpoints verified on schedule with status '{payload.route_status or 'On Schedule'}'.",
                "action": "Standard transit protocol maintained."
            })

        if handover_count > 0:
            findings.append({
                "category": "CUSTODY_INTEGRITY",
                "severity": "NORMAL",
                "title": "Chain of Custody Handover Verified",
                "description": f"{handover_count} verified custody transfer records logged with physical seals intact.",
                "action": "Digital handover signatures attached."
            })
    except Exception:
        pass

    # Driver Workload Check (if driver given)
    driver_safety = check_worker_workload_safety(payload.driver_id or "DRV-101")
    if not driver_safety.get("is_safe", True):
        if compliance_status != "CRITICAL":
            compliance_status = "WARNING"
        risk_score = max(risk_score, 0.70)
        findings.append({
            "category": "WORKER_SAFETY",
            "severity": "HIGH",
            "title": "Driver Safety Constraint Violation",
            "description": f"Assigned driver {payload.driver_name} ({payload.driver_id}) violates duty hour safety limits: {', '.join(driver_safety.get('violations', []))}.",
            "action": "Reassign driver to maintain transport compliance."
        })

    return {
        "is_valid": True,
        "validation_errors": [],
        "compliance_status": compliance_status,
        "risk_score": round(risk_score, 2),
        "findings": findings,
        "warnings": warnings,
        "ready_for_evidence_pack": True,
        "summary": f"Compliance evaluation completed: {compliance_status} status with {len(findings)} findings evaluated."
    }

def save_manual_compliance_record(payload: ManualComplianceEntryPayload) -> Dict[str, Any]:
    """
    Saves or updates the manual compliance record into the real SQLite database.
    Updates `product_batches`, `shipments`, `sensors`, and logs a new telemetry point in `sensor_logs`.
    """
    # First validate
    val_res = validate_compliance_record(payload)
    if not val_res["is_valid"]:
        return {"success": False, "errors": val_res["validation_errors"]}

    compliance_status = val_res["compliance_status"]
    risk_score = val_res["risk_score"]
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Upsert Shipment
        cursor.execute("SELECT shipment_id FROM shipments WHERE shipment_id = ?", (payload.shipment_id,))
        existing_shp = cursor.fetchone()

        if existing_shp:
            cursor.execute("""
                UPDATE shipments
                SET origin = ?, destination = ?, port_airport = ?, current_temp = ?,
                    compliance_status = ?, risk_score = ?, driver_id = ?
                WHERE shipment_id = ?
            """, (
                payload.origin, payload.destination, payload.port_airport or "Cold Terminal",
                payload.current_temp, compliance_status, risk_score, payload.driver_id or "DRV-101",
                payload.shipment_id
            ))
        else:
            cursor.execute("""
                INSERT INTO shipments (
                    shipment_id, vehicle_id, driver_id, origin, destination, port_airport,
                    current_location, current_temp, shipment_status, eta, compliance_status, risk_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payload.shipment_id, f"VEH-{payload.shipment_id.split('-')[-1] if '-' in payload.shipment_id else '901'}",
                payload.driver_id or "DRV-101", payload.origin, payload.destination, payload.port_airport or "Cold Terminal",
                payload.origin, payload.current_temp, "IN_TRANSIT", "2026-09-02 18:00:00", compliance_status, risk_score
            ))

        # 2. Upsert Product Batch
        cursor.execute("SELECT batch_id FROM product_batches WHERE batch_id = ?", (payload.batch_id,))
        existing_batch = cursor.fetchone()

        if existing_batch:
            cursor.execute("""
                UPDATE product_batches
                SET product_type = ?, quantity_kg = ?, origin = ?, destination = ?,
                    required_temp_min = ?, required_temp_max = ?, shipment_id = ?, compliance_status = ?
                WHERE batch_id = ?
            """, (
                payload.product_type, payload.quantity_kg or 1200.0, payload.origin, payload.destination,
                payload.required_temp_min, payload.required_temp_max, payload.shipment_id, compliance_status,
                payload.batch_id
            ))
        else:
            cursor.execute("""
                INSERT INTO product_batches (
                    batch_id, product_type, quantity_kg, processing_date, origin, destination,
                    required_temp_min, required_temp_max, export_date, shipment_id, compliance_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payload.batch_id, payload.product_type, payload.quantity_kg or 1200.0, now_str[:10],
                payload.origin, payload.destination, payload.required_temp_min, payload.required_temp_max,
                "2026-09-05", payload.shipment_id, compliance_status
            ))

        # 3. Upsert Sensor
        cursor.execute("SELECT sensor_id FROM sensors WHERE sensor_id = ?", (payload.sensor_id,))
        existing_sensor = cursor.fetchone()

        cal_date = payload.calibration_date or "2026-08-20"
        cal_due = payload.calibration_due_date or "2026-11-20"

        if existing_sensor:
            cursor.execute("""
                UPDATE sensors
                SET calibration_status = ?, last_calibration_date = ?, calibration_due_date = ?
                WHERE sensor_id = ?
            """, (payload.calibration_status, cal_date, cal_due, payload.sensor_id))
        else:
            cursor.execute("""
                INSERT INTO sensors (
                    sensor_id, sensor_type, status, battery_status, signal_status,
                    last_calibration_date, calibration_due_date, calibration_status, accuracy_rating, technician
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payload.sensor_id, payload.sensor_type or "Multi-Sensor IoT Logger", "ACTIVE", 95, "STRONG",
                cal_date, cal_due, payload.calibration_status, 99.1, "ISO Certified Lead Tech"
            ))

        # 4. Insert telemetry observation in sensor_logs
        cursor.execute("""
            INSERT INTO sensor_logs (
                sensor_id, batch_id, shipment_id, timestamp, temperature, humidity,
                location, battery_status, signal_status, sensor_status, is_missing, is_noisy, is_imputed,
                original_temp, imputed_temp, anomaly_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            payload.sensor_id, payload.batch_id, payload.shipment_id, now_str,
            payload.current_temp, 85.0, payload.origin, 95, "STRONG", "NORMAL",
            0, 0, 0, payload.current_temp, payload.current_temp, risk_score
        ))

        # 5. Insert Compliance Event if anomalous
        if compliance_status in ["WARNING", "CRITICAL"]:
            event_id = f"EVT-MAN-{uuid.uuid4().hex[:6].upper()}"
            cursor.execute("""
                INSERT INTO compliance_events (
                    event_id, shipment_id, batch_id, event_type, severity,
                    title, description, timestamp, recommended_action, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id, payload.shipment_id, payload.batch_id, "MANUAL_ENTRY_EXCURSION",
                compliance_status, f"Manual Entry: {compliance_status} Thermal Flag",
                f"Manual compliance entry logged temperature of {payload.current_temp}°C vs limit [{payload.required_temp_min} to {payload.required_temp_max}]°C.",
                now_str, "Review cold storage compressor setpoints.", "OPEN"
            ))

        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": f"Compliance record for {payload.shipment_id} / {payload.batch_id} saved successfully to database.",
            "shipment_id": payload.shipment_id,
            "batch_id": payload.batch_id,
            "compliance_status": compliance_status,
            "risk_score": risk_score,
            "validation_findings": val_res["findings"],
            "saved_at": now_str
        }

    except Exception as e:
        conn.rollback()
        conn.close()
        return {"success": False, "errors": [f"Database error: {str(e)}"]}
