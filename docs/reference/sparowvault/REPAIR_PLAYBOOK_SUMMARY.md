# Repair playbook summary (sanitized)

Prepared: 22 September 2026  
Audit: SV-POST-IMPL-AUDIT-2026-09-22  
Scope: local remediation R0–R8; no hosting, live payments, or private PDF upload.

## Immediate status

- `LOCAL_REMEDIATION_REQUIRED`
- `BLOCKED_FOR_20_BANK_CLAIM`

## Evidence boundary

- Statement unit suites ≈ 81 cases across two files — not whole-app certification.
- PHP syntax pass ≠ runtime behavior.
- `statements:certify` may exit 0 with `blocked: true` — not release approval.
- Live statement API/browser suites require a guarded disposable TEST_DB.

## Finding IDs in scope

F-ENV-API, F-DOC-01, F-REF-01, F-ST-05-WIRE, F-ST-03-OBS, F-ST-08-OCR, F-ST-09-EDIT, F-ST-11-SOURCE, F-ST-10-MATCH, F-ST-16-GOAL, F-ST-13-CARD, F-BANK-20, plus monthly overlap/export gaps.

## Order

R0 → R1 → R2 → R3 → R4 → R5 → R6 → R8, with R7 corpus collection starting alongside R0.

Do not mark requested features FIXED by deleting unused helpers. Deferred features stay DEFERRED.
