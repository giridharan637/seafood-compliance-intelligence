# Stakeholder Validation Session Protocol & Template
## Seafood Compliance Intelligence System

> **DOCUMENT CLASSIFICATION: STANDARDIZED EVALUATION TEMPLATE**  
> **STATUS: READY FOR LIVE / MOCK SESSION (UNFILLED SPECIMEN)**  
> **EVALUATOR DIRECTIVE COMPLIANCE**: This protocol satisfies the Review 2 requirement to establish a rigorous, transparent validation instrument replacing synthetic feedback with documented stakeholder evaluations.

---

### 1. Evaluation Overview & Rules of Conduct

To satisfy capstone and commercial validation standards, evaluations must strictly maintain categorization integrity:

| Category | Definition | Status / Usage |
|:---|:---|:---|
| **Category A: Synthetic Test Feedback** | Programmatic records generated for database testing and UI star-rating formula verification. | Isolated in test fixtures. **Never** presented as stakeholder validation. |
| **Category B: Mock Stakeholder Evaluation** | Structured evaluation conducted with a faculty mentor, teaching assistant, peer evaluator, or domain tester role-playing an operational seafood stakeholder. | Permitted for academic prototype evaluation; clearly badged as `MOCK_STAKEHOLDER`. |
| **Category C: Genuine Real Stakeholder** | Empirical evaluation conducted with an active cold-chain compliance officer, commercial seafood exporter, port customs inspector, or ISO auditor. | Badged as `REAL_STAKEHOLDER` upon session execution. |

> [!IMPORTANT]
> **Privacy & Anonymization Policy**:
> - Never record personal names, residential addresses, phone numbers, or personal email addresses.
> - Record only professional roles (e.g., *"Cold-Chain Quality Assurance Officer"*, *"Port Health & Export Inspector"*, *"Fleet Logistics Dispatcher"*).
> - Session evidence (audio recording IDs, notes, completed rubrics) must be archived in `docs/validation/evidence/`.

---

### 2. Session Metadata Sheet (To be completed at session start)

| Field | Description / Instructions | Actual Value (To Fill) |
|:---|:---|:---|
| **Session ID** | Unique session tracking code (e.g., `VAL-MOCK-2026-01` or `VAL-REAL-2026-01`) | `[UNFILLED - Enter Session ID]` |
| **Session Date** | Date of evaluation (YYYY-MM-DD) | `[UNFILLED - Enter Date]` |
| **Participant Type** | Select: `MOCK_STAKEHOLDER` (Simulated Role-Play) OR `REAL_STAKEHOLDER` (Practitioner) | `[Select: MOCK_STAKEHOLDER | REAL_STAKEHOLDER]` |
| **Participant Role** | Operational role title without personal PII | `[Enter Role, e.g. Logistics Dispatcher]` |
| **Evaluation Method** | E.g., Interactive Task Demo, Guided Cognitive Walkthrough, Scenario Simulation | `[Enter Method Used]` |
| **Demo Modules Evaluated** | Select modules demonstrated during session | `[ ] Admin Dashboard & KPIs`<br>`[ ] Real-time Alerts & Telemetry`<br>`[ ] Shipment & Custody Traceability`<br>`[ ] 1-Click Evidence Pack`<br>`[ ] Driver Workload Safety Engine`<br>`[ ] Store-and-Forward Outage Sync`<br>`[ ] Hampel Noise / Missing Data Imputation` |
| **Validation Status** | Current status after session | `[ ] CONDUCTED_PENDING_ACTION`<br>`[ ] VALIDATED_RESOLVED` |
| **Evidence Reference** | Filepath to raw notes, rubric, or recording artifact in `docs/validation/evidence/` | `[e.g., docs/validation/evidence/session_01_notes.txt]` |

---

### 3. Standardized Interview & Walkthrough Questionnaire

The interviewer walks the participant through the live system modules in sequence. Record verbatim or summarized feedback directly into the fields below.

#### Question 1: Ease of Using Dashboard
*“How intuitive is the dashboard layout, KPI monitoring, and navigation across cold-chain operations?”*
- **Modules Demonstrated**: Admin Dashboard (`/admin/dashboard`), Compliance Hub (`/compliance`).
- **Target Criteria**: Participant can identify high-risk shipments within 10 seconds and locate reefer telemetry without training.
- **Actual Response / Verbatim Notes**:
  ```text
  [UNFILLED - Record participant's actual response during session]
  ```

