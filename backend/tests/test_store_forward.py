"""
test_store_forward.py — Store-and-Forward engine tests.
Tests: buffering, deduplication, sync, item-level error isolation, and stress testing.
"""
import pytest
import json


class TestNetworkToggle:
    def test_toggle_offline(self):
        from store_forward import toggle_network_status, get_network_status
        result = toggle_network_status("OFFLINE")
        assert result["status"] == "OFFLINE"

    def test_toggle_online(self):
        from store_forward import toggle_network_status
        result = toggle_network_status("ONLINE")
        assert result["status"] == "ONLINE"

    def test_get_network_status_structure(self):
        from store_forward import get_network_status
        result = get_network_status()
        assert "status" in result
        assert "buffered_records_count" in result
        assert isinstance(result["buffered_records_count"], int)


class TestBufferOfflineLog:
    def test_buffer_valid_record(self, sample_batch_id, sample_shipment_id):
        from store_forward import buffer_offline_log
        result = buffer_offline_log("SENSOR_LOG", {
            "sensor_id": "SNS-BUF-001",
            "batch_id": sample_batch_id,
            "shipment_id": sample_shipment_id,
            "timestamp": "2026-01-15 08:00:00 UTC",
            "temperature": -21.0
        })
        assert result["buffered_records_count"] >= 1

    def test_deduplication_prevents_double_insert(self, sample_batch_id, sample_shipment_id):
        from store_forward import buffer_offline_log, _compute_payload_hash
        from database import get_db_connection

        payload = {
            "sensor_id": "SNS-DEDUP-777",
            "batch_id": sample_batch_id,
            "shipment_id": sample_shipment_id,
            "timestamp": "2026-01-15 09:00:00 UTC",
            "temperature": -19.5
        }
        # Buffer twice
        buffer_offline_log("SENSOR_LOG", payload)
        buffer_offline_log("SENSOR_LOG", payload)

        ph = _compute_payload_hash("SENSOR_LOG", payload)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM offline_buffer WHERE payload_hash = ? AND synced = 0", (ph,))
        count = cursor.fetchone()[0]
        conn.close()
        assert count == 1, f"Deduplication failed: {count} records inserted"

    def test_different_payloads_are_distinct(self, sample_batch_id, sample_shipment_id):
        from store_forward import buffer_offline_log, _compute_payload_hash
        from database import get_db_connection

        p1 = {"sensor_id": "SNS-DIFF-A", "batch_id": sample_batch_id, "shipment_id": sample_shipment_id,
              "timestamp": "2026-01-15 10:00:00 UTC", "temperature": -20.0}
        p2 = {"sensor_id": "SNS-DIFF-B", "batch_id": sample_batch_id, "shipment_id": sample_shipment_id,
              "timestamp": "2026-01-15 10:10:00 UTC", "temperature": -19.0}

        buffer_offline_log("SENSOR_LOG", p1)
        buffer_offline_log("SENSOR_LOG", p2)

        h1 = _compute_payload_hash("SENSOR_LOG", p1)
        h2 = _compute_payload_hash("SENSOR_LOG", p2)
        assert h1 != h2


class TestSyncOfflineRecords:
    def test_sync_returns_structure(self):
        from store_forward import sync_offline_records
        result = sync_offline_records()
        assert "status" in result
        assert "synced_records_count" in result
        assert "failed_records_count" in result
        assert "skipped_corrupt_records" in result
        assert "sync_timestamp" in result

    def test_sync_result_counts_are_integers(self):
        from store_forward import sync_offline_records
        result = sync_offline_records()
        assert isinstance(result["synced_records_count"], int)
        assert isinstance(result["failed_records_count"], int)
        assert isinstance(result["skipped_corrupt_records"], int)

    def test_sync_status_after_sync(self):
        from store_forward import sync_offline_records
        result = sync_offline_records()
        assert result["status"] == "SYNC COMPLETE"

    def test_corrupt_record_isolated(self):
        """Inject a corrupt JSON record and verify sync isolates it without failing valid records."""
        from database import get_db_connection
        import datetime

        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        # Insert a corrupt record directly
        cursor.execute(
            "INSERT INTO offline_buffer (payload_type, payload_data, created_at, synced, sync_status, retry_count) VALUES (?, ?, ?, 0, 'PENDING', 0)",
            ("SENSOR_LOG", "{CORRUPT: not valid json %%", now)
        )
        conn.commit()
        conn.close()

        from store_forward import sync_offline_records
        result = sync_offline_records()
        # Corrupt record must be handled, not crash the sync
        assert result["skipped_corrupt_records"] >= 1


class TestStressTest:
    def test_stress_test_small(self):
        from store_forward import simulate_multi_sensor_outage
        result = simulate_multi_sensor_outage(num_sensors=10, records_per_sensor=5)
        assert "sync_result" in result
        assert "data_loss_pct" in result
        assert result["data_loss_pct"] == 0.0, "Small stress test should have 0% data loss"

    def test_stress_test_with_corrupt(self):
        from store_forward import simulate_multi_sensor_outage
        result = simulate_multi_sensor_outage(num_sensors=5, records_per_sensor=3, simulate_corrupt=True)
        assert "sync_result" in result
        sr = result["sync_result"]
        # Corrupt record should be detected and not crash the sync
        assert sr.get("skipped_corrupt_records", 0) >= 1

    def test_stress_test_conclusion_string(self):
        from store_forward import simulate_multi_sensor_outage
        result = simulate_multi_sensor_outage(num_sensors=5, records_per_sensor=2)
        assert isinstance(result["conclusion"], str)
        assert "%" in result["conclusion"]  # Should mention data loss %
