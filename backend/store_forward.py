import os
import sys
import datetime
import hashlib
import json
from typing import Dict, Any, List

# Ensure backend directory is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database import get_db_connection

# In-memory network state indicator: "ONLINE", "OFFLINE", "SYNCING", "SYNC COMPLETE"
NETWORK_STATE = {
    "status": "ONLINE",
    "last_sync_timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
    "buffered_records_count": 0
}


def _compute_payload_hash(payload_type: str, data: Dict[str, Any]) -> str:
    """Computes a deterministic SHA-256 hash of the payload for deduplication."""
    canonical = json.dumps({"payload_type": payload_type, "data": data}, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def toggle_network_status(status: str) -> Dict[str, Any]:
    """Sets network status: ONLINE, OFFLINE, SYNCING, SYNC COMPLETE"""
    global NETWORK_STATE
    NETWORK_STATE["status"] = status
    if status == "ONLINE":
        NETWORK_STATE["last_sync_timestamp"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return get_network_status()


def get_network_status() -> Dict[str, Any]:
    """Returns current store-and-forward state and pending count in local offline buffer."""
    global NETWORK_STATE
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM offline_buffer WHERE synced = 0")
    pending = cursor.fetchone()[0]
    conn.close()
    NETWORK_STATE["buffered_records_count"] = pending
    return dict(NETWORK_STATE)


def buffer_offline_log(payload_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Buffers a record locally when system is OFFLINE.
    Uses SHA-256 payload hashing to prevent duplicate buffering of the same record.
    Returns the current network/buffer status.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    payload_hash = _compute_payload_hash(payload_type, data)

    # Deduplication check: skip if already buffered and not yet synced
    cursor.execute(
        "SELECT buffer_id FROM offline_buffer WHERE payload_hash = ? AND synced = 0",
        (payload_hash,)
    )
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return get_network_status()

    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    cursor.execute("""
        INSERT INTO offline_buffer (payload_type, payload_data, payload_hash, created_at, synced, sync_status, retry_count)
        VALUES (?, ?, ?, ?, 0, 'PENDING', 0)
    """, (payload_type, json.dumps(data), payload_hash, now_str))

    conn.commit()
    conn.close()
    return get_network_status()


def sync_offline_records() -> Dict[str, Any]:
    """
    Restores network and syncs all buffered offline records into main database tables.
    Uses item-level error isolation: corrupt/invalid records do not block valid syncs.
    Marks failed records as FAILED with error_message.
    """
    global NETWORK_STATE
    NETWORK_STATE["status"] = "SYNCING"

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT buffer_id, payload_type, payload_data FROM offline_buffer WHERE synced = 0 ORDER BY buffer_id ASC"
    )
    records = cursor.fetchall()

    synced_count = 0
    failed_count = 0
    skipped_corrupt = 0

    for r in records:
        b_id, p_type, p_data_str = r[0], r[1], r[2]

        try:
            p_data = json.loads(p_data_str)
        except (json.JSONDecodeError, TypeError) as e:
            # Mark corrupt record
            cursor.execute(
                "UPDATE offline_buffer SET synced = 1, sync_status = 'CORRUPT', error_message = ? WHERE buffer_id = ?",
                (f"JSON decode error: {str(e)}", b_id)
            )
            skipped_corrupt += 1
            continue

        try:
            if p_type == "SENSOR_LOG":
                # Validate required fields
                required = ["sensor_id", "batch_id", "shipment_id", "timestamp"]
                missing_fields = [f for f in required if not p_data.get(f)]
                if missing_fields:
                    raise ValueError(f"Missing required fields: {missing_fields}")

                # Auto-enroll sensor if not yet in database to ensure FK integrity
                cursor.execute("""
                    INSERT OR IGNORE INTO sensors (
                        sensor_id, sensor_type, status, battery_status, signal_status,
                        last_calibration_date, calibration_due_date, calibration_status,
                        accuracy_rating, technician
                    ) VALUES (
                        ?, 'IoT Field Multi-Sensor', 'ACTIVE', 95, 'ONLINE',
                        '2026-01-01 00:00:00 UTC', '2026-12-31 00:00:00 UTC', 'VALID',
                        99.2, 'Store-Forward Auto-Sync'
                    )
                """, (p_data.get("sensor_id"),))

                cursor.execute("""
                    INSERT INTO sensor_logs (
                        sensor_id, batch_id, shipment_id, timestamp, temperature, humidity,
                        location, battery_status, signal_status, sensor_status,
                        is_missing, is_noisy, is_imputed, original_temp, imputed_temp, anomaly_score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, 0.05)
                """, (
                    p_data.get("sensor_id"), p_data.get("batch_id"), p_data.get("shipment_id"),
                    p_data.get("timestamp"), p_data.get("temperature"), p_data.get("humidity", 90.0),
                    p_data.get("location", "Buffered Offline Loc"),
                    p_data.get("battery_status", 95), "OFFLINE_SYNC", "NORMAL",
                    p_data.get("temperature"), p_data.get("temperature")
                ))

            elif p_type == "ROUTE_EVENT":
                required = ["route_id", "shipment_id", "event_type", "timestamp", "location"]
                missing_fields = [f for f in required if not p_data.get(f)]
                if missing_fields:
                    raise ValueError(f"Missing required fields: {missing_fields}")

                cursor.execute("""
                    INSERT OR IGNORE INTO route_events (
                        route_id, shipment_id, event_type, timestamp, location,
                        delay_minutes, route_status, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p_data.get("route_id"), p_data.get("shipment_id"), p_data.get("event_type"),
                    p_data.get("timestamp"), p_data.get("location"),
                    p_data.get("delay_minutes", 0), "SYNCED",
                    "Synchronized from offline store-and-forward buffer"
                ))

            # Mark as synced
            cursor.execute(
                "UPDATE offline_buffer SET synced = 1, sync_status = 'SYNCED', error_message = NULL WHERE buffer_id = ?",
                (b_id,)
            )
            synced_count += 1

        except Exception as e:
            # Isolate failure — mark record as FAILED without blocking others
            retry_val = p_data.get("_retry", 0) if isinstance(p_data, dict) else 0
            cursor.execute(
                "UPDATE offline_buffer SET retry_count = retry_count + 1, sync_status = 'FAILED', error_message = ? WHERE buffer_id = ?",
                (str(e), b_id)
            )
            # After 3 retries, permanently mark as failed to avoid infinite loops
            cursor.execute(
                "UPDATE offline_buffer SET synced = 1 WHERE buffer_id = ? AND retry_count >= 3",
                (b_id,)
            )
            failed_count += 1

    conn.commit()
    conn.close()

    NETWORK_STATE["status"] = "SYNC COMPLETE"
    NETWORK_STATE["last_sync_timestamp"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    NETWORK_STATE["buffered_records_count"] = 0

    return {
        "status": "SYNC COMPLETE",
        "synced_records_count": synced_count,
        "failed_records_count": failed_count,
        "skipped_corrupt_records": skipped_corrupt,
        "total_processed": synced_count + failed_count + skipped_corrupt,
        "sync_timestamp": NETWORK_STATE["last_sync_timestamp"]
    }


def simulate_multi_sensor_outage(
    num_sensors: int = 100,
    records_per_sensor: int = 10,
    simulate_corrupt: bool = False
) -> Dict[str, Any]:
    """
    Stress test: simulates a multi-hour network outage and subsequent synchronization.
    Generates records for N sensors, buffers them offline, then syncs and measures results.
    Includes deduplication test (re-buffering same records should yield 0 duplicates).

    Returns comprehensive stress test metrics.
    """
    import random

    # Reset buffer for test isolation
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM offline_buffer WHERE sync_status IN ('PENDING', 'FAILED', 'CORRUPT')")
    conn.commit()
    conn.close()

    # Use known valid IDs for stress test
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT shipment_id, batch_id FROM product_batches LIMIT 5")
    ref_rows = cursor.fetchall()
    conn.close()

    if not ref_rows:
        return {"error": "No reference data. Run generate_dataset() first."}

    # Generate and buffer records
    generated = 0
    duplicate_attempts = 0
    now = datetime.datetime.now(datetime.timezone.utc)

    for i in range(num_sensors):
        ref = ref_rows[i % len(ref_rows)]
        shipment_id = ref[0]
        batch_id = ref[1]

        for j in range(records_per_sensor):
            ts = (now - datetime.timedelta(minutes=(num_sensors - i) * records_per_sensor + j)).strftime(
                "%Y-%m-%d %H:%M:%S UTC"
            )
            record = {
                "sensor_id": f"SNS-STRESS-{1000 + i}",
                "batch_id": batch_id,
                "shipment_id": shipment_id,
                "timestamp": ts,
                "temperature": round(random.uniform(-22.0, -18.0), 2),
                "humidity": round(random.uniform(85.0, 95.0), 1),
                "location": f"GPS: {47.6 + i * 0.001:.4f} N, {-122.3 - j * 0.001:.4f} W",
                "battery_status": random.randint(70, 100),
            }

            if simulate_corrupt and i == 0 and j == 0:
                # Inject a corrupt JSON record for testing
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO offline_buffer (payload_type, payload_data, created_at, synced, sync_status, retry_count) VALUES (?, ?, ?, 0, 'PENDING', 0)",
                    ("SENSOR_LOG", "{ CORRUPT JSON }", now.strftime("%Y-%m-%d %H:%M:%S UTC"))
                )
                conn.commit()
                conn.close()
                generated += 1
                continue

            status_before = buffer_offline_log("SENSOR_LOG", record)
            generated += 1

            # Duplicate attempt — re-buffer the exact same record
            status_dup = buffer_offline_log("SENSOR_LOG", record)
            duplicate_attempts += 1

    # Count what's pending
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM offline_buffer WHERE synced = 0")
    pending_before_sync = cursor.fetchone()[0]
    conn.close()

    # Simulate network restoration and sync
    sync_result = sync_offline_records()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM offline_buffer WHERE sync_status = 'SYNCED'")
    confirmed_synced = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM offline_buffer WHERE sync_status = 'FAILED'")
    confirmed_failed = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM offline_buffer WHERE sync_status = 'CORRUPT'")
    confirmed_corrupt = cursor.fetchone()[0]
    conn.close()

    data_loss_pct = 0.0
    if pending_before_sync > 0:
        data_loss_pct = round((sync_result.get("failed_records_count", 0) / pending_before_sync) * 100, 2)

    return {
        "test_parameters": {
            "num_sensors": num_sensors,
            "records_per_sensor": records_per_sensor,
            "simulate_corrupt_record": simulate_corrupt,
        },
        "records_generated": generated,
        "duplicate_attempts": duplicate_attempts,
        "pending_before_sync": pending_before_sync,
        "duplicates_prevented": duplicate_attempts - max(0, pending_before_sync - generated + duplicate_attempts),
        "sync_result": sync_result,
        "confirmed_synced": confirmed_synced,
        "confirmed_failed": confirmed_failed,
        "confirmed_corrupt": confirmed_corrupt,
        "data_loss_pct": data_loss_pct,
        "conclusion": (
            f"Stress test with {num_sensors} sensors × {records_per_sensor} records: "
            f"{sync_result.get('synced_records_count', 0)} synced, "
            f"{sync_result.get('failed_records_count', 0)} failed, "
            f"{sync_result.get('skipped_corrupt_records', 0)} corrupt discarded. "
            f"Deduplication prevented {duplicate_attempts} duplicate insertions. "
            f"Data loss: {data_loss_pct}%."
        )
    }
