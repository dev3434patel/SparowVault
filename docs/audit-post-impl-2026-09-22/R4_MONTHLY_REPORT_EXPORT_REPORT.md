# R4 — Monthly counts / overlaps / exports

Date: 2026-09-22

## Delivered

- Separated helpers: `sourceDocumentStats` (per-document) vs `accountMonthUnionFromDocuments` (account-month union).
- Overlapping PDFs with the same `resolvedObservationId` do not double April debit/credit counts; per-document stats remain intact.
- Unresolved same-fingerprint overlaps increment `unresolvedOverlapCount` and are not auto-merged.
- Unit coverage in `statementIntelligence.v2.test.ts` (20 cases in that file after additions).

## Remaining

- Live imported statement + export golden comparison (UI / second browser / XLSX).
- Booking-date timezone regression in browser.

Status: **PARTIAL** — library + unit gate; not full E2E FIXED_VERIFIED.