#### Question 2: Understanding of Cold-Chain Alerts
*“Are cold-chain temperature excursion alerts, severity tags (CRITICAL/WARNING), and threshold limits immediately understandable?”*
- **Modules Demonstrated**: Live Cold Chain Alerts, Failure Case 2 (Thermal Breach).
- **Target Criteria**: Participant accurately interprets amber warning vs red critical breach and understands quarantine triggers.
- **Actual Response / Verbatim Notes**:
  ```text
  [UNFILLED - Record participant's actual response during session]
  ```

#### Question 3: Shipment and Custody Traceability
*“Does the system provide clear end-to-end traceability across sensor lineage, route checkpoints, and custody handovers?”*
- **Modules Demonstrated**: Field Workflow Map (`/workflow-map`), Transport Operations (`/transport`), Custody Handover tables.
- **Target Criteria**: Participant can trace batch origin to export port through physical checkpoints without lineage gaps.
- **Actual Response / Verbatim Notes**:
  ```text
  [UNFILLED - Record participant's actual response during session]
  ```

#### Question 4: Evidence Pack Usefulness & Integrity Verification
*“Is the 1-click audit evidence pack comprehensive, clearly structured, and credible for regulatory/customs compliance audits?”*
- **Modules Demonstrated**: Evidence Pack Generator (`/evidence`), SHA-256 Tamper Verification Engine (`/api/evidence-pack/{batch_id}/verify`).
- **Target Criteria**: Participant validates 9-table aggregation, calibration validity, and tamper detection utility for export clearance.
- **Actual Response / Verbatim Notes**:
  ```text
  [UNFILLED - Record participant's actual response during session]
  ```

#### Question 5: Driver Workload Safety
*“Does the worker workload safety check effectively enforce legal driving hours and minimum rest constraints to prevent fatigued assignments?”*
- **Modules Demonstrated**: Driver Duty Safety Panel (`/transport`), Workload Verification (`/api/workload-check`).
- **Target Criteria**: Participant verifies hard-blocking of fatigued drivers (DRV-103) violating maximum hours or minimum rest.
- **Actual Response / Verbatim Notes**:
  ```text
  [UNFILLED - Record participant's actual response during session]
  ```

#### Question 6: Missing / Noisy Sensor Data Handling
*“How effectively does the system distinguish sensor noise spikes from true breaches and flag imputed missing telemetry with full audit transparency?”*
- **Modules Demonstrated**: Hampel Filter Experiment (`/experiments`), Missing Data Imputation (`/experiments`).
- **Target Criteria**: Participant validates that raw sensor spikes are cleaned without masking sustained thermal excursions, and missing logs are explicitly flagged (`is_imputed=1`).
- **Actual Response / Verbatim Notes**:
  ```text
  [UNFILLED - Record participant's actual response during session]
  ```

#### Question 7: Suggested Improvements & Operational Priorities
*“What are the most critical improvements or feature additions needed before deploying in commercial cold-chain operations?”*
- **Target Criteria**: Actionable feedback on operational bottlenecks, report formatting, or edge cases.
- **Actual Response / Verbatim Notes**:
  ```text
  [UNFILLED - Record participant's actual response during session]
  ```

---

### 4. Qualitative Synthesis & Observations

To be synthesized jointly by the interviewer and evaluator immediately after session execution:

#### A. Observed Strengths
```text
[UNFILLED - Document positive observations, high-efficiency features, or clear usability wins]
```

#### B. Observed Issues & Friction Points
```text
[UNFILLED - Document points of confusion, UI ambiguities, edge cases, or friction encountered]
```

#### C. Suggested Improvements
```text
[UNFILLED - List specific functional or visual improvements recommended by the participant]
```

#### D. Actions Taken or Planned
```text
[UNFILLED - Detail engineering response, architectural changes made, or future backlog items]
```

---

### 5. Session Verification & Audit Sign-Off

```text
[TEMPLATE SPECIMEN — NOT EXECUTED]
This document represents an uncompleted evaluation template.
To complete this evaluation:
1. Conduct the session following the protocol above.
2. Save raw notes/artifacts into docs/validation/evidence/<session_id>_notes.txt
3. Record the completed record into the system via POST /api/validations or the User Feedback UI.
```
