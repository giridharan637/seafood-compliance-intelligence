"""
test_evidence_traceability.py — Evidence Traceability and SHA-256 Integrity Verification Tests.
Tests:
- Complete evidence pack generation with valid source record IDs.
- Per-section audit-trail traceability mapping raw DB records to evidence sections.
- Missing source record detection (sensor logs, calibration, custody, route).
- SHA-256 evidence integrity hash verification.
- Tamper detection test: deliberate post-generation modification triggers TAMPER_DETECTED.
"""
import pytest
from evidence_pack import (
    generate_evidence_pack_and_report,
    verify_evidence_pack_integrity,
    get_audit_trail_traceability
)


class TestEvidenceTraceability:
    def test_complete_evidence_pack_has_traceability(self, sample_batch_id):
        pack = generate_evidence_pack_and_report(sample_batch_id)
        assert "audit_trail_traceability" in pack
        assert "audit_lineage_summary" in pack

        trace = pack["audit_trail_traceability"]
        assert len(trace) >= 8, f"Expected at least 8 evidence sections, got {len(trace)}"

        for sec in trace:
            assert "section_name" in sec
            assert "source_table" in sec
            assert "source_record_ids" in sec
            assert "evidence_output_section" in sec
            assert "completeness_pct" in sec
            assert "traceability_status" in sec
            assert "target_completeness_pct" in sec
            assert "lineage_step" in sec

    def test_audit_lineage_summary(self, sample_batch_id):
        pack = generate_evidence_pack_and_report(sample_batch_id)
        summary = pack["audit_lineage_summary"]
        assert "total_sections" in summary
        assert "verified_sections" in summary
        assert "overall_traceability_pct" in summary
        assert summary["overall_traceability_pct"] > 0.0
        assert "traceability_pipeline" in summary

    def test_traceability_helper_function(self, sample_batch_id):
        trace = get_audit_trail_traceability(sample_batch_id)
        assert "batch_id" in trace
        assert "sections" in trace
        assert "integrity_hash" in trace
        assert len(trace["sections"]) >= 8

    def test_sha256_integrity_untampered_verifies(self, sample_batch_id):
        """Untampered evidence pack must verify with INTEGRITY_VERIFIED."""
        pack = generate_evidence_pack_and_report(sample_batch_id)
        ver = verify_evidence_pack_integrity(pack)
        assert ver["verification_status"] == "INTEGRITY_VERIFIED"
        assert ver["hashes_match"] is True
        assert ver["hash_algorithm"] == "SHA-256"

    def test_sha256_tamper_detection_on_completeness_score(self, sample_batch_id):
        """Modifying completeness_score must trigger TAMPER_DETECTED."""
        pack = generate_evidence_pack_and_report(sample_batch_id)
        tampered = dict(pack)
        tampered["completeness_score"] = 99.9  # Tampered score
        ver = verify_evidence_pack_integrity(tampered)
        assert ver["verification_status"] == "TAMPER_DETECTED"
        assert ver["hashes_match"] is False

    def test_sha256_tamper_detection_on_batch_details(self, sample_batch_id):
        """Modifying underlying batch details must trigger TAMPER_DETECTED."""
        pack = generate_evidence_pack_and_report(sample_batch_id)
        tampered = dict(pack)
        tampered["batch_details"] = dict(tampered["batch_details"])
        tampered["batch_details"]["required_temp_max"] = 99.0
        ver = verify_evidence_pack_integrity(tampered)
        assert ver["verification_status"] == "TAMPER_DETECTED"
        assert ver["hashes_match"] is False

    def test_missing_source_record_detection(self):
        """When querying a non-existent batch, system returns an error rather than generating fake evidence."""
        pack = generate_evidence_pack_and_report("BTC-NONEXISTENT-999")
        assert "error" in pack
        assert "not found" in pack["error"].lower()
