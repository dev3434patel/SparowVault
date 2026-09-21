# SparowVault — Post-Implementation Audit Report

| Field | Value |
|-------|--------|
| Document ID | `SV-POST-IMPL-AUDIT-2026-09-22` |
| Audit date | 2026-09-22 |
| Branch | `feat/statement-intelligence-v2` |
| HEAD commit | `bf00397d9f1ee93a17006c50ce97a8a48103516b` |
| Working tree | **Dirty** — uncommitted statement-intelligence changes (see freeze) |
| Scope | Local audit only; no deploy; no product code changes during audit |
| Auditor stance | Independent verification — not implementer certification |

## Overall conclusion

**`LOCAL_PIPELINE_VERIFIED_BANK_SCOPE_PARTIAL`**

Also mandatory: **`BLOCKED_FOR_20_BANK_CLAIM`**

| Label | Result |
|-------|--------|
| LOCAL_PIPELINE_VERIFIED | **PARTIAL PASS** — shared on-device extract → review → JSON commit → atomic write path exists; arithmetic before exclude is verified in unit/API design; live API suite **NOT_RUN** this session (no disposable TEST_DB env) |
| LAYOUT_VERIFIED | **none** (0 `verified-for-scope`) |
| LOCAL_STATEMENT_RELEASE_CANDIDATE | **NO** |
| BLOCKED_FOR_20_BANK_CLAIM | **YES** |
| HOSTED_RELEASE | **NOT_TESTED** |
| LOCAL_REMEDIATION_REQUIRED | **YES** — confirmed connectivity/completeness gaps (see findings) |

This audit does **not** carry forward September “PASS” counts as current proof. Fresh commands and code inspection are cited below.

---

## 1. Freeze (Step 1)

| Item | Value |
|------|--------|
| Branch | `feat/statement-intelligence-v2` |
| HEAD | `bf00397d9f1ee93a17006c50ce97a8a48103516b` (“comitt”, 2026-09-21) |
| Dirty paths | `.gitignore`, `package.json`, `php/controllers/statements.php`, `StatementImportDialog.tsx`, `classification.ts`, `parser.ts`, `types.ts`, plus many untracked `docs/statements-v2/*`, statement services, fixtures, scripts |
| Node | v22.20.0 |
| npm | 11.8.0 |
| PHP | 8.4.13 (Imagick version warning present) |
| package-lock SHA256 | `2F6039F5700384343402AD0E9B98D3226245692B9BAB8EA94594F69F219FEB7B` |
| Layout registry | `php/config/statement_layouts.json` v1 — 5 synthetic-tested, 15 registered, **0 verified-for-scope** |
| Parser versions | `statement-text-v2`, `statement-ocr-v1` |
| Corpus | Synthetic under `tests/fixtures/statements/`; real `.local/statement-corpus/` empty / gitignored |

### Missing reference files (reported, not assumed)

| Expected by audit brief | Present? |
|-------------------------|----------|
| `SparowVault_Post_Implementation_Audit_Prompt.md` | **MISSING** (instructions pasted in chat only) |
| `SparowVault_Statement_20_Bank_Cursor_Playbook_2026-09-21.md` | **MISSING** as named file |
| `SparowVault_Statement_Research_and_Gap_Report_2026-09-21.md` | **MISSING** as named file |
| `SV-SUPER-AUDIT-2026-09-21` | Present as `docs/SUPER_DETAILED_PROJECT_AUDIT_REPORT.md` |
| `docs/statements-v2/*` implementation reports | Present (uncommitted) |

---

## 2. What works now (fresh evidence)

