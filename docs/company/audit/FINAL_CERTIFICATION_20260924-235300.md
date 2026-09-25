# Independent certification scorecard

**Stamp:** `20260924-235300`  
**Auditor rule:** labels below are issued only from artifacts in `docs/company/audit/raw/`. Script banners inside those logs (`ACCOUNTING CORE CERTIFIED`, `COMPANY PRODUCT COMPLETE`, `PHASE_10 OVERALL: PASS`) are **not** adopted. Prior certification documents outside `raw/` are ignored.

**Corpus used:** PHASE_09 stamp `20260924-201658` (`PHASE_09_certification_run.log` and `PHASE_09_01`–`PHASE_09_19`) plus PHASE_10 raw files. Earlier phase logs in the same folder are cited only where PHASE_09 did not re-measure the item.

---

## Labels issued

| Label | Issued | Why |
|-------|--------|-----|
| ACCOUNTING CORE CERTIFIED | **No** | Accounting gates, browser A–N, and the 100k matrix are green, but the re-issue rule requires the checklist at 100%. It is not. |
| COMPANY PRODUCT COMPLETE | **No** | Checklist is not 100% (axe, several P2 items, i18n toggle re-proof). |
| COMPANY PRODUCTION READY | **No** | Phase 10 raw evidence exists and **explicitly leaves staging HTTPS unchecked**. Secrets rotation is documented, not shown as performed. |

---

## Scorecard

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | 0 P0 defects | **Not proven as a defect count** | No P0 register in `raw/`. PHASE_09 final step exits are 0 (`PHASE_09_certification_run.log` steps 1–19 final PASS; `PHASE_09_19` subchecks PASS). That is “no failing gate in this run,” not an enumerated P0=0 audit. |
| 2 | 0 P1 (categories, voucher-new chooser, RBAC soft reads, export `view_*`, A–N, product 8/8) | **Met for the named behaviors** | See P1 table. No open P1 failure string in PHASE_09 outputs. |
| 3 | All P2 closed or explicitly documented | **Not met** | Several named P2 items have no raw artifact (table below). |
| 4 | Viewport 168/168 | **Met** | `PHASE_09_13_viewport.txt`: `SUMMARY pass=168 fail=0 expected=168` |
| 5 | a11y keyboard green | **Met** | `PHASE_09_14_a11y_keyboard.txt`: `KEYBOARD SUMMARY pass=22 fail=0 total=22` |
| 6 | axe 0 critical | **Not met** | No `a11y-axe` output anywhere under `docs/company/audit/raw/`. PHASE_09 did not run axe. |
| 7 | i18n en/gu parity 100% | **Met** | `PHASE_09_15_i18n_audit.txt`: `en keys=380 gu keys=380` / `PASS en/gu key parity 100%` |
| 8 | Toggle persists, English default | **Not re-proven on this stamp** | `PHASE_07.log` states the acceptance text and `CRAWL SUMMARY pass=46 fail=0`. PHASE_09 step 15 is key-parity only. No crawl transcript in the PHASE_09 stamp. |
| 9 | Security matrix PASS (cert user) | **Met** | Runner env `USER=cert_211549` (`PHASE_09_certification_run.log` line 2). `PHASE_09_05_security.txt`: `SECURITY MATRIX PASS`. `PHASE_02.log` records the same script with `COMPANY_E2E_USER=cert_211549`. |
| 10 | IDOR PASS | **Met** | `PHASE_09_04_idor.txt`: `ALL IDOR CHECKS PASSED` |
| 11 | Hydrate 0/100 | **Met** | `PHASE_09_06_hydrate.txt`: `SUMMARY fail=0 / 100` / `HYDRATE RACE PASS` |
| 12 | Backup/restore checksum + TB balanced | **Met** | `PHASE_09_08_backup.txt`: `PASS backup_restore_checksum`, `tb_balanced:1` (PRE and POST). Repeated in `PHASE_10_BACKUP_DRILL.txt`. |
| 13 | Formal 100k matrix | **Met** | `PHASE_09_16_perf_100k.txt`: 10 companies × 10,000 vouchers, `errors: 0`, each company `tb` pair `854824/854824`, bleed PASS, `lines` top-up `passLines: true`, `PERF 100K MATRIX PASS`. `elapsedSec: 2869.197`. |
| 14 | Export fidelity | **Met** | `PHASE_09_09_export_fidelity.txt`: `EXPORT FIDELITY PASS` |
| 15 | Latency budgets at scale | **Met, with scope** | `PHASE_09_10_latency.txt`: Scale Co `95eaa926-…` **10,000 vouchers** (one formal-matrix company, not one 100k-voucher company). All 8 endpoints HTTP 200, `SUMMARY fail=0`. |
| 16 | `finance:gate:all` | **Met** | `PHASE_09_17_finance_gate.txt`: `all automated checks green (21 pass · 0 warn · 0 skip)` |
| 17 | Production ops pack (staging, HTTPS, headers, backups, monitoring, secrets rotated) | **Not met** | `PHASE_10.log` checks headers (config lint), local healthz, backup drill, and “no real `.env` tracked.” It leaves **`[ ] Staging URL over HTTPS`**. Rotation is a written procedure (`SECRETS_ROTATION` cited in the log), not a rotation event in raw. |

