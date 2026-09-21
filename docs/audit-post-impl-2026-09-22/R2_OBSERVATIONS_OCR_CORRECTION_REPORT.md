# R2 — Observations / OCR / correction (partial)

Date: 2026-09-22  
Findings: F-ST-03-OBS, F-ST-08-OCR, F-ST-09-EDIT

## Delivered

- `buildObservationsFromAnalysis` connects parser rows to observation + field provenance (page/y box; method native/ocr).
- Source highlight overlay uses PDF.js viewport rectangle transform.
- Amount correction UI increments `reviewRevision`, clears row `reviewed`, recalculates completeness/arithmetic via existing memos.
- OCR critical-field uncertainty messages listed; OCR commit still requires `ocrSourceConfirmed` (page average score alone cannot clear the gate).

## Not yet fully verified

- Date/direction/balance editors with full history persistence.
- High-DPI / 90–270° rotation browser matrix.
- Server binding of reviewRevision digest receipts.

Status: **PARTIAL** — product path started; not FIXED_VERIFIED for all three IDs.