| Area | Evidence | Verification |
|------|----------|--------------|
| TypeScript compiles | `npm run typecheck` exit **0** | PASS |
| Statement unit suites | `statementParser` 64 + `statementIntelligence.v2` 17 = **81** pass | PASS |
| `statements:certify` | exit **0**; scorecard regenerated; still `blocked: true` | PASS (honest blocker preserved) |
| PHP syntax | `check:php` 82 files clean | PASS |
| Synthetic March/April debit/credit **amounts and counts** | Unit oracle + verifier | PASS (synthetic only) |
| Offsetting-pair completeness **in library** | Unit test removes pair → incompleteness | PASS (library) |
| Full-source arithmetic before exclude (PHP design) | `statements.php` builds `$verifierRows` then `statement_validate_arithmetic` before `include` skip; row loop still validates all balances | PASS (code + prior API test design; live API **NOT_RUN** this audit) |
| Privacy contract (no PDF/password on API) | Types + controller unexpected-field reject; draft.ts omits PDF/password | PASS (code); live API **NOT_RUN** |
| Layout honesty | 0 verified-for-scope; UI support labels | PASS |
| Card purchase ≠ bank debit; `cc_payment` pattern | finance_events + statement kinds | PASS (code); statement API **NOT_RUN** this session |
| EMI narration ≠ P/I split (helper) | `cardDocument.ts` + unit | PASS (library) |
| Goal earmark rule (helper) | `goalFunding.ts` + unit | PASS (library only) |
| Draft without secrets | `draft.ts` | PASS |
| Auth CSRF hooks on import | `csrf_require_for_mutations` in `statements_import` | PASS (code); live **NOT_RUN** |

---

## 3. What exists but is not fully connected

| Capability | Implementation | Verification | Finding |
|------------|----------------|--------------|---------|
| Completeness / offsetting-pair guard | `verifier.ts` + `statement_verifier.php` | Unit only | **F-ST-05-WIRE** — PHP/UI never call completeness |
| Match → `reconciliationMatches` | `proposeStatementMatches` + `toReconciliationMatchDraft` | UI shows count only; draft helper unused | **F-ST-10-MATCH** |
| Observation provenance / bbox | `observations.ts` types | Unused by parser/UI | **F-ST-03-OBS** |
| OCR field uncertainty | `ocrUncertainty.ts` | Not imported by UI/parser path (warning text only) | **F-ST-08-OCR** |
| Credit-card PDF class | `cardDocument.ts` | Heading reject in deposit parser; no card table extraction | **F-ST-13-CARD** |
| Goal earmark helpers | `goalFunding.ts` | Not used by goals UI/engines | **F-ST-16-GOAL** |
| `importSources` store | Dexie + sync | Never written by statement import | **F-ST-11-SOURCE** |
| Implementation docs claiming completeness “FIXED” | `docs/statements-v2/GAP_REGISTER.md` | Overstates live wiring | **F-DOC-01** |

---

## 4. What is missing vs approved plan

1. Authorized real-bank corpus + independent holdouts for 20 banks → **BLOCKED**
2. Per-layout `LAYOUT_VERIFIED` for Wave A beyond synthetic (Kotak private oracle not reproduced this audit)
3. Field-level correction editor with source bounding boxes
4. Live completeness enforcement on analyze/commit
5. Persisted reconciliation matches / import source records from statement flow
6. Credit-card PDF end-to-end import class
7. Hosted CSP/MIME / package production certification
8. Fresh `test:statements` / browser / finance:gate:all execution in this audit (environment)

---

## 5. Confirmed failures / defects

No unit-test failures this session. Confirmed **product defects / gaps** (not test noise):

### F-ST-05-WIRE — Completeness not on live path
- **Severity:** High (finance correctness)
- **Impact:** Omitted offsetting debit+credit can preserve closing balance; live import will not fail closed on count/gross evidence
- **Location:** `php/helpers/statement_verifier.php` unused by `statements_commit`; dialog uses `reconcileStatement` only
- **Expected:** Full-source completeness before posting when printed/expected counts exist
- **Actual:** Arithmetic only on live path
- **Evidence:** Repo grep — `statement_validate_completeness` only defined, never called from controllers
- **Fix:** Wire completeness into analyze + commit with optional/required evidence fields; regression with synthetic omit-pair case through API
- **Closure:** API + unit prove omit-pair rejected without relying on net balance alone

### F-ST-10-MATCH — Matches not persisted
- **Severity:** Medium
- **Impact:** Duplicate suggestions cannot become durable reconciliation records
- **Location:** `matching.ts` `toReconciliationMatchDraft` unused; dialog only shows count
- **Fix:** Persist suggested/confirmed matches or remove dead API to avoid false capability claims

### F-ST-03-OBS / F-ST-09-EDIT — Observation provenance & correction editor incomplete
- **Severity:** Medium (OCR/review)
- **Impact:** Users cannot correct a single OCR amount with bbox evidence; page jump only
- **Location:** `StatementImportDialog.tsx`; unused `observations.ts` boxes

