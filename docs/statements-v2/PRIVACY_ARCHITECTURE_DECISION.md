# Privacy architecture decision — statement processing

| Field | Value |
|-------|--------|
| ADR ID | ST-PRIV-001 |
| Date | 2026-09-21 |
| Status | Accepted |

## Decision

Default processing mode is **on-device**:

1. PDF bytes and statement passwords stay in the browser process.
2. Extraction uses PDF.js (+ optional local Tesseract.js).
3. The server receives **reviewed financial JSON only** via `POST /api/import/statement.php`.
4. The JSON-only route must reject unexpected keys including PDF bytes and passwords.

## Explicitly deferred modes

| Mode | Status |
|------|--------|
| Remote/hosted PDF OCR or AI analysis | Not implemented; would change the privacy promise |
| Optional loopback local Python OCR worker | Deferred until measured need + architecture approval |
| Foundation-model training from uploads | Not in MVP |

## User-facing truth

- Bank name recognition ≠ layout certification.
- Arithmetic match ≠ authenticity or completeness.
- Purpose suggestions require user confirmation before posting.

## Validation

Contract tests and API suites must continue asserting that import payloads contain no PDF/password fields and that unexpected keys fail closed.
