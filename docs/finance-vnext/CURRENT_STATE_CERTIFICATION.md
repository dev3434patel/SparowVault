# SparowVault vNext — Current State Certification (Phase A)

> **SUPERSEDED FOR LIVE INVENTORY (2026-08-21+):**  
> This Phase A snapshot predates vNext collections (card EMI, households, obligations, etc.).  
> For the auditor-facing **post-implementation evidence package**, use:  
> **[`FCR_EVIDENCE_CERTIFICATION.md`](./FCR_EVIDENCE_CERTIFICATION.md)**  
> plus `SPAROWVAULT_VNEXT_FINANCE_CERTIFICATION.md` and `docs/finance-vnext/EVIDENCE_*.txt`.

| Field | Value |
|-------|-------|
| Generated | 2026-08-21 |
| Phase | A — Current-State Certification (**historical**) |
| Repository | `d:\Claude\SparowVault` |
| App version | 0.1.0 |
| Evidence source | Live code, tests, migrations (not audit documents alone) |

---

## 1. Executive Summary

SparowVault is a **production-shaped personal finance platform** for the Indian market: React 19 + TypeScript SPA, PHP/MySQL cloud API, Dexie offline mirror, Razorpay SaaS billing, and a **Phase 5 financial ledger** (`FinancialEvent` + `FinancialEffect`) that correctly separates many economic views at the engine level.

**Phase A finding:** The codebase is a strong foundation for vNext, but it is **not yet a professional household financial operating system**. Core ledger semantics for transfers, card purchases, card payments, loan disbursement, EMI splits, udhari, investments, and goals are largely correct and tested. Major gaps remain in **card EMI lifecycle**, **payment channel vs funding instrument**, **unified obligations**, **household mode**, **reconciliation center**, **intent-based Quick Add**, and **clearly named KPIs** (operating surplus vs net liquid change).

**No money logic was altered in Phase A.** This document certifies what exists today.

---

## 2. Technology Stack (Verified)

| Layer | Technology | Key paths |
|-------|------------|-----------|
| Frontend | React 19, Vite 5, TypeScript 5, Tailwind 4, Radix UI | `src/` |
| State | Zustand (5 stores) | `src/store/` |
| Local DB | Dexie 4 / IndexedDB (`sparowvault_v1`) | `src/db/database.ts` |
| Backend | PHP 8.x custom router (no Composer) | `php/` |
| Server DB | MySQL 5.7+ / MariaDB, utf8mb4 | `sql/` |
| Sync | Contract-driven push/pull | `src/config/syncContracts.ts`, `api/cloud/sync/` |
| Auth | HS256 JWT in **httpOnly cookie** `sv_auth` | `php/helpers/auth.php`, `src/lib/apiClient.ts` |
| Billing | Razorpay orders + webhook | `php/controllers/payments.php` |
| Tests | Vitest (247 unit), Playwright/custom E2E | `tests/`, `src/services/__tests__/` |
| Money | Integer **paise** end-to-end | `src/utils/money.ts`, `php/helpers/money_paise.php` |

---

## 3. Architecture Topology

```
Browser (React)
  ├── Dexie mirror (offline read/write fallback)
  ├── In-memory ledger rebuild (dataStore → financeEventBuilder)
  └── HTTP credentials:include → PHP API (:5000)
         ├── cloud_collection_rows (JSON entity store)
         ├── financial_events / financial_effects (Phase 5 SQL ledger)
         ├── user_credit_cards / user_loans / udhari_* (shadow/analytics tables)
         └── Razorpay webhook → payments / subscriptions
```

### 3.1 Source of truth hierarchy (current)

| Domain | Canonical today | Notes |
|--------|-----------------|-------|
| User-facing transactions | `Transaction` rows (Dexie + cloud sync) | UI list/edit |
| Economic effects | `buildLedgerForTransaction()` in `financeEventBuilder.ts` | Rebuilt in memory on client; persisted server-side via `finance_events.php` |
| Account balances (computed) | Ledger cash effects + opening balance | `accountBalanceEngine.ts` |
| Card outstanding | Ledger liability effects (preferred) | Fallback: shadow table, then transaction sum |
| Loan outstanding | `loanEngine.ts` + EMI payment rows | Not fully ledger-derived |
| KPI dashboard income/expense | Ledger when effects exist; else transaction rollups | `DashboardPage.tsx` |

