"""
test_api.py — full API endpoint coverage tests.
All endpoints tested for: status codes, response shape, and no "error" keys in success paths.
"""
import pytest


class TestHealthAndKPI:
    def test_kpi_200(self, api_client):
        r = api_client.get("/api/kpi")
        assert r.status_code == 200

    def test_kpi_has_required_fields(self, api_client):
        r = api_client.get("/api/kpi")
        d = r.json()
        required = {"total_shipments", "total_batches", "compliance_rate",
                    "open_alerts", "sensor_health", "evidence_completeness"}
        for f in required:
            assert f in d, f"KPI missing field: {f}"

    def test_kpi_evidence_completeness_is_numeric(self, api_client):
        r = api_client.get("/api/kpi")
        d = r.json()
        ec = d["evidence_completeness"]
        assert isinstance(ec, (int, float)), "evidence_completeness must be numeric"
        assert 0.0 <= ec <= 100.0, f"evidence_completeness out of range: {ec}"

    def test_system_health_200(self, api_client):
        r = api_client.get("/api/system-health")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "HEALTHY"

    def test_system_health_no_hardcoded_claims(self, api_client):
        r = api_client.get("/api/system-health")
        text = r.text
        # These hardcoded unsupported values must not appear
        assert "99.98%" not in text, "Hardcoded uptime 99.98% must be removed"
        assert "99.4" not in text, "Hardcoded evidence_completeness 99.4 must be removed"
        assert '"f1_score": 0.942' not in text, "Hardcoded F1 score must be removed"


class TestShipments:
    def test_list_shipments_200(self, api_client):
        r = api_client.get("/api/shipments")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_shipments_with_filter(self, api_client):
        r = api_client.get("/api/shipments?status=NORMAL")
        assert r.status_code == 200

    def test_shipment_detail_not_found(self, api_client):
        r = api_client.get("/api/shipments/NONEXISTENT-SHP")
        assert r.status_code == 404

    def test_shipment_detail_found(self, api_client, sample_shipment_id):
        r = api_client.get(f"/api/shipments/{sample_shipment_id}")
        assert r.status_code == 200
        d = r.json()
        assert "shipment" in d
        assert "handovers" in d
        assert "routes" in d
        assert "sensor_logs" in d


class TestBatchesAndSensors:
    def test_batches_200(self, api_client):
        r = api_client.get("/api/batches")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_sensors_200(self, api_client):
        r = api_client.get("/api/sensors")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_workers_200(self, api_client):
        r = api_client.get("/api/workers")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestAlerts:
    def test_alerts_200(self, api_client):
        r = api_client.get("/api/alerts")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestMLPredictions:
    def test_ml_predictions_200(self, api_client):
        r = api_client.get("/api/ml-predictions")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_run_ml_pipeline(self, api_client):
        r = api_client.post("/api/run-ml")
        assert r.status_code == 200
        d = r.json()
        # Should not have an error key
        assert "error" not in d


class TestEvidencePack:
    def test_evidence_pack_not_found(self, api_client):
        r = api_client.post("/api/evidence-pack/NONEXISTENT-BATCH-999")
        assert r.status_code == 404

    def test_evidence_pack_generated(self, api_client, sample_batch_id):
        r = api_client.post(f"/api/evidence-pack/{sample_batch_id}")
        assert r.status_code == 200
        d = r.json()
        assert "report_id" in d
        assert "integrity_metadata" in d
        im = d["integrity_metadata"]
        assert im["hash_algorithm"] == "SHA-256"
        assert len(im["integrity_hash"]) == 64, "SHA-256 hash must be 64 hex chars"

    def test_evidence_pack_verify(self, api_client, sample_batch_id):
        r = api_client.post(f"/api/evidence-pack/{sample_batch_id}/verify")
        assert r.status_code == 200
        d = r.json()
        assert "integrity_verification" in d
        assert d["integrity_verification"]["verification_status"] == "INTEGRITY_VERIFIED"
        assert d["integrity_verification"]["hashes_match"] is True

    def test_evidence_completeness_score_range(self, api_client, sample_batch_id):
        r = api_client.post(f"/api/evidence-pack/{sample_batch_id}")
        assert r.status_code == 200
        d = r.json()
        cs = d.get("completeness_score", -1)
        assert 0 <= cs <= 100, f"completeness_score {cs} out of 0-100 range"


