"""
test_sha256_integrity.py — Evidence Pack SHA-256 Integrity Engine tests.
Tests: generation, determinism, tamper detection, and format validation.
"""
import pytest
import copy


class TestCanonicalSerialization:
    def test_canonical_output_is_string(self):
        from evidence_pack import _canonical_serialize
        result = _canonical_serialize({"b": 2, "a": 1})
        assert isinstance(result, str)

    def test_canonical_is_sorted(self):
        from evidence_pack import _canonical_serialize
        r1 = _canonical_serialize({"b": 2, "a": 1})
        r2 = _canonical_serialize({"a": 1, "b": 2})
        assert r1 == r2, "canonical_serialize must produce same output regardless of dict key order"

    def test_canonical_float_normalization(self):
        from evidence_pack import _canonical_serialize
        r1 = _canonical_serialize({"temp": 1.123456789})
        r2 = _canonical_serialize({"temp": 1.123457})
        # Should normalize floats to 6 decimal places
        assert r1 == r2


class TestSHA256Hash:
    def test_hash_length_64(self):
        from evidence_pack import _compute_sha256
        h = _compute_sha256("test input")
        assert len(h) == 64, "SHA-256 hex digest must be 64 characters"

    def test_hash_is_hex(self):
        from evidence_pack import _compute_sha256
        h = _compute_sha256("test input")
        int(h, 16)  # Must not raise — confirms valid hex string

    def test_hash_deterministic(self):
        from evidence_pack import _compute_sha256
        h1 = _compute_sha256("deterministic input")
        h2 = _compute_sha256("deterministic input")
        assert h1 == h2

    def test_different_inputs_different_hashes(self):
        from evidence_pack import _compute_sha256
        h1 = _compute_sha256("input A")
        h2 = _compute_sha256("input B")
        assert h1 != h2


class TestEvidencePackIntegrity:
    def test_generated_pack_has_integrity_metadata(self, sample_batch_id):
        from evidence_pack import generate_evidence_pack_and_report
        pack = generate_evidence_pack_and_report(sample_batch_id)
        assert "error" not in pack, f"Evidence pack returned error: {pack.get('error')}"
        assert "integrity_metadata" in pack
        im = pack["integrity_metadata"]
        assert im["hash_algorithm"] == "SHA-256"
        assert len(im["integrity_hash"]) == 64

    def test_pack_integrity_verified(self, sample_batch_id):
        from evidence_pack import generate_evidence_pack_and_report, verify_evidence_pack_integrity
        pack = generate_evidence_pack_and_report(sample_batch_id)
        result = verify_evidence_pack_integrity(pack)
        assert result["verification_status"] == "INTEGRITY_VERIFIED"
        assert result["hashes_match"] is True

    def test_tamper_detection(self, sample_batch_id):
        """Modifying any core evidence field must cause TAMPER_DETECTED."""
        from evidence_pack import generate_evidence_pack_and_report, verify_evidence_pack_integrity
        pack = generate_evidence_pack_and_report(sample_batch_id)

        tampered = copy.deepcopy(pack)
        # Simulate tampering: change overall status
        tampered["overall_status"] = "PASSED"  # Force change regardless of original
        tampered["completeness_score"] = 999    # Invalid value

        result = verify_evidence_pack_integrity(tampered)
        assert result["verification_status"] == "TAMPER_DETECTED"
        assert result["hashes_match"] is False

    def test_completeness_score_in_range(self, sample_batch_id):
        from evidence_pack import generate_evidence_pack_and_report
        pack = generate_evidence_pack_and_report(sample_batch_id)
        cs = pack["completeness_score"]
        assert 0 <= cs <= 100

    def test_pack_for_invalid_batch_returns_error(self):
        from evidence_pack import generate_evidence_pack_and_report
        pack = generate_evidence_pack_and_report("NONEXISTENT-BATCH-XYZ")
        assert "error" in pack

    def test_verify_without_hash_returns_unverifiable(self):
        from evidence_pack import verify_evidence_pack_integrity
        fake_pack = {
            "report_id": "AUD-FAKE",
            "generated_at": "2026-01-01 00:00:00 UTC",
            "overall_status": "PASSED",
            # No integrity_metadata
        }
        result = verify_evidence_pack_integrity(fake_pack)
        assert result["verification_status"] == "UNVERIFIABLE"


class TestPayloadHash:
    def test_payload_hash_deterministic(self):
        from store_forward import _compute_payload_hash
        h1 = _compute_payload_hash("SENSOR_LOG", {"sensor_id": "S1", "temp": -20.0})
        h2 = _compute_payload_hash("SENSOR_LOG", {"sensor_id": "S1", "temp": -20.0})
        assert h1 == h2

    def test_payload_hash_different_types(self):
        from store_forward import _compute_payload_hash
        h1 = _compute_payload_hash("SENSOR_LOG", {"sensor_id": "S1"})
        h2 = _compute_payload_hash("ROUTE_EVENT", {"sensor_id": "S1"})
        assert h1 != h2

    def test_payload_hash_length(self):
        from store_forward import _compute_payload_hash
        h = _compute_payload_hash("SENSOR_LOG", {"sensor_id": "S1", "temp": -20.0})
        assert len(h) == 64
