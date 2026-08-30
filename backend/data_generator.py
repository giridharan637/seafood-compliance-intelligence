import os
import sys
import random
import datetime
import sqlite3
from typing import Any

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database import get_db_connection, init_db

PRODUCTS: list[dict[str, Any]] = [
    {"name": "Atlantic Salmon (Fresh)", "temp_min": 0.0, "temp_max": 3.5, "frozen": False},
    {"name": "Yellowfin Tuna (Super-Frozen)", "temp_min": -55.0, "temp_max": -50.0, "frozen": True},
    {"name": "Pacific Cod (Frozen Fillets)", "temp_min": -22.0, "temp_max": -18.0, "frozen": True},
    {"name": "King Crab Legs (Cooked/Frozen)", "temp_min": -24.0, "temp_max": -18.0, "frozen": True},
    {"name": "Black Tiger Shrimp (Chilled)", "temp_min": 0.5, "temp_max": 4.0, "frozen": False},
    {"name": "Maine Lobster (Live)", "temp_min": 2.0, "temp_max": 6.0, "frozen": False},
    {"name": "Pacific Oysters (Live Shellstock)", "temp_min": 1.0, "temp_max": 5.0, "frozen": False},
]

ORIGINS = [
    "Anchorage Cold Storage Facility (AK)",
    "Seattle Pier 91 Logistics Center (WA)",
    "Portland Marine Terminal (OR)",
    "Vancouver Pacific Processing Hub (BC)",
    "Kodiak Island Seafood Dock (AK)",
    "Boston Harbor Freight Terminal (MA)"
]

DESTINATIONS = [
    "Tokyo Haneda Cargo Center (HND - Japan)",
    "Shanghai Pudong Int'l Freight Hub (PVG - China)",
    "Frankfurt Airport Cold Logistics (FRA - Germany)",
    "Seoul Incheon Cargo Terminal (ICN - South Korea)",
    "Singapore Changi Freight Hub (SIN - Singapore)",
    "Los Angeles Int'l Cargo Center (LAX - USA)"
]

PORTS_AIRPORTS = [
    "Ted Stevens Anchorage Int'l Airport (ANC)",
    "Seattle-Tacoma Cargo Gate 4 (SEA)",
    "Port of Seattle Terminal 18",
    "Vancouver Freight Gate B",
    "Los Angeles Freight Gateway 3"
]

TECHNICIANS = ["Dr. Sarah Chen (CQA)", "Marcus Vance (Lead Tech)", "Elena Rostova (ISO Auditor)", "David Miller (Quality Ops)", "Aisha Patel (Calibration Eng)"]

DRIVERS: list[dict[str, Any]] = [
    {"id": "DRV-101", "name": "John Miller", "hours": 6.5, "rest": 12.0, "assignments": 1},
    {"id": "DRV-102", "name": "Robert Chen", "hours": 7.0, "rest": 11.5, "assignments": 1},
    {"id": "DRV-103", "name": "Maria Garcia", "hours": 10.5, "rest": 5.5, "assignments": 3},  # Unsafe
    {"id": "DRV-104", "name": "James Wilson", "hours": 5.5, "rest": 14.0, "assignments": 1},
    {"id": "DRV-105", "name": "David Kim", "hours": 9.5, "rest": 7.0, "assignments": 2},    # Unsafe
    {"id": "DRV-106", "name": "Anna Kowalski", "hours": 4.0, "rest": 16.0, "assignments": 1},
    {"id": "DRV-107", "name": "Carlos Rodriguez", "hours": 11.0, "rest": 4.5, "assignments": 3},  # Unsafe
    {"id": "DRV-108", "name": "Samantha Lee", "hours": 6.0, "rest": 13.0, "assignments": 1},
]

HANDOVER_ROLES: list[tuple[str, str]] = [
    ("Processing Facility Supervisor", "Cold Storage Warehouse Lead"),
    ("Cold Storage Warehouse Lead", "Refrigerated Truck Transport Specialist"),
    ("Refrigerated Truck Transport Specialist", "Airport Cargo Ramp Agent"),
    ("Airport Cargo Ramp Agent", "Customs Export Inspector"),
    ("Customs Export Inspector", "Airline Cold Chain Specialist")
]

