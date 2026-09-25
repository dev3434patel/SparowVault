# SparowVault Company — 226-Phase Final Certification

**Evidence folder:** [docs/company/final-certification/20260923-200918](./)  
**Date:** 2026-09-23  
**Auditor stance:** Independent of prior PASS claims.

## Domain summary

| Domain | Impl | Unit | PHP | API | Browser | RBAC | IDOR | Accounting | Perf | Verdict |
| ------ | ---: | ---: | --: | --: | ------: | ---: | ---: | ---------: | ---: | ------- |
| Governance A | Y | — | — | — | — | — | — | — | — | PASS |
| Isolation B | Y | Y | Y | Y | struct | Y | Y | — | — | PASS |
| DB/Migration C | Y | — | Y | — | — | — | — | — | — | PARTIAL |
| Security D | Y | — | Y | Y | — | PARTIAL | Y | — | — | PARTIAL |
| COA E | Y | Y | Y | Y | struct | — | Y | Y | — | PASS |
| Parties F | Y | Y | Y | Y | struct | — | Y | Y | — | PARTIAL |
| Voucher/Purpose G | Y | Y | Y | Y | struct | — | — | Y | — | PASS |
| Bills/Locks/Reverse H | Y | Y | Y | Y | struct | — | — | Y | — | PASS |
| Reports/Export I | Y | Y | Y | Y | struct | — | — | Y | smoke | PARTIAL |
| Live Browser J | Y | — | — | — | PARTIAL | — | — | — | — | PARTIAL |
| Concurrency/Perf K | Y | Y | Y | Y | — | — | — | Y | SCALE | PARTIAL |
| Final L | — | — | — | — | — | — | — | — | — | SEE BELOW |

## Defects discovered & closed this audit

| ID | Severity | Fix |
|----|----------|-----|
| AUD-001 | P1 | Invite stub → FUTURE-honest page |
| AUD-002 | P1 | Canonical `company_preview_hash_context()` |
| AUD-006 | **P0** | Voucher number string-sort collision after 9999 → numeric MAX + 8-digit pad |

## Mandatory conditions checklist (THIS prompt)

| Condition | Status |
|-----------|--------|
| 0 known P0 | **PASS** (AUD-006 fixed + regression) |
| 0 known P1 accounting | **PASS** |
| 0 unbalanced POSTED in fixtures | **PASS** |
| Preview/post parity + PREVIEW_STALE | **PASS** |
| No silent ON_ACCOUNT | **PASS** |
| No tenant leaks (IDOR suite) | **PASS** |
| Migration restore checksum | **PASS** |
| Domain/HTTP E2E | **PASS** |
| `company:gate:all` 12/12 | **PASS** |
| Personal finance regression | **PASS** |
| Live authenticated Playwright full A–N workflows | **PARTIAL / NOT MET** (SPA HTTP 200 + structural smoke only) |
| 100k / 10-company / 500k-line matrix | **PARTIAL** — AUD-006 fixed; 12k PASS; 100k single-company in progress (~35k+ observed, no collision); 10-company matrix not completed |

## Certification decision

# NOT ISSUED: ACCOUNTING CORE CERTIFIED (under THIS 226-phase mandatory bar)

### Why not issued

Per Phase 226 lock: **live authenticated browser PASS** and **100k performance PASS** are mandatory.  
Current evidence does **not** satisfy full authenticated Playwright journeys.  
100k bench previously **failed** (P0 voucher seq) — fixed; re-run evidence pending in `raw/EVIDENCE_COMPANY_100K_PERFORMANCE.txt`.

### What IS proven

> No known P0/P1 accounting, tenant-isolation, or silent no-op defects remain in the executed unit, PHP domain, HTTP/domain E2E, IDOR, restore-checksum, and specialized gate matrices **after** AUD-001/002/006 fixes. Full authenticated browser automation and complete 10-company 100k matrix remain open certification blockers under this prompt.

### Do NOT claim

```text
100% BUG-FREE
```

## Final Q&A (evidence-backed)

| Question | Answer |
|----------|--------|
| Can Company A see Company B? | **No** in IDOR suite |
| Unauthorized post? | **Blocked** by membership/permissions |
| Debit ≠ Credit? | **Rejected** |
| Preview ≠ post? | **Hash mismatch → PREVIEW_STALE**; parity test PASS |
| Unapproved affect reports? | **No** (POSTED only) |
| Locked period post later via approval? | Period recheck exists; full matrix PARTIAL |
| ON_ACCOUNT disappear? | **No** — persisted null bill_ref |
| Bill over-settled? | **Rejected** in demo-certify |
| Same mutation two vouchers? | **No** — idempotent |
| Reverse leave original active? | **No** — REVERSED + replay-safe |
| Fake stub in production? | Invite fixed; core pages LIVE |
| Company change personal totals? | **No** — finance:gate:all PASS |
| 100k usable? | Seq P0 fixed; scale evidence updating |

## Artifacts

- `COMPANY_CURRENT_TRUTH.md`
- `COMPANY_FINAL_DEFECT_REGISTER.md`
- `226_PHASE_TRACEABILITY_MATRIX.md`
- `COMPANY_OPEN_GAPS_FINAL.md`
- `raw/EVIDENCE_*`
