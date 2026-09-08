"""
test_database.py — Database schema, CRUD, idempotency, and integrity tests.
"""
import pytest
import sqlite3


class TestSchema:
    """Verify all expected tables exist with required columns."""

    EXPECTED_TABLES = [
        "product_batches", "shipments", "sensors", "sensor_logs",
        "sensor_calibrations", "handover_records", "route_events",
        "worker_logs", "compliance_events", "ml_predictions",
        "user_feedback", "system_settings", "offline_buffer"
    ]

    def test_all_tables_exist(self, use_test_database):
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cursor.fetchall()}
        conn.close()
        for t in self.EXPECTED_TABLES:
            assert t in tables, f"Missing table: {t}"

    def test_offline_buffer_has_hash_column(self, use_test_database):
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(offline_buffer)")
        cols = {row[1] for row in cursor.fetchall()}
        conn.close()
        for required_col in ["payload_hash", "sync_status", "retry_count", "error_message"]:
            assert required_col in cols, f"offline_buffer missing column: {required_col}"

    def test_sensor_logs_indexes(self, use_test_database):
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = {row[0] for row in cursor.fetchall()}
        conn.close()
        assert "idx_sensor_logs_batch_id" in indexes
        assert "idx_sensor_logs_shipment_id" in indexes

    def test_offline_buffer_dedup_index(self, use_test_database):
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = {row[0] for row in cursor.fetchall()}
        conn.close()
        assert "idx_offline_buffer_hash" in indexes


class TestDataIntegrity:
    """Verify referential integrity and data counts."""

    def test_product_batches_not_empty(self):
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM product_batches")
        count = cursor.fetchone()[0]
        conn.close()
        assert count > 0, "product_batches should not be empty after dataset generation"

    def test_shipments_not_empty(self):
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM shipments")
        count = cursor.fetchone()[0]
        conn.close()
        assert count > 0

    def test_sensor_logs_not_empty(self):
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sensor_logs")
        count = cursor.fetchone()[0]
        conn.close()
        assert count > 0

    def test_batch_shipment_fk_consistency(self):
        """Every product_batch.shipment_id must reference a valid shipments row."""
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM product_batches b
            LEFT JOIN shipments s ON b.shipment_id = s.shipment_id
            WHERE b.shipment_id IS NOT NULL AND s.shipment_id IS NULL
        """)
        orphaned = cursor.fetchone()[0]
        conn.close()
        assert orphaned == 0, f"Found {orphaned} product_batches with invalid shipment_id FK"

    def test_sensor_logs_fk_consistency(self):
        """Every sensor_log.batch_id must reference a valid product_batches row."""
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM sensor_logs sl
            LEFT JOIN product_batches b ON sl.batch_id = b.batch_id
            WHERE b.batch_id IS NULL
        """)
        orphaned = cursor.fetchone()[0]
        conn.close()
        assert orphaned == 0, f"Found {orphaned} sensor_logs with invalid batch_id FK"


class TestCRUD:
    """Test basic CRUD operations on user_feedback table."""

    def test_insert_feedback(self):
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO user_feedback
            (role, usability_rating, report_clarity, alert_usefulness,
             evidence_pack_usefulness, ease_of_navigation, comments, submitted_at, is_demo)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)
        """, ("port_inspector", 5, 5, 4, 5, 4, "Test feedback from pytest."))
        conn.commit()
        fid = cursor.lastrowid
        cursor.execute("SELECT * FROM user_feedback WHERE feedback_id = ?", (fid,))
        row = cursor.fetchone()
        conn.close()
        assert row is not None
        assert row["role"] == "port_inspector"
        assert row["usability_rating"] == 5

    def test_system_settings_upsert(self):
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)",
                       ("test_key_pytest", "42"))
        conn.commit()
        cursor.execute("SELECT value FROM system_settings WHERE key = 'test_key_pytest'")
        row = cursor.fetchone()
        conn.close()
        assert row is not None
        assert row["value"] == "42"


class TestOfflineBufferDeduplication:
    """Verify that buffering the same payload hash twice does not insert duplicates."""

    def test_duplicate_prevention(self):
        from store_forward import buffer_offline_log, _compute_payload_hash
        from database import get_db_connection

        payload = {
            "sensor_id": "SNS-DEDUP-TEST",
            "batch_id": "DEDUP-BATCH",
            "shipment_id": "DEDUP-SHP",
            "timestamp": "2026-01-01 00:00:00 UTC",
            "temperature": -20.0
        }
        # Buffer twice
        buffer_offline_log("SENSOR_LOG", payload)
        buffer_offline_log("SENSOR_LOG", payload)

        # Check DB: only 1 record with this hash and synced=0
        ph = _compute_payload_hash("SENSOR_LOG", payload)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM offline_buffer WHERE payload_hash = ? AND synced = 0", (ph,))
        count = cursor.fetchone()[0]
        conn.close()
        assert count == 1, f"Expected 1 buffered record (dedup), got {count}"