### 3.2 Sync write strategy (verified)

`BaseRepo.create()` attempts **cloud-first** write; on failure, saves locally (`src/repositories/baseRepo.ts`). Bulk sync via `/api/cloud/sync/push.php` and pull on boot. **No durable outbox UI** with explicit `pending/syncing/failed` states for financial writes.

---

## 4. Finance Engine Inventory

| Module | File | Maturity | vNext gap |
|--------|------|----------|-----------|
| Ledger builder | `financeEventBuilder.ts` | **Strong** — 17 transaction types mapped | Missing cash withdrawal/deposit, reimbursement, card EMI conversion |
| Ledger views | `ledgerCalculations.ts` | **Good** — income/expense from effects | No operating surplus / financing cost / debt principal repaid split |
| Calculations | `calculations.ts` | **Mixed** — loans/cards good; `netMonthlySavings` legacy | KPI naming ambiguous |
| Card engine | `cardEngine.ts` | **Basic** — outstanding, statement window, min due heuristic | No EMI plans, billed/unbilled EMI split, credit balance, shared limits |
| Loan engine | `loanEngine.ts` | **Good** — amortization, foreclosure, overdue | Separate from card EMI (correct) |
| Udhari engine | `udhariEngine.ts` | **Good** | Write-off in ledger; ageing UI exists |
| Cashflow survival | `cashflowSurvivalEngine.ts` | **Good** — safe daily spend | Not full payday-to-payday obligation engine |
| Emergency fund | `emergencyFundEngine.ts` | **Basic** | Essential vs discretionary not first-class |
| Budget | `smartBudgetEngine.ts` | **Good** | No sinking funds |
| Suggestions | `suggestionEngine.ts` | **Good** — deterministic inputs | AI rephrase only |
| CA reports | `caReports.ts` | **Good** | Missing card EMI report, obligation calendar |
| Transaction form | `transactionFormRules.ts` | **Type-based** | No intent-first Quick Add |
| Transaction preview | `transactionPreview.ts` | **Partial** | Effect preview exists for some types |

---

## 5. Data Model (Verified Collections)

### Dexie / sync collections (`syncContracts.ts`)

`users`, `settings`, `accounts`, `cards`, `categories`, `transactions`, `budgets`, `goals`, `goalContributions`, `loans`, `emiPayments`, `udhari`, `udhariSettlements`, `investments`, `savingsContributions`, `recurringRules`, `reminders`, `alerts`, `attachments`, `exportHistory`, `auditLogs`, `snapshots`, `aiSuggestions`

### Not present (vNext requirements with no equivalent)

- `cardEmiPlans`, `cardEmiInstallments`, `cardStatements`, `cardPaymentAllocations`
- `obligations`, `sinkingFunds`
- `households`, `householdMembers`
- `transferLinks`, `reconciliationMatches`, `importSources`
- `insurancePolicies`, `fixedIncomeAssets`, `assetValuations`

### Transaction types (`TransactionType`)

```
income | expense | transfer | loan_disbursement | emi_payment | loan_prepayment |
cc_payment | udhari_given | udhari_received | udhari_collect | udhari_repay |
udhari_write_off | savings_contribution | goal_withdrawal | investment_contribution |
investment_sell | refund | adjustment
```

**Missing:** explicit cash withdrawal/deposit, reimbursement, card EMI conversion, balance transfer, gift income.

### Payment model

Single field `paymentMode` combines **channel and funding instrument** (`cash`, `upi`, `credit_card`, `debit_card`, etc.). No separate `paymentChannel` + `fundingInstrument`.

---

## 6. Security Posture (Code-Verified)

| Control | Status | Evidence |
|---------|--------|----------|
| JWT in httpOnly cookie | **Implemented** | `php/helpers/auth.php` `set_auth_cookie()` |
| Legacy localStorage JWT removed on login | **Implemented** | `src/lib/apiClient.ts` |
| HS256 alg check | **Implemented** | `verify_cloud_token()` |
| Webhook signature verify | **Implemented** | `payments.php` |
| Webhook ownership by `(provider_order_id, user_id)` | **Implemented** | `payments.php`, `subscriptions.php` |
| CSRF token | **Not verified** | Not found in current client/API flow |
| Security headers (HSTS, CSP) | **Environment-dependent** | `.htaccess` — verify per deploy |
| Account export/delete | **Implemented** (Phase 13+) | `php/controllers/account.php` |
| Paise integer money | **Implemented** | Phase 3 migrations + tests |

