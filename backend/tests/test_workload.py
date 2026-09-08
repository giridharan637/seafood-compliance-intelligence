"""
test_workload.py — Workload safety constraint engine tests.
Tests: safe/unsafe boundary, specific constraint violations, rejection blocking.
"""
import pytest


class TestWorkloadSafetyBoundaries:
    """Tests the workload safety constraint engine at exact boundary values."""

    def test_returns_is_safe_boolean(self):
        from workload_engine import check_worker_workload_safety
        result = check_worker_workload_safety("DRV-101")
        assert "is_safe" in result
        assert isinstance(result["is_safe"], bool)

    def test_valid_driver_returns_details(self):
        from workload_engine import check_worker_workload_safety
        result = check_worker_workload_safety("DRV-101")
        assert "driver_id" in result
        assert "workload_score" in result
        assert "safety_violations" in result

    def test_nonexistent_driver_handled(self):
        from workload_engine import check_worker_workload_safety
        result = check_worker_workload_safety("NONEXISTENT-DRV-9999")
        # Should return a structured response, not raise
        assert isinstance(result, dict)
        # Either is_safe=True (no violations) or is_safe=False
        assert "is_safe" in result

    def test_additional_hours_parameter(self):
        from workload_engine import check_worker_workload_safety
        result_low = check_worker_workload_safety("DRV-101", 0.5)
        result_high = check_worker_workload_safety("DRV-101", 10.0)
        # Higher hours should either maintain or increase violation risk
        assert "is_safe" in result_low
        assert "is_safe" in result_high

    def test_unsafe_worker_detected(self):
        """Workers with safety_status=UNSAFE should be flagged."""
        from database import get_db_connection
        from workload_engine import check_worker_workload_safety

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT driver_id FROM worker_logs WHERE safety_status = 'UNSAFE' LIMIT 1")
        row = cursor.fetchone()
        conn.close()

        if row:
            result = check_worker_workload_safety(row[0])
            assert result["is_safe"] is False

    def test_safe_worker_cleared(self):
        """Workers with safety_status=SAFE and low hours should be cleared."""
        from database import get_db_connection
        from workload_engine import check_worker_workload_safety

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT driver_id FROM worker_logs
            WHERE safety_status = 'SAFE' AND working_hours <= 6.0 AND rest_hours >= 10.0
            LIMIT 1
        """)
        row = cursor.fetchone()
        conn.close()

        if row:
            result = check_worker_workload_safety(row[0], additional_hours=0.0)
            assert result["is_safe"] is True


class TestWorkloadViaAPI:
    def test_workload_api_structure(self, api_client):
        r = api_client.post("/api/workload-check", json={"driver_id": "DRV-101", "additional_hours": 2.0})
        assert r.status_code == 200
        d = r.json()
        assert "is_safe" in d
        assert "driver_id" in d

    def test_workload_api_missing_driver_id(self, api_client):
        """Missing required field should return 422."""
        r = api_client.post("/api/workload-check", json={"additional_hours": 2.0})
        assert r.status_code == 422

    def test_failure_case_5_workload_blocked(self, api_client):
        """Failure Case 5 demonstrates workload-blocked assignment."""
        r = api_client.post("/api/failure-cases/5")
        assert r.status_code == 200
        d = r.json()
        assert d["case_id"] == 5
        assert d["final_compliance_status"] == "ASSIGNMENT_BLOCKED"
        assert "WORKLOAD_SAFETY_VIOLATION_BLOCKED" in str(d)
