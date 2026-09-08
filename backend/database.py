import os
import sys
import sqlite3
from typing import Dict, Any

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

DB_PATH = os.path.join(CURRENT_DIR, "seafood_compliance.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Product Batches
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS product_batches (
        batch_id TEXT PRIMARY KEY,
        product_type TEXT NOT NULL,
        quantity_kg REAL NOT NULL,
        processing_date TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        required_temp_min REAL NOT NULL,
        required_temp_max REAL NOT NULL,
        export_date TEXT NOT NULL,
        shipment_id TEXT,
        compliance_status TEXT DEFAULT 'NORMAL'
    )
    """)

    # Shipments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shipments (
        shipment_id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        port_airport TEXT NOT NULL,
        current_location TEXT NOT NULL,
        current_temp REAL NOT NULL,
        shipment_status TEXT NOT NULL,
        eta TEXT NOT NULL,
        compliance_status TEXT DEFAULT 'NORMAL',
        risk_score REAL DEFAULT 0.0
    )
    """)

    # Sensors
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensors (
        sensor_id TEXT PRIMARY KEY,
        sensor_type TEXT NOT NULL,
        status TEXT NOT NULL,
        battery_status INTEGER NOT NULL,
        signal_status TEXT NOT NULL,
        last_calibration_date TEXT NOT NULL,
        calibration_due_date TEXT NOT NULL,
        calibration_status TEXT NOT NULL,
        accuracy_rating REAL NOT NULL,
        technician TEXT NOT NULL
    )
    """)

    # Sensor Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensor_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        shipment_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        temperature REAL,
        humidity REAL,
        location TEXT,
        battery_status INTEGER,
        signal_status TEXT,
        sensor_status TEXT,
        is_missing INTEGER DEFAULT 0,
        is_noisy INTEGER DEFAULT 0,
        is_imputed INTEGER DEFAULT 0,
        original_temp REAL,
        imputed_temp REAL,
        anomaly_score REAL DEFAULT 0.0,
        FOREIGN KEY (batch_id) REFERENCES product_batches (batch_id),
        FOREIGN KEY (shipment_id) REFERENCES shipments (shipment_id),
        FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id)
    )
    """)

    # Index for frequently queried columns in sensor_logs
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_sensor_logs_batch_id ON sensor_logs(batch_id)
    """)
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_sensor_logs_shipment_id ON sensor_logs(shipment_id)
    """)

    # Sensor Calibrations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensor_calibrations (
        calibration_id TEXT PRIMARY KEY,
        sensor_id TEXT NOT NULL,
        calibration_date TEXT NOT NULL,
        calibration_due_date TEXT NOT NULL,
        calibration_status TEXT NOT NULL,
        accuracy REAL NOT NULL,
        technician TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id)
    )
    """)

    # Handover Records
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS handover_records (
        handover_id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        shipment_id TEXT NOT NULL,
        from_person TEXT NOT NULL,
        to_person TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        location TEXT NOT NULL,
        condition TEXT NOT NULL,
        handover_status TEXT NOT NULL,
        notes TEXT
    )
    """)

    # Route Events
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS route_events (
        route_id TEXT PRIMARY KEY,
        shipment_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        location TEXT NOT NULL,
        delay_minutes INTEGER DEFAULT 0,
        route_status TEXT NOT NULL,
        notes TEXT
    )
    """)

    # Worker Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS worker_logs (
        worker_id TEXT PRIMARY KEY,
        driver_id TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        working_hours REAL NOT NULL,
        rest_hours REAL NOT NULL,
        active_assignments INTEGER NOT NULL,
        workload_score REAL NOT NULL,
        safety_status TEXT NOT NULL
    )
    """)

    # Compliance Events & Alerts
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS compliance_events (
        event_id TEXT PRIMARY KEY,
        shipment_id TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        status TEXT DEFAULT 'OPEN'
    )
    """)

    # ML Predictions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ml_predictions (
        prediction_id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        anomaly_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        confidence REAL NOT NULL,
        timestamp TEXT NOT NULL,
        sensor_id TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        contributing_factors TEXT NOT NULL
    )
    """)

    # User Feedback
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_feedback (
        feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        usability_rating INTEGER NOT NULL,
        report_clarity INTEGER NOT NULL,
        alert_usefulness INTEGER NOT NULL,
        evidence_pack_usefulness INTEGER NOT NULL,
        ease_of_navigation INTEGER NOT NULL,
        comments TEXT,
        submitted_at TEXT NOT NULL,
        is_demo INTEGER DEFAULT 0
    )
    """)

    # System Settings / Offline Sync State
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # Offline Store & Forward Buffer — enhanced schema with deduplication support
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS offline_buffer (
        buffer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload_type TEXT NOT NULL,
        payload_data TEXT NOT NULL,
        payload_hash TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'PENDING',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT
    )
    """)

    # Attempt to add new columns to offline_buffer if they don't exist yet (schema migration)
    for col_def in [
        ("payload_hash", "TEXT"),
        ("sync_status", "TEXT DEFAULT 'PENDING'"),
        ("retry_count", "INTEGER DEFAULT 0"),
        ("error_message", "TEXT"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE offline_buffer ADD COLUMN {col_def[0]} {col_def[1]}")
        except Exception:
            pass  # Column already exists — idempotent

    # Index for deduplication
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_offline_buffer_hash ON offline_buffer(payload_hash)
    """)
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_offline_buffer_synced ON offline_buffer(synced)
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