def generate_dataset(target_total_records: int = 10000) -> None:
    """
    Generates interconnected operational records targeting total records across tables.
    Default target_total_records = 10000.
    """
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear existing data
    tables = ["product_batches", "shipments", "sensors", "sensor_logs", 
              "sensor_calibrations", "handover_records", "route_events", 
              "worker_logs", "compliance_events", "ml_predictions"]
    for t in tables:
        cursor.execute(f"DELETE FROM {t}")
    conn.commit()

    # Scale number of shipments and log density based on target total records
    # Approximate ratio: 1 shipment has 1 batch, 1 sensor, 3-5 calibrations/handovers/routes, and N sensor logs
    num_shipments = max(20, target_total_records // 150)
    logs_per_shipment = max(30, (target_total_records - (num_shipments * 15)) // num_shipments)

    base_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)

    # 1. Generate Workers
    for d in DRIVERS:
        is_unsafe = (d["hours"] > 8.0 or d["rest"] < 10.0 or d["assignments"] > 2)
        safety_status = "UNSAFE" if is_unsafe else "SAFE"
        workload_score = round(min(1.0, (d["hours"] / 8.0) * 0.5 + (d["assignments"] / 2.0) * 0.5), 2)
        cursor.execute("""
            INSERT INTO worker_logs (worker_id, driver_id, driver_name, working_hours, rest_hours, active_assignments, workload_score, safety_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"WRK-{d['id']}", d["id"], d["name"], d["hours"], d["rest"], d["assignments"], workload_score, safety_status))

    # 2. Generate Sensors
    sensors_list: list[dict[str, Any]] = []
    for s_idx in range(1, num_shipments + 5):
        sensor_id = f"SNS-{1000 + s_idx}"
        is_expired = (random.random() < 0.05) # 5% expired calibration
        last_cal = base_time - datetime.timedelta(days=random.randint(100, 200) if is_expired else random.randint(10, 60))
        due_cal = last_cal + datetime.timedelta(days=90)
        cal_status = "EXPIRED" if is_expired or due_cal < base_time else "VALID"
        accuracy = round(random.uniform(98.5, 99.9), 2)
        tech = random.choice(TECHNICIANS)

        sensor_entry = {
            "sensor_id": sensor_id,
            "sensor_type": "IoT Multi-Sensor (Temp/Humidity/GPS)",
            "status": "ACTIVE" if not is_expired else "WARNING",
            "battery_status": random.randint(65, 100),
            "signal_status": random.choice(["EXCELLENT", "GOOD", "FAIR"]),
            "last_calibration_date": last_cal.strftime("%Y-%m-%d"),
            "calibration_due_date": due_cal.strftime("%Y-%m-%d"),
            "calibration_status": cal_status,
            "accuracy_rating": accuracy,
            "technician": tech
        }
        sensors_list.append(sensor_entry)

        cursor.execute("""
            INSERT INTO sensors (sensor_id, sensor_type, status, battery_status, signal_status, last_calibration_date, calibration_due_date, calibration_status, accuracy_rating, technician)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, tuple(sensor_entry.values()))

        # Calibration Record
        cursor.execute("""
            INSERT INTO sensor_calibrations (calibration_id, sensor_id, calibration_date, calibration_due_date, calibration_status, accuracy, technician, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"CAL-{1000 + s_idx}", sensor_id, sensor_entry["last_calibration_date"], sensor_entry["calibration_due_date"], cal_status, accuracy, tech, f"ISO 17025 Certified calibration check - Status: {cal_status}"))

    # 3. Generate Shipments, Batches, Handovers, Route Events, Sensor Logs, Alerts
    total_logs_created = 0

    for idx in range(1, num_shipments + 1):
        shipment_id = f"SHP-2026-{100 + idx}"
        batch_id = f"BTC-SEA-{5000 + idx}"
        product = random.choice(PRODUCTS)
        origin = random.choice(ORIGINS)
        destination = random.choice(DESTINATIONS)
        port_ap = random.choice(PORTS_AIRPORTS)
        driver = random.choice(DRIVERS)
        sensor = sensors_list[(idx - 1) % len(sensors_list)]

        ship_start = base_time + datetime.timedelta(hours=idx * 2)
        eta_time = ship_start + datetime.timedelta(hours=random.randint(18, 36))
        export_date = (ship_start + datetime.timedelta(days=1)).strftime("%Y-%m-%d")

        # Determine anomaly flags for this shipment
        has_temp_spike = (random.random() < 0.12)   # 12% of shipments have temp anomaly
        has_missing_data = (random.random() < 0.15) # 15% have missing sensor gaps
        has_route_delay = (random.random() < 0.10)  # 10% have route delay
        has_calibration_issue = (sensor["calibration_status"] == "EXPIRED")

        shipment_status = random.choice(["IN_TRANSIT", "AT_PORT", "INSPECTION_PASSED", "DELIVERED"])
        compliance_status = "CRITICAL" if (has_temp_spike or has_calibration_issue) else ("WARNING" if (has_missing_data or has_route_delay) else "NORMAL")
        risk_score = round(random.uniform(0.75, 0.98) if compliance_status == "CRITICAL" else (random.uniform(0.40, 0.70) if compliance_status == "WARNING" else random.uniform(0.02, 0.30)), 2)

        # Batch Record
        cursor.execute("""
            INSERT INTO product_batches (batch_id, product_type, quantity_kg, processing_date, origin, destination, required_temp_min, required_temp_max, export_date, shipment_id, compliance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (batch_id, product["name"], round(random.uniform(500, 4500), 1), ship_start.strftime("%Y-%m-%d"), origin, destination, product["temp_min"], product["temp_max"], export_date, shipment_id, compliance_status))

        # Shipment Record
        initial_temp = round(random.uniform(product["temp_min"] + 0.5, product["temp_max"] - 0.5), 1)
        cursor.execute("""
            INSERT INTO shipments (shipment_id, vehicle_id, driver_id, origin, destination, port_airport, current_location, current_temp, shipment_status, eta, compliance_status, risk_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (shipment_id, f"TRK-{200 + idx}", driver["id"], origin, destination, port_ap, f"En route on Interstate 5 / Hwy ({origin.split()[0]} sector)", initial_temp, shipment_status, eta_time.strftime("%Y-%m-%d %H:%M UTC"), compliance_status, risk_score))

        # Handovers
        for h_idx, (from_p, to_p) in enumerate(HANDOVER_ROLES):
            h_time = ship_start + datetime.timedelta(hours=h_idx * 4)
            h_status = "VERIFIED" if not (h_idx == 2 and has_missing_data and random.random() < 0.3) else "INCOMPLETE_DOCUMENTATION"
            cursor.execute("""
                INSERT INTO handover_records (handover_id, batch_id, shipment_id, from_person, to_person, timestamp, location, condition, handover_status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"HND-{idx:03d}-{h_idx+1}", batch_id, shipment_id, from_p, to_p, h_time.strftime("%Y-%m-%d %H:%M UTC"), f"Checkpoint {h_idx+1} ({origin.split()[0]})", "Intact Seal, Cold Chain Maintained" if h_status == "VERIFIED" else "Custody signature delayed", h_status, "Automated RFID & Temperature log verification"))

        # Route Events
        route_stages = [
            ("Batch Creation", 0, "COMPLETED"),
            ("Cold Storage Exit & Loading", 1, "COMPLETED"),
            ("Transit Checkpoint Alpha", 5, "DELAYED" if has_route_delay else "ON_TIME"),
            ("Port / Airport Logistics Ramp", 12, "ON_TIME"),
            ("Export Inspection Dock", 18, "ON_TIME"),
            ("Final Aircraft / Vessel Loading", 22, "SCHEDULED")
        ]
        for r_idx, (stage_name, hrs_offset, r_status) in enumerate(route_stages):
            r_time = ship_start + datetime.timedelta(hours=hrs_offset)
            delay = random.randint(45, 120) if r_status == "DELAYED" else 0
            cursor.execute("""
                INSERT INTO route_events (route_id, shipment_id, event_type, timestamp, location, delay_minutes, route_status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"RTE-{idx:03d}-{r_idx+1}", shipment_id, stage_name, r_time.strftime("%Y-%m-%d %H:%M UTC"), f"Stage {r_idx+1} Location", delay, r_status, f"Traffic congestion causing {delay} min delay" if delay > 0 else "Normal transit progression"))

        # Sensor Logs generation for this shipment
        curr_time = ship_start
        temp_nominal_min = product["temp_min"]
        temp_nominal_max = product["temp_max"]

        for l_idx in range(logs_per_shipment):
            curr_time += datetime.timedelta(minutes=15)
            timestamp_str = curr_time.strftime("%Y-%m-%d %H:%M UTC")

            # Determine log anomaly status
            is_missing = 1 if (has_missing_data and random.random() < 0.18) else 0
            is_noisy = 1 if (random.random() < 0.04) else 0
            is_spike = (has_temp_spike and (logs_per_shipment * 0.4 <= l_idx <= logs_per_shipment * 0.65))

            if is_spike:
                # Temperature breach
                actual_temp = round(temp_nominal_max + random.uniform(2.5, 7.0), 2)
            elif is_noisy:
                # Random sensor noise reading
                actual_temp = round(random.uniform(-40.0, 35.0), 2)
            else:
                # Normal nominal temperature
                actual_temp = round(random.uniform(temp_nominal_min + 0.2, temp_nominal_max - 0.2), 2)

            original_temp = actual_temp
            imputed_temp = actual_temp
            is_imputed = 0

            # Missing reading handling
            if is_missing:
                actual_temp = None

            humidity: float | None = round(random.uniform(85.0, 96.0), 1) if actual_temp is not None else None
            batt = max(10, 100 - (l_idx // 10))
            sig = random.choice(["EXCELLENT", "GOOD", "FAIR"]) if not is_missing else "DISCONNECTED"
            sensor_status = "CRITICAL" if is_spike else ("WARNING" if (is_noisy or is_missing) else "NORMAL")

            cursor.execute("""
                INSERT INTO sensor_logs (sensor_id, batch_id, shipment_id, timestamp, temperature, humidity, location, battery_status, signal_status, sensor_status, is_missing, is_noisy, is_imputed, original_temp, imputed_temp, anomaly_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (sensor["sensor_id"], batch_id, shipment_id, timestamp_str, actual_temp, humidity, f"GPS: {47.6 + l_idx*0.01:.4f} N, {-122.3 - l_idx*0.01:.4f} W", batt, sig, sensor_status, is_missing, is_noisy, is_imputed, original_temp, imputed_temp, 0.85 if is_spike else (0.45 if is_noisy else 0.05)))
            
            total_logs_created += 1

        # Compliance Events & ML Predictions
        if has_temp_spike:
            cursor.execute("""
                INSERT INTO compliance_events (event_id, shipment_id, batch_id, event_type, severity, title, description, timestamp, recommended_action, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"EVT-{idx:03d}-01", shipment_id, batch_id, "TEMPERATURE_EXCURSION", "CRITICAL", "Cold Chain Thermal Breach Detected", f"Temperature reached +{random.uniform(6, 11):.1f}°C exceeding product threshold ({product['temp_max']}°C)", ship_start.strftime("%Y-%m-%d %H:%M UTC"), "Immediate inspector physical quality audit & thermal data download required", "OPEN"))

            cursor.execute("""
                INSERT INTO ml_predictions (prediction_id, batch_id, anomaly_type, severity, confidence, timestamp, sensor_id, recommended_action, risk_level, contributing_factors)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"PRED-{idx:03d}-01", batch_id, "Thermal Excursion Anomaly", "CRITICAL", 0.94, ship_start.strftime("%Y-%m-%d %H:%M UTC"), sensor["sensor_id"], "Quarantine batch for organoleptic evaluation", "HIGH", "Spike duration > 45 mins; Max temp +7.2°C; Fresh seafood spoilage risk high"))

        if has_calibration_issue:
            cursor.execute("""
                INSERT INTO compliance_events (event_id, shipment_id, batch_id, event_type, severity, title, description, timestamp, recommended_action, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"EVT-{idx:03d}-02", shipment_id, batch_id, "CALIBRATION_EXPIRED", "HIGH", "Uncalibrated Sensor in Operation", f"Sensor {sensor['sensor_id']} calibration expired on {sensor['calibration_due_date']}", ship_start.strftime("%Y-%m-%d %H:%M UTC"), "Swap sensor with certified unit at next route checkpoint", "OPEN"))

        if has_missing_data:
            cursor.execute("""
                INSERT INTO compliance_events (event_id, shipment_id, batch_id, event_type, severity, title, description, timestamp, recommended_action, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"EVT-{idx:03d}-03", shipment_id, batch_id, "TELEMETRY_GAP", "WARNING", "Missing Sensor Telemetry Records", "Gaps detected in continuous 15-minute sensor logging stream", ship_start.strftime("%Y-%m-%d %H:%M UTC"), "Apply forward-fill imputation and flag in evidence pack", "RESOLVED"))

    # Initial Demo Feedback Entries
    cursor.execute("""
        INSERT INTO user_feedback (role, usability_rating, report_clarity, alert_usefulness, evidence_pack_usefulness, ease_of_navigation, comments, submitted_at, is_demo)
        VALUES 
        ('Compliance Officer', 5, 5, 5, 5, 4, 'The automated evidence pack saved us 4 hours per shipment during export clearance!', '2026-08-25 14:30 UTC', 1),
        ('Transport Manager', 4, 4, 5, 4, 5, 'The unsafe driver assignment alert prevented a severe safety violation at our hub.', '2026-08-26 09:15 UTC', 1),
        ('Lead ISO Auditor', 5, 5, 4, 5, 5, 'Audit reports contain every necessary calibration, custody, and sensor log line item.', '2026-08-27 11:00 UTC', 1)
    """)

    conn.commit()
    conn.close()

    print(f"Successfully generated dataset with {num_shipments} shipments and {total_logs_created} sensor logs (Total dataset records > {target_total_records}).")

if __name__ == "__main__":
    generate_dataset(10000)