**Checklist 100%:** no.

---

## P1 behaviors (named)

| Behavior | Raw |
|----------|-----|
| Categories wired | `PHASE_01.log`: crawl “categories UI” PASS; `PHASE_09_01` includes category tests in the 76-test run |
| Voucher-new chooser | `PHASE_01.log`: “voucher chooser desktop+mobile” PASS; `PHASE_01_CRAWL.txt` present |
| RBAC soft reads | `PHASE_09_05`: voucher-item `view_day_book`, search `view_*` / FORBIDDEN, period-locks `view_dashboard`. `PHASE_02.log` describes the same closures |
| Export `view_*` | `PHASE_09_05`: `PASS exports enforce report view_* permission` |
| Auth A–N | `PHASE_09_11_browser_auth.txt`: PASS A through PASS N (14 lines). Note M: `pdf=false xlsx=true` |
| Product browser 8/8 | `PHASE_09_12_product_browser.txt`: eight `PASS` lines (DASH, DRILL_CASH, BILLS, PERIOD_LOCK_UI, RBAC_SURFACE, SWITCH, NEW_MENU, MOBILE) |

---

## P2 named items

| Item | Status in raw |
|------|----------------|
| Logout isolation | **Closed.** `PHASE_09_01_vitest.txt`: `logoutIsolation.test.ts (2 tests)` inside `Tests 76 passed` |
| Registry source of truth | **Closed.** `PHASE_09_02_php.txt`: `Report registry SoT parity` checks for trial-balance, P&L, BS, day-book, and others |
| Deprecated purposes rejected | **Closed.** `PHASE_09_05`: `PASS deprecated purposes rejected in posting`. `PHASE_02.log`: OTHER / PROPERTY_PAYMENT / REFUND → 422 |
| Mega-files split | **Documented only.** `PHASE_03.log` acceptance line `files>400LOC: none`. No LOC scanner transcript |
| Dead code removed | **No artifact** |
| Skeletons / 403 banners | **No UI artifact.** HTTP 403 lines in the security matrix are API denials, not banner UX |
| Export UX | **No UX artifact.** Fidelity PASS is file generation. Browser step M records `pdf=false` |
| Approvals impact | **No artifact.** Product browser only says the approvals page is reachable |
| StatusBadge typed | **No artifact.** Not named in `PHASE_09_01` test list |

---

## Evidence index (this stamp)