---

## 7. Test & Gate Baseline (2026-08-21)

| Command | Result |
|---------|--------|
| `npm run test` | **247/247 PASS** |
| `npm run typecheck` | **PASS** |
| `npm run check:php` | **72 files PASS** |

See `BASELINE_TEST_RESULTS.md` for detail.

Prior certification (`SPAROWVAULT_FINAL_CERTIFICATION_REPORT.md`, 2026-05-15) reported all phase gates green locally. **That status is not automatically current** — vNext requires re-running gates after changes.

---

## 8. Known Economic Weaknesses (Code-Proven)

These are **active** in current code, not historical audit findings:

1. **Bank/cash refunds** post to `income_category` instead of contra-expense when not on credit card (`financeEventBuilder.ts` refund branch).
2. **`INCOME_TYPES` includes `refund`** in `calculations.ts` — pollutes income rollups when ledger fallback used.
3. **Card outstanding clamped** with `Math.max(0, bal)` — overpayment/credit balance not modeled (`cardEngine.ts`).
4. **No card EMI engine** — post-purchase EMI conversion impossible; `emiPayments` is loan-only.
5. **No cash withdrawal/deposit types** — must use `transfer` between bank and cash accounts (works if user sets up cash account).
6. **`netMonthlySavings()`** still exists and used in `alertsEngine.ts`; dashboard prefers ledger KPIs but labels result "Net savings".
7. **Budget spend** still computed from raw `transactions`, not ledger expense view.
8. **Account balance on dashboard** uses `deriveAccountBalanceFromAccount(transactions)` in one path — may diverge from ledger engine.
9. **No household / joint account model**.
10. **No idempotency keys** on financial event creation from client.
11. **No reconciliation center** — card repair queue only (`buildCardRepairQueue`).

---

## 9. What Works Well (Preserve)

- Phase 5 ledger scenarios: CC purchase, CC payment, transfer, loan disbursement, EMI split, udhari, investment buy/sell, goal contribution — **unit tested** (`ledger.scenarios.test.ts`).
- Paise normalization on Dexie read/write and PHP import.
- Sync contract registry with drift tests.
- Loan amortization and EMI interest/principal separation.
- Udhari receivable/payable/settlement/write-off semantics.
- Cloud-first repo with empty-remote wipe guard.
- Persona-aware suggestions and cashflow survival engine.

---

## 10. Phase A Deliverables Checklist

| Deliverable | Status |
|-------------|--------|
| Repository inventory | ✅ This document |
| Audit contradiction matrix | ✅ `AUDIT_CONTRADICTION_MATRIX.md` |
| Current money semantics | ✅ `CURRENT_MONEY_SEMANTICS.md` |
| Baseline test results | ✅ `BASELINE_TEST_RESULTS.md` |
| Money logic changes | ❌ None (Phase A rule) |
| Regression fixtures for vNext | 📋 Specified in semantics doc; implementation in Phase B+ |

---

## 11. Recommended Next Phase

**Phase B — Ledger & KPI Semantics**

1. Introduce named KPIs: `trueIncome`, `consumptionExpense`, `operatingSurplus`, `netLiquidChange`, `debtPrincipalRepaid`, `financingCost`.
2. Fix bank refund classification (contra-expense when linked; never auto-income).
3. Wire dashboard/alerts to ledger views exclusively where ledger exists.
4. Add characterization tests locking corrected semantics before UI work.

---

## 12. Files Inspected (Primary)

```
src/services/financeEventBuilder.ts
src/services/ledgerCalculations.ts
src/services/calculations.ts
src/services/cardEngine.ts
src/services/loanEngine.ts
src/services/cashflowSurvivalEngine.ts
src/services/transactionFormRules.ts
src/store/dataStore.ts
src/repositories/baseRepo.ts
src/types/index.ts
src/config/syncContracts.ts
src/components/pages/DashboardPage.tsx
php/helpers/auth.php
php/helpers/finance_events.php
php/controllers/payments.php
sql/migrations/phase_05_financial_ledger.sql
src/services/__tests__/ledger.scenarios.test.ts
```
