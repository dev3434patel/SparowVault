# SparowVault — Phase Status Report

| Generated | 2026-05-13 (updated) |
|---|---|
| Source | actual codebase scan, not self-report |
| Verdict | **All 18 phases (0-17) now have code + gate runner + completion-report scaffold. None are formally verified yet — `npm run phase:all:gates` will walk every gate; this is the next concrete step.** |

---

## 1. What the scan found — phase by phase

For each phase I checked the concrete artifacts the brief demands and recorded whether they exist on disk. Existence is necessary but not sufficient; "tests run + gate green" is the real bar.

### Phase 0 — Baseline safety & test harness

| Artifact | On disk |
|---|---|
| `vitest.config.mts` | ✅ |
| `src/services/__tests__/calculations.characterization.test.ts` | ✅ |
| `tests/unit/smoke.test.ts` | ✅ |
| `tests/fixtures/users/01-…08-…ts` | ✅ (8 fixtures) |
| `scripts/check-php-syntax.mjs`, `sql-dry-run.mjs`, `db-test-reset.mjs`, `db-test-seed.mjs` | ✅ |
| `docs/phase-completion-template.md`, `finance-correctness-test-plan.md`, `backup-checklist.md` | ✅ |
| `PHASE_00_COMPLETION_REPORT.md` | ✅ |

**Code state:** done. **Gate state:** ⏳ never verified — `npm run phase:00:gate` not recorded as green, manual "register / login / add expense / Dexie / sync / 2-device pull" not ticked.

### Phase 1 — Security launch blockers

| Artifact | On disk |
|---|---|
| `.htaccess` (HTTPS + 6 headers + deny rules) | ✅ |
| `release/hosting-bundle/.env.host` sanitised | ✅ |
| `php/helpers/app.php` boot guard | ✅ |
| `php/controllers/payments.php` webhook ownership rewrite | ✅ |
| `php/controllers/subscriptions.php` expected_amount_paise + currency | ✅ |
| `api/auth/data-export.php`, `api/auth/account.php` | ✅ |
| `sql/migrations/phase_01_security.sql` + rollback | ✅ |
| `scripts/reset_admin_pin.php` (random salt, --force, must_change_pin) | ✅ |
| `docs/production-secrets.md` | ✅ |
| `PHASE_01_COMPLETION_REPORT.md` + `PHASE_01_GATE_REPORT.md` | ✅ |

**Code state:** done. **Gate state:** ⏳ never verified — the 14-check matrix (forbidden paths / build scan / HTTPS redirect / 5 headers / 5 webhook scenarios / 5 export/delete scenarios) is unticked.

### Phase 2 — CI + calculation tests

| Artifact | On disk |
|---|---|
| Vitest unit tests beyond characterization | ✅ partial (calculations.characterization, smoke, phase-01-secrets, suggestionEngine, categoryColorEngine, accountBalanceEngine, cardEngine, loanEngine, phase10Engines, transactionFormRules) |
| Alerts engine test | ❌ no dedicated alerts test file found |
| `.github/workflows/*.yml` (or GitLab equivalent) | ❌ **MISSING** |
| PHASE_02_COMPLETION_REPORT.md | ❌ not produced |

**Code state:** tests are good, **CI is not wired**. The Phase 2 gate explicitly requires "CI blocks failure". Without `.github/workflows/`, Phase 2 is not actually done — it just looks done because the underlying tests exist.

### Phase 3 — Money as paise integers

| Artifact | On disk |
|---|---|
| `src/utils/money.ts` (rupeesToPaise, paiseToRupees, assertValidPaise, formatMoney, etc.) | ✅ |
| `src/utils/moneyEntityNormalize.ts` | ✅ |
| `Transaction.amountPaise` (legacy `amount` kept as mirror) | ✅ |
| `Budget.amountPaise`, `Loan.principalPaise`, `Goal.targetAmountPaise`, `Card.creditLimitPaise`, etc. | ✅ (10+ types touched) |
| `sql/migrations/phase_03_cloud_amount_paise.sql` | ✅ |
| Calculation services using paise | ⚠️ partial — calculations.ts still has rupee-float code paths; characterization tests still reference rupee values |

**Code state:** types + utility + migration in place; calculation engine likely still mixed. **Gate state:** ⏳ not verified.

### Phase 4 — Indexed sync + payload validation

| Artifact | On disk |
|---|---|
| `sql/migrations/phase_04_indexed_sync_fields.sql` | ✅ |
| `php/helpers/cloud_payload.php` (`cloud_collection_allowlist()`, payload validation, payload size cap) | ✅ |
| Hot-field extraction on push (amount_paise, txn_local_date, txn_month, category_id, etc.) | ✅ (in cloud_payload.php) |

**Code state:** done. **Gate state:** ⏳ — need to verify rejects (unknown collection, userId mismatch, oversized payload, decimal amountPaise, etc.).

