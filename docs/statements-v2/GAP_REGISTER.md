# Statement Intelligence — Gap Register

Status key: OPEN | IN_PROGRESS | FIXED | FIXED_LIVE_API | PARTIAL_VERIFIED | MITIGATED | BLOCKED | ACCEPTED | DEFERRED

| ID | Gap | Priority | Primary phases | Status |
|----|-----|----------|----------------|--------|
| ST-01 | Real bank/layout evidence largely unmeasured | P0 | ST-01,02,06,07,18 | MITIGATED (truthful registry; real corpus BLOCKED) |
| ST-02 | OCR/rotation/language/handwriting not certified | P1 | ST-04,08,09,14,18 | MITIGATED (ocrUncertainty + native-first; handwriting unsupported) |
| ST-03 | OCR field correction editor | P1 | ST-09 / R2 | PARTIAL_VERIFIED (amount/date/DR-CR + highlight; DPI matrix open) |
| ST-04 | Suggested purpose ≠ bank truth | P0 | ST-10,12,14 | ACCEPTED (review required; dual reports) |
| ST-05 | Unfinished review drafts | P1 | ST-09,15 | FIXED (optional draft without password/PDF) |
| ST-06 | Completeness vs omitted offsetting pairs | P0 | R1 | FIXED_LIVE_API (omit-pair 422; 2026-09-22) |
| ST-07 | Hosted OCR CSP/MIME | P1 | ST-15,17 | DEFERRED (hosted) |
| ST-08 | AppleDouble artifacts | P2 | ST-00,17 | MITIGATED |
| DOC-40 | Dexie table count mismatch | P2 | ST-00 | FIXED |
| ACC-A | Bank credit ≠ automatic income | P0 | ST-05,10,12 | FIXED |
| ACC-B | Balance match ≠ row completeness | P0 | R1 | FIXED_LIVE_API |
| ACC-C | Full-source reconcile before duplicate exclude | P0 | ST-05,11 | FIXED |
| ACC-D | EMI debit ≠ proven P/I split | P0 | ST-10,13 | FIXED (rules; not issuer proof) |
| PRIV | PDF/password on-device | P0 | ST-01,15 | FIXED |
| CORPUS | Authorized real PDFs for 20 banks | P0 | R7 | BLOCKED |
| CARD-PDF | Credit-card PDF document class | P1 | R6 | PARTIAL_VERIFIED_SYNTHETIC (separate API; real samples BLOCKED) |
| REPORT | Bank-movement vs financial-meaning | P0 | ST-12 / R4 | FIXED (library + UI + export bundle) |
| WAVE-A | Kotak/HDFC/SBI/ICICI/Axis certification | P0 | ST-06 | PARTIAL (synthetic; ICICI registered only) |
| WAVE-BD | Remaining 15 banks | P1 | ST-07 | BLOCKED |
| F-ST-03-OBS | Source observations → review | P1 | R2 | PARTIAL_VERIFIED |
| F-ST-08-OCR | OCR uncertainty → commit eligibility | P1 | R2 | PARTIAL_VERIFIED |
| F-ST-10-MATCH | Confirmed matches persistence | P0 | R3 | FIXED_LIVE_API |
| F-ST-11-SOURCE | importSources from statement import | P0 | R3 | FIXED_LIVE_API |
| F-ST-16-GOAL | Goal funding product wiring | P1 | R5 | PARTIAL_VERIFIED |
| F-ENV-API | Live API/browser suites | P0 | R0/R8 | FIXED_VERIFIED (API+browser+backup exit 0) |
| F-REF-01 | Sanitized reference docs | P2 | R0 | PARTIAL |
| F-DOC-01 | Overclaims in status docs | P1 | R0/R8 | FIXED |
| F-BANK-20 | 20-bank verified-for-scope | P0 | R7 | BLOCKED |

Helper unit PASS ≠ FIXED for product-path findings. Update with evidence paths after each phase.
