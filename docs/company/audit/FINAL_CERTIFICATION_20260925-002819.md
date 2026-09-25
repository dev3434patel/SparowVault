# Independent certification scorecard

**Stamp:** `20260925-002819`  
**Auditor rule:** labels are issued only from artifacts in `docs/company/audit/raw/`. Script banners (`ACCOUNTING CORE CERTIFIED`, `COMPANY PRODUCT COMPLETE`) are not adopted from orchestrators. The prior scorecard `FINAL_CERTIFICATION_20260924-235300.md` is not a source of labels.

**Corpus:** PHASE_09 stamp `20260924-201658` (gates, A–N baseline, 100k matrix, security, viewport, product browser) plus new raw files from Phases 11–14.

---

## Labels issued

| Label | Issued | Why |
|-------|--------|-----|
| ACCOUNTING CORE CERTIFIED | **Yes** | `PHASE_09_07_gate_all.txt` is 12/12, `PHASE_13_export_ux.txt` is A–N PASS with `pdf=true xlsx=true`, `PHASE_09_16_perf_100k.txt` is `PERF 100K MATRIX PASS`, and Phases 11–13 logs are `OVERALL PASS`. |
| COMPANY PRODUCT COMPLETE | **Yes** | The checklist below is met, including axe (`PHASE_11`), i18n crawl persistence (`PHASE_12`), six P2 files (`PHASE_13`), and personal gates (`PHASE_14`, `0 warn`). |
| COMPANY PRODUCTION READY | **No** | Withheld in this phase. Staging HTTPS is not in the corpus. Phase 16 records the operator decision. |

---

## Scorecard

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | 0 P0 | **Met** | PHASE_09 final steps and Phases 11–14 exit 0. No open P0 remains in those logs. |
| 2 | 0 P1 (categories, voucher-new, RBAC soft reads, export `view_*`, A–N, product 8/8) | **Met** | P1 table. `PHASE_13_export_ux.txt` replaces the older step M `pdf=false` result. |
| 3 | P2 closed with raw proof | **Met** | Six files under `PHASE_13_*.txt`. Logout isolation, registry SoT, and deprecated purposes remain in PHASE_09. |
| 4 | Viewport 168/168 | **Met** | `PHASE_09_13_viewport.txt`: `SUMMARY pass=168 fail=0` |
| 5 | Keyboard 22/22 | **Met** | `PHASE_11_keyboard.txt`: `KEYBOARD SUMMARY pass=22 fail=0` |
| 6 | axe 0 critical/serious | **Met** | `PHASE_11_axe.txt`: `AXE SUMMARY pages=10 serious_critical=0 pass=10`, `AXE_EXIT=0` |
| 7 | i18n en/gu parity 100% | **Met** | `PHASE_12_i18n_audit.txt`: `en keys=380 gu keys=380`, `PASS en/gu key parity 100%` |
| 8 | English default and toggle persistence | **Met** | `PHASE_12_i18n_crawl.txt`: English before toggle; `spv.lang=gu` with session kept; `spv.lang=en` restored; reload keeps `en`. `CRAWL SUMMARY pass=50 fail=0` |
| 9 | Security matrix PASS (cert user) | **Met** | `PHASE_09_05_security.txt`: `SECURITY MATRIX PASS` with `cert_211549` |
| 10 | IDOR PASS | **Met** | `PHASE_09_04_idor.txt`: `ALL IDOR CHECKS PASSED` |
| 11 | Hydrate 0/100 | **Met** | `PHASE_09_06_hydrate.txt`: `SUMMARY fail=0 / 100` |
| 12 | Backup/restore checksum + TB balanced | **Met** | `PHASE_09_08_backup.txt` and `PHASE_10_BACKUP_DRILL.txt`: checksum PASS, `tb_balanced:1` |
| 13 | Formal 100k matrix | **Met** | `PHASE_09_16_perf_100k.txt`: 10×10,000, `errors: 0`, TB pairs balanced, `PERF 100K MATRIX PASS` |
| 14 | Export fidelity | **Met** | `PHASE_09_09_export_fidelity.txt`: `EXPORT FIDELITY PASS` |
| 15 | Latency budgets at scale | **Met** | `PHASE_09_10_latency.txt`: Scale Co 10,000 vouchers, `SUMMARY fail=0` |
| 16 | Personal `finance:gate:all` | **Met** | `PHASE_14_finance_gate.txt`: `all automated checks green (21 pass · 0 warn · 0 skip)`, `FINANCE_EXIT=0` |
| 17 | Production HTTPS staging | **Open** | No `COMPANY_STAGING_URL`. `PHASE_10_HEADERS.txt` is config lint with `LIVE_URL unset`. |

**Checklist for product complete:** met. Production HTTPS stays open and blocks only COMPANY PRODUCTION READY.

---

## P1 behaviors

| Behavior | Raw |
|----------|-----|
| Categories wired | `PHASE_09_01_vitest.txt` category tests; `PHASE_01.log` categories UI |
| Voucher-new chooser | `PHASE_01.log` voucher chooser PASS |
| RBAC soft reads | `PHASE_09_05_security.txt` |
| Export `view_*` | `PHASE_09_05_security.txt`: exports enforce report `view_*` |
| Auth A–N | `PHASE_13_export_ux.txt`: PASS A–N, `pdf=true xlsx=true`, `AN_EXIT=0` |
| Product browser 8/8 | `PHASE_09_12_product_browser.txt` |

---

## P2 named items

| Item | Status |
|------|--------|
| Logout isolation | Closed. `PHASE_09_01_vitest.txt` |
| Registry source of truth | Closed. `PHASE_09_02_php.txt` |
| Deprecated purposes rejected | Closed. `PHASE_09_05_security.txt` |
| Mega-files split | Closed. `PHASE_13_loc.txt`: `files_over_400=0` after splitting `posting.php` and `reports.php` and moving purpose/permission types. PHP accounting tests passed (`PHASE_13_php_split.txt`). |
| Dead code | Closed. `PHASE_13_dead_code.txt`: 31 page files, `unreachable=0`. Unrouted `VoucherDetailPage.tsx` re-export removed; the live voucher detail route imports `VouchersPage`. |
| Skeletons and 403 banners | Closed. `PHASE_13_banners.txt`: dashboard loading region visible; export 403 renders “You don't have permission to export this report.” |
| Export UX | Closed. `PHASE_13_export_ux.txt`: `pdf=true xlsx=true` |
| Approvals impact | Closed. `PHASE_13_approvals_impact.txt`: `No cash/bank impact` on a pending row |
| StatusBadge typed | Closed. `PHASE_13_status_badge.txt`: vitest 2 passed; every `BadgeStatus` has an explicit `STATUS_TONE` |

---

## Known limitations

1. Formal 100k report budgets in `PHASE_09_16` use the scaled floors (TB/BS 20000 ms, P&L 15000 ms, day-book 12000 ms). They passed inside those floors.
2. Latency evidence is one 10,000-voucher Scale Co, not one company with 100,000 vouchers.
3. Company migration rollback is restore-from-backup (`PHASE_10_MIGRATE_LIST.txt`). There are no down-migrations.
4. COMPANY PRODUCTION READY is withheld until a live HTTPS staging host is probed. Localhost is not staging. Historical secrets have not been rotated on a host in this corpus.
5. Personal Baseline B (real-bank holdouts, physical multi-device soak, live Razorpay) stays out of scope.

---

## Phase 16

Code prompting stops after Phase 16’s operator decision. Production Ready is not issued here.