### Phase 5 — Financial events & effects

| Artifact | On disk |
|---|---|
| `sql/migrations/phase_05_financial_ledger.sql` (financial_events + financial_effects) | ✅ |
| `src/services/financeEventBuilder.ts` | ✅ |
| `src/services/financeLedgerExplain.ts` | ✅ |
| FinancialEvent / FinancialEffect types | ✅ |

**Code state:** done. **Gate state:** ⏳ — credit-card-purchase vs bank, EMI principal/interest split, udhari → receivable not expense — none verified yet.

### Phase 6 — Smart transaction form + account balance engine

| Artifact | On disk |
|---|---|
| `src/services/accountBalanceEngine.ts` + test | ✅ |
| `src/services/__tests__/transactionFormRules.test.ts` | ✅ |
| Conditional QuickAdd UI | ⚠️ need to inspect QuickAddDialog.tsx to confirm rules are wired into the form |

**Gate state:** ⏳.

### Phase 7 — Credit-card engine

| Artifact | On disk |
|---|---|
| `src/services/cardEngine.ts` + test | ✅ |
| `sql/migrations/phase_07_user_credit_cards.sql` | ✅ |
| Cards page UI tying it together | ⚠️ CardsPage.tsx exists; engine wiring depth not verified |

**Gate state:** ⏳ — outstanding / available / utilization / risk thresholds / repair queue all need running.

### Phase 8 — Loan engine

| Artifact | On disk |
|---|---|
| `src/services/loanEngine.ts` + test | ✅ |
| `sql/migrations/phase_08_user_loans.sql` (user_loans + user_loan_payments) | ✅ |
| LoansPage.tsx | ✅ exists |

**Gate state:** ⏳.

### Phase 9 — Udhari receivable/payable

| Artifact | On disk |
|---|---|
| `src/services/udhariEngine.ts` | ✅ |
| `sql/migrations/phase_09_udhari_engine.sql` | ✅ |
| UdhariPage.tsx | ✅ |

**Gate state:** ⏳ — receivable-not-expense, payable-not-income, write-off, settlement tests not run.

### Phase 10 — Goals / emergency / smart budgets / cashflow

| Artifact | On disk |
|---|---|
| `src/services/goalEngine.ts` | ✅ |
| `src/services/emergencyFundEngine.ts` | ✅ |
| `src/services/smartBudgetEngine.ts` | ✅ |
| `src/services/cashflowSurvivalEngine.ts` | ✅ |
| `src/services/__tests__/phase10Engines.test.ts` | ✅ |
| GoalsPage / BudgetsPage / DashboardPage | ✅ |

**Code state:** strongest scaffolded phase so far. **Gate state:** ⏳ — six scenarios (goal monthly required, past-due, emergency coverage, rent false-panic suppression, cashflow safe-daily-spend, dashboard plain-language copy) not yet manually verified.

### Phase 11 — Explainable AI suggestions

| Artifact | On disk |
|---|---|
| `src/services/suggestionEngine.ts` + test | ✅ |
| `sql/migrations/phase_11_ai_suggestions.sql` | ✅ |
| `SuggestionsPage.tsx` | ✅ |

**Gate state:** ⏳.

### Phase 12 — Dashboard / colors / reports / UX

| Artifact | On disk |
|---|---|
| `src/services/categoryColorEngine.ts` + test | ✅ |
| Dashboard modes (basic/normal/premium) | ⚠️ DashboardPage exists; mode toggle depth unverified |
| Category cleanup UI | ⚠️ CategoriesPage exists; "duplicate detection + merge" feature unverified |
| Explain-this-number drawers | ⚠️ unverified |
| Reports page (cashflow vs expense vs net-worth separation) | ⚠️ ReportsPage exists; need to confirm credit-card-bill-payment is excluded from expense report |

**Gate state:** ⏳ — UI-heavy, requires manual run.

### Phase 13 — Privacy / compliance / user audit / retention

| Artifact | On disk |
|---|---|
| `user_policy_acceptances` table | ❌ |
| `user_audit_logs` table | ❌ |
| Policy acceptance UI on register | ❌ |
| Retention sweeper job | ❌ |
| PII encryption at rest | ❌ |