class TestNetworkAndStoreForward:
    def test_network_status_200(self, api_client):
        r = api_client.get("/api/network-status")
        assert r.status_code == 200
        d = r.json()
        assert "status" in d

    def test_network_toggle_offline(self, api_client):
        r = api_client.post("/api/network-toggle", json={"status": "OFFLINE"})
        assert r.status_code == 200
        assert r.json()["status"] == "OFFLINE"

    def test_buffer_log_when_offline(self, api_client, sample_batch_id, sample_shipment_id):
        r = api_client.post("/api/buffer-log", json={
            "payload_type": "SENSOR_LOG",
            "payload_data": {
                "sensor_id": "SNS-TEST-0001",
                "batch_id": sample_batch_id,
                "shipment_id": sample_shipment_id,
                "timestamp": "2026-01-01 10:00:00 UTC",
                "temperature": -20.5
            }
        })
        assert r.status_code == 200

    def test_network_sync(self, api_client):
        # Restore online first
        api_client.post("/api/network-toggle", json={"status": "ONLINE"})
        r = api_client.post("/api/network-sync")
        assert r.status_code == 200
        d = r.json()
        assert "synced_records_count" in d

    def test_store_forward_buffer_list(self, api_client):
        r = api_client.get("/api/store-forward/buffer")
        assert r.status_code == 200
        d = r.json()
        assert "total" in d
        assert "data" in d


class TestExperiments:
    def test_dataset_stats(self, api_client):
        r = api_client.get("/api/experiments/dataset-stats")
        assert r.status_code == 200
        assert "error" not in r.json()

    def test_baseline_experiment(self, api_client):
        r = api_client.get("/api/experiments/baseline")
        assert r.status_code == 200
        assert "error" not in r.json()

    def test_missing_data_experiment(self, api_client):
        r = api_client.post("/api/experiments/missing-data", json={"missing_rate": 0.05})
        assert r.status_code == 200
        assert "error" not in r.json()

    def test_noise_experiment(self, api_client):
        r = api_client.post("/api/experiments/noise-filtering", json={"noise_level": 0.08})
        assert r.status_code == 200
        assert "error" not in r.json()

    def test_error_analysis(self, api_client):
        r = api_client.get("/api/error-analysis")
        assert r.status_code == 200
        d = r.json()
        assert "ml_confusion_matrix" in d
        cm = d["ml_confusion_matrix"]
        if "total_evaluated" in cm:
            assert cm["total_evaluated"] > 0

    def test_failure_case_1(self, api_client):
        r = api_client.post("/api/failure-cases/1")
        assert r.status_code == 200
        d = r.json()
        assert d["case_id"] == 1
        assert "error" not in d

    def test_failure_case_5(self, api_client):
        r = api_client.post("/api/failure-cases/5")
        assert r.status_code == 200
        d = r.json()
        assert d["case_id"] == 5

    def test_failure_case_invalid(self, api_client):
        r = api_client.post("/api/failure-cases/999")
        assert r.status_code == 200
        d = r.json()
        assert "error" in d


class TestSettings:
    def test_get_settings(self, api_client):
        r = api_client.get("/api/settings")
        assert r.status_code == 200
        d = r.json()
        assert "temp_warning_threshold" in d
        assert "temp_critical_threshold" in d

    def test_update_settings(self, api_client):
        r = api_client.post("/api/settings", json={
            "temp_warning_threshold": 2.5,
            "temp_critical_threshold": 5.5,
            "max_allowed_delay_mins": 75,
            "alert_sensitivity": "HIGH",
            "store_forward_sync_interval": 15,
            "auto_impute_missing": True
        })
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "success"


class TestWorkload:
    def test_workload_check(self, api_client):
        r = api_client.post("/api/workload-check", json={"driver_id": "DRV-101", "additional_hours": 3.0})
        assert r.status_code == 200
        d = r.json()
        assert "is_safe" in d
        assert isinstance(d["is_safe"], bool)


class TestDatasetExplorer:
    def test_dataset_batches(self, api_client):
        r = api_client.get("/api/dataset/batches?page=1&page_size=10")
        assert r.status_code == 200
        d = r.json()
        assert "total" in d
        assert "data" in d

    def test_dataset_summary(self, api_client):
        r = api_client.get("/api/dataset/summary")
        assert r.status_code == 200
        d = r.json()
        assert "product_batches" in d
        assert "sensor_logs" in d

    def test_dataset_export_csv(self, api_client):
        r = api_client.get("/api/dataset/export/csv")
        assert r.status_code == 200
        assert "text/csv" in r.headers["content-type"]


class TestFeedback:
    def test_submit_feedback(self, api_client):
        r = api_client.post("/api/feedback", json={
            "role": "port_inspector",
            "usability_rating": 5,
            "report_clarity": 5,
            "alert_usefulness": 4,
            "evidence_pack_usefulness": 5,
            "ease_of_navigation": 4,
            "comments": "Excellent system."
        })
        assert r.status_code == 200
        assert r.json()["status"] == "success"

    def test_get_feedback(self, api_client):
        r = api_client.get("/api/feedback")
        assert r.status_code == 200
        d = r.json()
        assert "avg_rating" in d
        assert "total_responses" in d
