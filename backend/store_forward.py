import os
import sys
import datetime
import json
from typing import Dict, Any

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

def toggle_network_status(status: str) -> Dict[str, Any]:
    """
    Sets network status: ONLINE, OFFLINE, SYNCING, SYNC COMPLETE
    """
    global NETWORK_STATE
    NETWORK_STATE["status"] = status
    if status == "ONLINE":
        NETWORK_STATE["last_sync_timestamp"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return get_network_status()

def get_network_status() -> Dict[str, Any]:
    """
    Returns current store-and-forward state and pending count in local offline buffer.
    """
    global NETWORK_STATE
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM offline_buffer WHERE synced = 0")
    pending = cursor.fetchone()[0]

    conn.close()

    NETWORK_STATE["buffered_records_count"] = pending
    return NETWORK_STATE

def buffer_offline_log(payload_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Buffers a record locally when system is OFFLINE.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO offline_buffer (payload_type, payload_data, created_at, synced)
        VALUES (?, ?, ?, 0)
    """, (payload_type, json.dumps(data), datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")))

    conn.commit()
    conn.close()

    return get_network_status()

def sync_offline_records() -> Dict[str, Any]:
    """
    Restores network and syncs all buffered offline records into main database tables.
    """
    global NETWORK_STATE
    NETWORK_STATE["status"] = "SYNCING"

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT buffer_id, payload_type, payload_data FROM offline_buffer WHERE synced = 0")
    records = cursor.fetchall()

    synced_count = 0
    for r in records:
        b_id, p_type, p_data_str = r[0], r[1], r[2]
        p_data = json.loads(p_data_str)

        if p_type == "SENSOR_LOG":
            cursor.execute("""
                INSERT INTO sensor_logs (sensor_id, batch_id, shipment_id, timestamp, temperature, humidity, location, battery_status, signal_status, sensor_status, is_missing, is_noisy, is_imputed, original_temp, imputed_temp, anomaly_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, 0.05)
            """, (p_data.get("sensor_id"), p_data.get("batch_id"), p_data.get("shipment_id"), p_data.get("timestamp"), p_data.get("temperature"), p_data.get("humidity", 90.0), p_data.get("location", "Buffered Offline Loc"), p_data.get("battery_status", 95), "OFFLINE_SYNC", "NORMAL", p_data.get("temperature"), p_data.get("temperature")))
        
        elif p_type == "ROUTE_EVENT":
            cursor.execute("""
                INSERT INTO route_events (route_id, shipment_id, event_type, timestamp, location, delay_minutes, route_status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (p_data.get("route_id"), p_data.get("shipment_id"), p_data.get("event_type"), p_data.get("timestamp"), p_data.get("location"), p_data.get("delay_minutes", 0), "SYNCED", "Synchronized from offline store-and-forward buffer"))

        cursor.execute("UPDATE offline_buffer SET synced = 1 WHERE buffer_id = ?", (b_id,))
        synced_count += 1

    conn.commit()
    conn.close()

    NETWORK_STATE["status"] = "SYNC COMPLETE"
    NETWORK_STATE["last_sync_timestamp"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    NETWORK_STATE["buffered_records_count"] = 0

    return {
        "status": "SYNC COMPLETE",
        "synced_records_count": synced_count,
        "sync_timestamp": NETWORK_STATE["last_sync_timestamp"]
    }