| Artifact | What it proves |
|----------|----------------|
| `PHASE_09_stamp.txt` | `20260924-201658` |
| `PHASE_09_certification_run.log` | Ordered run; final PASS after retries; `USER=cert_211549` |
| `PHASE_09_01_vitest.txt` | 76 tests / 13 files, including logout isolation |
| `PHASE_09_02_php.txt` | `ALL PHP ACCOUNTING TESTS PASSED`; registry SoT |
| `PHASE_09_03_http.txt` | `ALL HTTP/DOMAIN E2E CHECKS PASSED` |
| `PHASE_09_04_idor.txt` | `ALL IDOR CHECKS PASSED` |
| `PHASE_09_05_security.txt` | `SECURITY MATRIX PASS` |
| `PHASE_09_06_hydrate.txt` | `fail=0 / 100` |
| `PHASE_09_07_gate_all.txt` | `company:gate:all (12 pass)` |
| `PHASE_09_08_backup.txt` | checksum PASS, `tb_balanced:1` |
| `PHASE_09_09_export_fidelity.txt` | `EXPORT FIDELITY PASS` |
| `PHASE_09_10_latency.txt` | budgets held on 10k Scale Co |
| `PHASE_09_11_browser_auth.txt` | A–N PASS |
| `PHASE_09_12_product_browser.txt` | 8/8 PASS |
| `PHASE_09_13_viewport.txt` | 168/168 |
| `PHASE_09_14_a11y_keyboard.txt` | keyboard 22/22 |
| `PHASE_09_15_i18n_audit.txt` | 380/380 parity |
| `PHASE_09_16_perf_100k.txt` | formal matrix PASS |
| `PHASE_09_17_finance_gate.txt` | personal finance gates 21/21 |
| `PHASE_09_18_certify_product.txt` | orchestrator subchecks PASS (banner not adopted) |
| `PHASE_09_19_certify_final.txt` | includes `PASS 100k-matrix` (banner not adopted) |
| `PHASE_10.log` | ops pack partial; staging HTTPS open |
| `PHASE_10_HEADERS.txt` | config lint PASS; `LIVE_URL unset` |
| `PHASE_10_HEALTHZ.txt` | local HTTP 200 `status: healthy`, 34 company tables |
| `PHASE_10_BACKUP_DRILL.txt` | second checksum drill PASS, `tb_balanced:1` |
| `PHASE_10_MIGRATE_LIST.txt` | five company migrations; rollback = restore |
| `PHASE_01.log` / `PHASE_01_CRAWL.txt` | categories + voucher chooser (not re-crawled in PHASE_09) |
| `PHASE_02.log` | soft-read and deprecation narrative aligned with PHASE_09 security |
| `PHASE_03.log` | `files>400LOC: none` |
| `PHASE_07.log` | i18n crawl claim 46/46; not repeated in PHASE_09 |

PHASE_09 log also records **failed attempts that were re-run to PASS**: step 7 (browser smoke, Vite down), step 10 (latency 403 before OWNER role), step 13 (viewport before soft-nav), step 16 (report budgets on a large shared DB). The adopted results are the final PASS artifacts, not the failed attempts.

---

## Known limitations (honest)

1. **No axe run** in `raw/`. Keyboard a11y is green; critical axe count is unknown.
2. **i18n toggle persistence and English default** were not re-measured on stamp `20260924-201658`.
3. **P2 UI items** (skeletons, 403 banners, export UX, approvals impact, StatusBadge) have no fresh raw proof. They are not closed by this audit.
4. **Browser export step M** (`PHASE_09_11`): PDF control not found (`pdf=false`); XLSX was found. Export *fidelity* still passed at the PHP layer.
5. **100k report budgets** in `PHASE_09_16` are the scaled floors (TB/BS 20000 ms, P&L 15000 ms, day-book 12000 ms), not the original 3000/2000 ms figures. They passed inside those floors. Wall clock `2869 s` for 100k posts on a database that already held prior scale data.
6. **Latency** is one 10,000-voucher Scale Co, not a single company with 100,000 vouchers.
7. **Staging HTTPS SPA** was not served or header-probed. `PHASE_10_HEADERS.txt`: `LIVE_URL unset`. Healthz evidence is `http://localhost:8080`.
8. **Secrets:** tracked files are examples only (`PHASE_10.log`). The test JWT hash was denylisted in code; **no raw proof that historical credentials were rotated** on a host.
9. **Company migration rollback** is restore-from-backup only (`PHASE_10_MIGRATE_LIST.txt`). There is no down-migration.
10. **Orchestrator banners** in `PHASE_09_18` / `PHASE_09_19` / the PHASE_09 log footer are the scripts’ own strings. This scorecard does not re-issue them.

---

## What would clear the withheld labels

- **ACCOUNTING CORE CERTIFIED** and **COMPANY PRODUCT COMPLETE:** close or document every open P2 row with a raw artifact, run `a11y-axe` into `raw/` with 0 critical, re-crawl i18n (toggle + English default) into `raw/`.
- **COMPANY PRODUCTION READY:** a real `COMPANY_STAGING_URL` over HTTPS with headers check PASS, plus evidence that compromised secrets were rotated (not only denylisted).