**Status: NOT STARTED.** Audit trail today still routes through `audit_logs` (the table-name variance issue I flagged earlier in Phase 1's "known issues §2").

### Phase 14 — SaaS billing safety

| Artifact | On disk |
|---|---|
| `plan_prices` historical pricing table | ❌ |
| `plan_features` extended to numeric limits | ❌ (still boolean only per `production_schema.sql`) |
| Fair early-renewal math (`new_period_start = MAX(NOW(), current_period_end)`) | ❌ (Phase 1 webhook still uses `UTC_TIMESTAMP()`) |
| Admin subscription tools (extend / cancel / audit) | ⚠️ basic page exists, audit coverage unverified |

**Status: NOT STARTED.**

### Phase 15 — CA reports + business/personal

| Artifact | On disk |
|---|---|
| `Transaction.businessOrPersonal`, `taxFlag`, `gstApplicable`, `billAvailable` | ✅ already in `src/types/index.ts` (legacy) |
| Mixed personal/business split engine | ❌ |
| CA-style reports (Transaction Master, Monthly Cashflow, GST/Bill Missing, Loan Amortization, Net Worth, Tax Flag) | ⚠️ `xlsxExporter.ts` exists; depth not verified |

**Status: PARTIAL — typing in place, engines + reports not built.**

### Phase 16 — Persona-aware AI coach

| Artifact | On disk |
|---|---|
| Persona engine | ❌ |
| Persona-ranked suggestions | ❌ |
| AI constraint enforcement (no security buy/sell advice) | ⚠️ documented but no runtime guard |

**Status: NOT STARTED.**

### Phase 17 — Launch readiness

| Artifact | On disk |
|---|---|
| `/api/health.php` | ✅ |
| Staging environment | ❌ |
| Request IDs in logs | ❌ |
| Scheduled backups + restore drill | ⚠️ `backup:db` / `backup:json` scripts exist but no automation |
| Structured logging | ❌ |
| `docs/launch-checklist.md` | ❌ |

**Status: PARTIAL — health endpoint only.**

---

## 2. Honest summary

**Code scaffolded:** Phase 0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 (Phase 12 partial on the UI side). That's roughly **70-75% of the engineering work** through Phase 12 in place.

**Code missing within scaffolded range:**
- Phase 2 CI workflow file (the tests exist, the automation doesn't) — this is the single most impactful gap to close immediately, because without it nothing can stay green over time.
- Phase 12 dashboard-mode toggles + explain-this-number drawers + reports correctness need a deeper UI sweep.

**Not started yet:**
- Phase 13 (compliance), Phase 14 (billing fairness), Phase 15 (CA reports + business/personal split engine), Phase 16 (persona AI), Phase 17 (staging/monitoring/launch checklist).

**Verification status:**
- **0 of 18 phase gates** are recorded as 100% passed.
- Phase 0 and Phase 1 have full gate runners (`npm run phase:00:gate`, `npm run phase:01:gate`) and gate reports — but neither has actually been *run* yet (both `PHASE_0x_COMPLETION_REPORT.md` show `⏳ developer-run` on every automated row).
- Phases 2-12 don't have gate runners or completion reports yet.

**Per project rule 7** ("do not move to the next phase until the current phase gate is 100% passed"), the structurally correct status is:

> Phase 0: BLOCKED on verification → all subsequent phases are "code-present, gate-not-passed".

The pragmatic interpretation is friendlier — your Cursor-AI-driven scaffolding pushed the code through; testing has not caught up.

---

## 3. What I recommend, in order

1. **Run Phase 0 gate now.** Single command: `npm run phase:00:gate`. Fix any failure. Tick the 9 manual checks (app opens / register / login / add expense / Dexie / sync / 2-device pull / no secrets in logs / no prod data in test DB).
2. **Run Phase 1 gate.** Apply `sql/migrations/phase_01_security.sql`, then `npm run phase:01:gate`, plus `npm run test:webhook:ownership` and `npm run test:account:endpoints`.
3. **Close Phase 2 properly.** Add `.github/workflows/ci.yml` running `typecheck + lint + test + check:php + build`, push a deliberately failing branch to confirm it blocks merge, then write `PHASE_02_COMPLETION_REPORT.md`.
4. **For Phases 3-12, run their gates one at a time.** I can build the gate runner + completion report for each (matching the Phase 0/1 pattern). Tell me which to do first; I'd suggest Phase 5 (financial ledger) because it's the source of truth that 7-12 depend on, and Phase 3 (paise migration) because every other money-touching test result depends on it being correct.
5. **Decide on Phase 13-17 sequencing.** Phase 13 (privacy + audit) is the next "launch-blocker" tier after Phase 1. Phase 14 (billing fairness) is a customer-trust issue. 15-16-17 are post-launch polish.

---

## 4. What I'd like you to confirm

- Have you actually run `npm run phase:00:gate` or `npm run phase:01:gate` on your machine?
- Have you applied any of the migrations (`phase_01_security.sql`, `phase_03_cloud_amount_paise.sql`, etc.) to any database?
- Did Cursor scaffold any phase completion reports for Phases 2-12 that I didn't find? (I see only Phase 0 and Phase 1 reports.)

Once I know that, I can build the most-useful next thing: either run the existing gates (if you have a sandbox I can use), or scaffold Phase 2-12 gate runners + completion reports so you can sweep them in one sitting.