### F-DOC-01 — Gap register overclaim
- **Severity:** Low (process)
- **Impact:** Misleading “FIXED” for ACC-B/ST-06 completeness
- **Location:** `docs/statements-v2/GAP_REGISTER.md`

### F-REF-01 — Named playbook/research/audit-prompt files absent
- **Severity:** Low (audit completeness)
- **Impact:** Traceability to external named packs incomplete

---

## 6. Bank layouts with real evidence

| Bank | Status | Real holdout this audit | Synthetic |
|------|--------|-------------------------|-----------|
| kotak | synthetic-tested (+ numbered special-case) | **BLOCKED** (private corpus not available) | Yes |
| hdfc, sbi, axis, indusind | synthetic-tested | **BLOCKED** | Yes |
| icici + Waves B–D (15) | registered | **BLOCKED** | No layout fixtures |

**No bank has `verified-for-scope` or `real-corpus-tested` in the current registry.**

Recognizing a bank name in `statement_banks.json` (38 IDs) is **not** verified layout support.

---

## 7. Monthly debit/credit counts and totals

| Scope | Exact? |
|-------|--------|
| Synthetic acceptance fixture March/April | **YES** (fresh unit) |
| Live imported real statements | **NOT_RUN** / **BLOCKED** (no real corpus) |
| Overlapping statement merge in account-month reports | **PARTIAL** — report helpers exist; no fresh multi-doc E2E this audit |

April credits in the synthetic oracle correctly remain non-income without purpose approval (unit).

---

## 8. Money loss / duplicate / misclassification risk

| Risk | Status |
|------|--------|
| Double card expense on repayment | Mitigated in ledger model (`cc_payment`); API suite historical — **NOT_RUN** this session |
| EMI P/I invented from narration | Refused in helper; statement excludes EMI kinds | PASS (library) |
| Transfer as income | Classification + server | PASS (code) |
| Udhari as income via statement | Classification blocks; cannot post udhari kind via statement API | PARTIAL verify (weak dedicated test) |
| Duplicate economic event on re-import | Deterministic `stmt_` ids + mutation receipts | PASS (code); live **NOT_RUN** |
| Offsetting omitted rows | **LIVE RISK remains** (F-ST-05-WIRE) |
| Goal earmark creating cash/asset | Helper correct; **not product-wired** |

---

## 9. Prioritized repair plan (dependency order)

1. **P0** Wire completeness into analyze + PHP commit; add API regression for omit-pair (F-ST-05-WIRE)
2. **P0** Acquire authorized Wave A corpora; independent goldens; holdout certify (unblock LAYOUT_VERIFIED)
3. **P0** Run fresh `test:statements` + browser suite on disposable DB; attach logs
4. **P1** Field correction + bbox provenance OR explicitly scope out of release claims
5. **P1** Persist or delete reconciliation match / importSources dead paths
6. **P1** Correct GAP_REGISTER overclaims (F-DOC-01)
7. **P2** Card PDF class end-to-end if in scope
8. **P2** Hosted CSP/MIME certification track

---

## 10. Exact local scope verified this audit

**Verified (fresh):** Typecheck; 81 statement unit tests; statements:certify scorecard honesty; PHP lint; layout registry counts; code inspection of commit arithmetic order; draft privacy; library completeness/oracle/EMI/goal helpers.

**Not verified this audit:** Live statement API/browser E2E; finance:gate:all; real-bank PDFs; hosted package; multi-device outbox; full UI page matrix runtime; Razorpay live.

---

## September gap reconciliation (ST-01…ST-08)

| ID | Sep status | This audit |
|----|------------|------------|
| ST-01 real layouts | OPEN | **Still OPEN** (mitigated by truthful registry) |
| ST-02 OCR modes | OPEN | **Still OPEN** |
| ST-03 correction editor | OPEN | **Still OPEN / PARTIAL** |
| ST-04 purpose suggestions | Accepted | **Accepted** |
| ST-05 drafts | Accepted | **FIXED** (local draft) |
| ST-06 offsetting pairs | Mitigated | **PARTIAL** — library fixed, live unwired |
| ST-07 hosted OCR CSP | OPEN | **Still OPEN / DEFERRED** |
| ST-08 AppleDouble | OPEN | **MITIGATED** |

---

## Audit-created files

All under `docs/audit-post-impl-2026-09-22/` (see `EVIDENCE_MANIFEST.json`).

**Product source was not modified during this audit.**
