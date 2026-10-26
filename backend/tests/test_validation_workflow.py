"""
test_validation_workflow.py — Comprehensive tests for the Stakeholder Validation Workflow.
Validates:
- Database schema and persistence for stakeholder_validations
- Standardized 7-domain interview template retrieval
- Mock Stakeholder and Real Stakeholder session recording
- Strict isolation and distinction of Synthetic Test Fixtures vs Stakeholder Evaluations
- Rejection of synthetic data pretending to be stakeholder validations
- Validation of required fields and duplicate prevention
- Privacy protection blocking PII (personal emails/identities)
"""
import pytest
import json


class TestStakeholderValidationWorkflow:

    def test_schema_has_stakeholder_validations_table(self, use_test_database):
        """Verify stakeholder_validations table exists with all required columns."""
        from database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(stakeholder_validations)")
        cols = {row[1] for row in cursor.fetchall()}
        conn.close()

        expected_columns = [
            "session_id", "session_date", "participant_type", "participant_role",
            "validation_method", "demo_modules_evaluated", "question_responses",
            "observed_strengths", "observed_issues", "suggested_improvements",
            "actions_taken_or_planned", "validation_status", "evidence_reference", "created_at"
        ]
        for col in expected_columns:
            assert col in cols, f"stakeholder_validations missing column: {col}"

    def test_get_validations_initial_state(self, api_client):
        """GET /api/validations returns valid response, counts, and template specimen."""
        r = api_client.get("/api/validations")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert "validation_status" in d
        assert "counts" in d
        assert "sessions" in d
        assert "methodology_isolation_policy" in d
        assert d["counts"]["synthetic_survey_fixtures"] >= 0

    def test_get_validation_template_contains_all_seven_domains(self, api_client):
        """GET /api/validations/template returns structured protocol with all 7 required domains."""
        r = api_client.get("/api/validations/template")
        assert r.status_code == 200
        d = r.json()
        assert d["template_id"] == "VAL-PROTOCOL-2026-V1"
        assert "questions" in d
        questions = d["questions"]
        assert len(questions) == 7

        domains = [q["domain"] for q in questions]
        assert "Ease of Using Dashboard" in domains
        assert "Cold-Chain Alerts" in domains
        assert "Shipment & Custody Traceability" in domains
        assert "Evidence Pack Usefulness" in domains
        assert "Driver Workload Safety" in domains
        assert "Missing/Noisy Sensor Data Handling" in domains
        assert "Suggested Improvements" in domains

        # Ensure placeholders are clearly marked as unfilled templates
        for q in questions:
            assert "[UNFILLED TEMPLATE" in q["response_placeholder"]

    def test_record_mock_stakeholder_session(self, api_client):
        """POST /api/validations successfully records a mock stakeholder session."""
        session_payload = {
            "session_id": "VAL-MOCK-TEST-001",
            "session_date": "2026-10-26",
            "participant_type": "MOCK_STAKEHOLDER",
            "participant_role": "Simulated Cold-Chain Logistics Dispatcher (Peer Evaluator)",
            "validation_method": "Cognitive Walkthrough & Task Demonstration",
            "demo_modules_evaluated": [
                "Admin Dashboard & System KPIs",
                "Real-time Telemetry & Cold-Chain Alerts",
                "Driver Duty Safety Hard-Blocking",
                "Store-and-Forward Network Disruption Resilience"
            ],
            "question_responses": [
                {"question_id": "Q1_DASHBOARD", "question_text": "Ease of use", "response_text": "Navigation is clear and reefer temperatures are visible at a glance."},
                {"question_id": "Q2_ALERTS", "question_text": "Alerts clarity", "response_text": "Critical breach banners are distinct from advisory warnings."},
                {"question_id": "Q3_TRACEABILITY", "question_text": "Traceability", "response_text": "Route events clearly correlate with custody transfers."},
                {"question_id": "Q4_EVIDENCE", "question_text": "Evidence pack", "response_text": "Instant PDF/modal generation eliminates paperwork."},
                {"question_id": "Q5_SAFETY", "question_text": "Driver safety", "response_text": "Hard-blocking fatigued drivers is a major compliance advantage."},
                {"question_id": "Q6_DATA_QUALITY", "question_text": "Noise & missing data", "response_text": "Imputed values are transparently tagged with ISO flags."},
                {"question_id": "Q7_IMPROVEMENTS", "question_text": "Improvements", "response_text": "Add batch-export filters by origin dock."}
            ],
            "observed_strengths": "Fast response times, clear role isolation, and tamper verification feedback.",
            "observed_issues": "Driver safety modal could display remaining legal driving hours directly on the list item.",
            "suggested_improvements": "Add remaining duty hours badge next to driver names in dispatch list.",
            "actions_taken_or_planned": "Engineering backlog ticket LOG-2026 created to surface duty hours directly on driver cards.",
            "validation_status": "CONDUCTED_PENDING_ACTION",
            "evidence_reference": "docs/validation/evidence/VAL-MOCK-TEST-001_notes.md"
        }
        r = api_client.post("/api/validations", json=session_payload)
        assert r.status_code == 200
        assert r.json()["status"] == "success"
        assert r.json()["session_id"] == "VAL-MOCK-TEST-001"
        assert r.json()["participant_type"] == "MOCK_STAKEHOLDER"

        # Verify retrieval via GET
        r_list = api_client.get("/api/validations")
        assert r_list.status_code == 200
        sessions = r_list.json()["sessions"]
        matched = [s for s in sessions if s["session_id"] == "VAL-MOCK-TEST-001"]
        assert len(matched) == 1
        assert matched[0]["participant_type"] == "MOCK_STAKEHOLDER"
        assert matched[0]["observed_strengths"] == "Fast response times, clear role isolation, and tamper verification feedback."

    def test_record_real_stakeholder_session(self, api_client):
        """POST /api/validations successfully records a real stakeholder evaluation session."""
        session_payload = {
            "session_id": "VAL-REAL-TEST-002",
            "session_date": "2026-10-26",
            "participant_type": "REAL_STAKEHOLDER",
            "participant_role": "Port Health & Seafood Export Quality Inspector",
            "validation_method": "Guided Live-System Task Verification",
            "demo_modules_evaluated": [
                "1-Click Evidence Pack & SHA-256 Verification",
                "Real-time Telemetry & Cold-Chain Alerts"
            ],
            "question_responses": [
                {"question_id": "Q1_DASHBOARD", "question_text": "Ease of use", "response_text": "Well-structured dashboard layout."},
                {"question_id": "Q2_ALERTS", "question_text": "Alerts clarity", "response_text": "Excursion alerts match international cold-chain limits."},
                {"question_id": "Q3_TRACEABILITY", "question_text": "Traceability", "response_text": "Custody chain contains all necessary timestamps."},
                {"question_id": "Q4_EVIDENCE", "question_text": "Evidence pack", "response_text": "Audit reports meet export clearance requirements."},
                {"question_id": "Q5_SAFETY", "question_text": "Driver safety", "response_text": "Hours-of-service compliance matches transport regulations."},
                {"question_id": "Q6_DATA_QUALITY", "question_text": "Data quality", "response_text": "Hampel filter effectively removes sensor noise spikes."},
                {"question_id": "Q7_IMPROVEMENTS", "question_text": "Improvements", "response_text": "Provide customs export certificates as signed downloads."}
            ],
            "observed_strengths": "SHA-256 evidence integrity digest provides instant tamper verification.",
            "observed_issues": "Calibration certificate expiry warning should be highlighted in amber before actual expiry date.",
            "suggested_improvements": "Add 30-day calibration pre-expiry notification.",
            "actions_taken_or_planned": "Scheduled calibration pre-warning alert threshold in system_settings.",
            "validation_status": "VALIDATED_RESOLVED",
            "evidence_reference": "docs/validation/evidence/VAL-REAL-TEST-002_report.pdf"
        }
        r = api_client.post("/api/validations", json=session_payload)
        assert r.status_code == 200
        assert r.json()["status"] == "success"
        assert r.json()["participant_type"] == "REAL_STAKEHOLDER"

        # Verify validation status metric flips to STAKEHOLDER_VALIDATED
        r_list = api_client.get("/api/validations")
        assert r_list.json()["validation_status"] == "STAKEHOLDER_VALIDATED"
        assert r_list.json()["evaluator_directive_met"] is True
        assert r_list.json()["counts"]["real_stakeholder_sessions"] >= 1

    def test_reject_synthetic_participant_type(self, api_client):
        """API rejects synthetic or demo participant types attempting to masquerade as validation."""
        for fake_type in ["SYNTHETIC", "DEMO", "SIMULATED", "synthetic_test"]:
            r = api_client.post("/api/validations", json={
                "session_id": f"VAL-FAKE-{fake_type}",
                "session_date": "2026-10-26",
                "participant_type": fake_type,
                "participant_role": "Quality Inspector",
                "validation_method": "Interview",
                "demo_modules_evaluated": "Dashboard",
                "question_responses": "[]",
                "observed_strengths": "None",
                "observed_issues": "None",
                "suggested_improvements": "None",
                "actions_taken_or_planned": "None"
            })
            assert r.status_code == 422
            assert "Synthetic data cannot be registered" in r.json()["detail"]

    def test_reject_invalid_participant_type(self, api_client):
        """API rejects unknown or invalid participant types."""
        r = api_client.post("/api/validations", json={
            "session_id": "VAL-INVALID-TYPE",
            "session_date": "2026-10-26",
            "participant_type": "UNKNOWN_RANDOM_TYPE",
            "participant_role": "Auditor",
            "validation_method": "Demo",
            "demo_modules_evaluated": "Dashboard",
            "question_responses": "[]",
            "observed_strengths": "Good",
            "observed_issues": "None",
            "suggested_improvements": "None",
            "actions_taken_or_planned": "None"
        })
        assert r.status_code == 422
        assert "Allowed types: 'REAL_STAKEHOLDER', 'MOCK_STAKEHOLDER'" in r.json()["detail"]

    def test_reject_missing_required_fields(self, api_client):
        """API rejects requests with missing or empty required fields."""
        incomplete_payload = {
            "session_id": "VAL-INCOMPLETE-001",
            "session_date": "2026-10-26",
            "participant_type": "MOCK_STAKEHOLDER",
            "participant_role": "",  # Empty role!
            "validation_method": "Interview",
            "demo_modules_evaluated": "Dashboard",
            "question_responses": "[]",
            "observed_strengths": "Fast",
            "observed_issues": "None",
            "suggested_improvements": "None",
            "actions_taken_or_planned": "None"
        }
        r = api_client.post("/api/validations", json=incomplete_payload)
        assert r.status_code == 422
        assert "participant_role" in r.json()["detail"]

    def test_privacy_protection_blocks_pii_email(self, api_client):
        """API strictly blocks personal email addresses from participant roles or session IDs."""
        pii_payload = {
            "session_id": "VAL-PII-001",
            "session_date": "2026-10-26",
            "participant_type": "REAL_STAKEHOLDER",
            "participant_role": "john.smith@seafoodexports.com - Logistics Director",  # PII email!
            "validation_method": "Interview",
            "demo_modules_evaluated": "Dashboard",
            "question_responses": "[]",
            "observed_strengths": "Fast",
            "observed_issues": "None",
            "suggested_improvements": "None",
            "actions_taken_or_planned": "None"
        }
        r = api_client.post("/api/validations", json=pii_payload)
        assert r.status_code == 422
        assert "Privacy Protection Error" in r.json()["detail"]

    def test_reject_duplicate_session_id(self, api_client):
        """API returns 409 Conflict when attempting to insert duplicate session_id."""
        duplicate_payload = {
            "session_id": "VAL-MOCK-TEST-001",  # Already inserted in earlier test!
            "session_date": "2026-10-26",
            "participant_type": "MOCK_STAKEHOLDER",
            "participant_role": "Lead Auditor",
            "validation_method": "Demo",
            "demo_modules_evaluated": "Dashboard",
            "question_responses": "[]",
            "observed_strengths": "Good",
            "observed_issues": "None",
            "suggested_improvements": "None",
            "actions_taken_or_planned": "None"
        }
        r = api_client.post("/api/validations", json=duplicate_payload)
        assert r.status_code == 409
        assert "already exists" in r.json()["detail"]

    def test_separation_of_synthetic_feedback_and_validations(self, api_client):
        """
        Verify that /api/feedback distinguishes synthetic survey fixtures
        from stakeholder validations and does not inflate validation counts.
        """
        r_feedback = api_client.get("/api/feedback")
        assert r_feedback.status_code == 200
        fb_data = r_feedback.json()

        assert "validation_summary" in fb_data
        assert "synthetic_fixtures_count" in fb_data
        assert "feedback_list" in fb_data

        # Check that demo feedback entries are tagged as synthetic fixtures
        demo_items = [item for item in fb_data["feedback_list"] if item.get("is_demo") == 1]
        for item in demo_items:
            assert item.get("feedback_category") == "SYNTHETIC_TEST_FIXTURE"

        # Check that validation_summary does not count synthetic feedback as real or mock validation sessions
        val_summary = fb_data["validation_summary"]
        assert val_summary["real_sessions_count"] >= 1
        assert val_summary["mock_sessions_count"] >= 1
        assert "Synthetic survey records are isolated" in val_summary["disclaimer"]
