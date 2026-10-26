# Stakeholder Validation Protocol & Evidence Directory

## Overview
This directory contains the protocol, templates, and evidence repositories established to satisfy the evaluator directive:
> *"Replace simulated-only user-feedback records with at least one documented real/mock stakeholder validation session before the next review."*

## Directory Structure
- `STAKEHOLDER_VALIDATION_TEMPLATE.md`: Standardized 7-domain interview and demo protocol template.
- `template_session.json`: Machine-readable payload template for API/UI submission.
- `evidence/`: Destination folder for raw interview notes, test sheets, and evaluation recordings.
  - Files should be named using session IDs: e.g., `VAL-MOCK-2026-01_notes.md` or `VAL-REAL-2026-01_rubric.pdf`.

## How to Conduct and Record a Validation Session
1. **Prepare**: Open `STAKEHOLDER_VALIDATION_TEMPLATE.md` or review questions at `GET /api/validations/template`.
2. **Execute Demo**: Walk the participant through the live system modules:
   - Dashboard & Alerts (`/compliance`)
   - Traceability & Custody (`/workflow-map`, `/transport`)
   - 1-Click Evidence Pack (`/evidence`)
   - Driver Safety Blocking (`/transport`)
   - Store-and-Forward Sync (`/transport`)
   - Noise Filtering & Missing Data Imputation (`/experiments`)
3. **Record Responses**: Ask all 7 questions and record actual verbatim or summarized answers.
4. **Capture Observations**: Note observed strengths, points of confusion, suggested improvements, and planned actions.
5. **Persist Session**:
   - Use the **User Feedback** page in the web UI (`/feedback`), click **Record Validation Session**, fill in the form, and submit.
   - OR use the REST API: `POST /api/validations`.
6. **Archive Evidence**: Save the raw notes file in `docs/validation/evidence/<session_id>_notes.txt`.

## Validation Categorization Rules
- **Category A (Synthetic Test Feedback)**: Used strictly for statistical UI formulas. Never counted as stakeholder validation.
- **Category B (Mock Stakeholder)**: Conducted with simulated role-play evaluators, faculty, or peers. Badged as `MOCK_STAKEHOLDER`.
- **Category C (Real Stakeholder)**: Conducted with professional seafood exporter, port inspector, or logistics operators. Badged as `REAL_STAKEHOLDER`.
