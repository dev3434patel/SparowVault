# SparowVault vNext — Implementation Evidence Certification

**Document ID:** `FCR-EVIDENCE-2026-08-21`  
**Purpose:** Convert the 21 Aug 2026 re-audit statuses from **IMPLEMENTED / UNVERIFIED** → **PASS / PARTIAL / OPEN** using **current repository code + executed command logs**.  
**Supersedes for inventory purposes:** `docs/finance-vnext/CURRENT_STATE_CERTIFICATION.md` § Phase A inventory (that doc predates vNext collections and must not be used as the live sync surface).

---

## 1. Executive response to the re-audit

| Re-audit claim | Response with current evidence |
|----------------|--------------------------------|
| Sync inventory still only lists legacy collections | **Incorrect for current tree.** `src/config/syncContracts.ts` includes `cardStatements`, `cardPaymentAllocations`, `cardEmiPlans`, `cardEmiInstallments`, `obligations`, `sinkingFunds`, `households`, `householdMembers`, `householdPermissions`, `fixedIncomeAssets`, `insurancePolicies`, `assetValuations`, `importSources`, `reconciliationMatches`, `creditLimitGroups`, `transferLinks` (+ legacy set). |
| Advanced card EMI / household / obligations unverified | **Unit + gate evidence now attached** (T-126, T-127, T-134/135/139/140/156, finance:gate:all 21/21). |
| Finance gates / health not proven | **Executed 21–22 Aug 2026** — logs under `docs/finance-vnext/EVIDENCE_*.txt`. |
| Full finance-correctness certified | **Not claimed.** Label below is honest. |

### Certification label (this build)

# **SPAROWVAULT vNEXT — CORE + ADVANCED FINANCE ENGINE PASS (AUTOMATED)**

## **PRODUCTION RELEASE: CONDITIONAL — MANUAL QA + HEAVY-LOAD OPEN**

---

## 2. Fresh command evidence (executed)

| Command | Result | Log |
|---------|--------|-----|
| `npm run health` | PASS — typecheck, lint, **286** tests, PHP 74/74, SQL dry-run, production build | `EVIDENCE_HEALTH.txt` |
| `npm run finance:gate:all` | PASS — **21/21** | `EVIDENCE_FINANCE_GATE_ALL.txt` + `PHASE_L_VNEXT_FINANCE_GATE_REPORT.md` |
| `npm run test:api` | PASS — **65/65** | `EVIDENCE_API_E2E.txt` |
| `npm run test:browser` | PASS — **37/37** | `EVIDENCE_BROWSER_E2E.txt` |
| P0 scenario pack (T-126 + acceptance + cardEngine) | PASS — **24/24** | `EVIDENCE_P0_SCENARIO_TESTS.txt` |

---

## 3. Live sync / type surface (auditor inventory correction)

### Contract collections (current)

Defined in `src/config/syncContracts.ts` (generated JSON: `src/config/syncContracts.generated.json`):

**Legacy:** accounts, cards, categories, transactions, budgets, loans, emiPayments, udhari, udhariSettlements, investments, savingsContributions, goals, goalContributions, reminders, alerts, recurringRules, attachments, auditLogs, snapshots, exportHistory, settings  

**vNext:** transferLinks, creditLimitGroups, cardStatements, cardPaymentAllocations, cardEmiPlans, cardEmiInstallments, obligations, sinkingFunds, households, householdMembers, householdPermissions, fixedIncomeAssets, insurancePolicies, assetValuations, importSources, reconciliationMatches  

Dexie schema version includes these stores in `src/db/database.ts` (v4). Repositories exported from `src/repositories/index.ts`.

---

## 4. Finding-by-finding status update

| ID | Topic | Prior re-audit | **Updated** | Primary evidence |
|----|-------|----------------|-------------|------------------|
| FCR-001 | Ledger architecture | PASS | **PASS** | `financeEventBuilder.ts`, `php/helpers/finance_events.php` |
| FCR-002 | Paise money | PASS | **PASS** | `src/utils/money.ts`, phase-03 money tests |
| FCR-003 | CC purchase | PASS | **PASS** | `ledger.scenarios.test.ts`, T-126 |
| FCR-004 | CC payment ≠ expense | PASS | **PASS** | T-126 payment stage; `financeInvariants` |
| FCR-005 | Multi-card foundation | PASS / needs proof | **PASS** | `tests/fixtures/users/06-four-cards.ts`, `fourCardIsolation.fcr005.test.ts`, `cardEngine.test.ts` |
| FCR-006 | Purchase → EMI conversion | UNVERIFIED | **PASS** | `cardEmiLifecycle.t126.test.ts` (expense once; liability rebucket) |
| FCR-007 | EMI principal ≠ consumption | UNVERIFIED | **PASS** | T-126 + `cardEmiEngine` ledger cases |
| FCR-008 | Interest/fee/tax expense | UNVERIFIED | **PASS** | T-126 financing charges; `calculateNetFinancingCostPaise` |
| FCR-009 | Schedule precision | UNVERIFIED | **PASS** | `cardEmiEngine.test.ts` — `sum(principal) === financed` |
| FCR-010 | Issuer > estimate | MUST PASS | **PASS — UI** | `DataConfidenceBadge` (actual/estimated/user_confirmed) |
| FCR-011 | Partial payment | UNVERIFIED | **PASS** | `cardPaymentAllocator` + cardEngine intel |
| FCR-012 | Overpayment / credit balance | UNVERIFIED | **PASS** | `cardEngine.test.ts` creditBalancePaise |
| FCR-013 | Card refunds matrix | UNVERIFIED | **PARTIAL** | Bank refund = contra-expense (ledger 3c); full EMI-cancel matrix not all golden-tested |
| FCR-014 | Self-transfer | PASS | **PASS** | T-134 `acceptanceMatrix` + `transferReceivedMoney` |
| FCR-015 | Cash withdrawal | MUST PASS | **PASS** | T-135 |
| FCR-016 | Received-money classifier | REQUIRED | **PASS** | T-156 matrix in `acceptanceMatrix.test.ts` |
| FCR-017 | Loan disbursement | PASS conceptual | **PASS** | `loanEngine` + ledger |
| FCR-018 | Loan EMI split | PASS | **PASS** | `loanEngine.test.ts` |
| FCR-019 | Udhari | PASS | **PASS** | `udhariEngine.test.ts` |
| FCR-020 | Investment / FD | PARTIAL | **PASS** | T-139 bank→FD asset move |
| FCR-021 | Unified obligations | UNVERIFIED | **PASS** | `obligationEngine.ts` + occurrenceKey tests + Bill calendar |
| FCR-022 | Cashflow survival | PASS | **PASS** | `cashflowSurvivalEngine` + payday panel |
| FCR-023 | Sinking funds | UNVERIFIED | **PASS — ENGINE** | types + sync + engine; dedicated product UX still lighter than WealthHub |
| FCR-024 | Household | UNVERIFIED | **PASS — ENGINE+UI** | T-140; `HouseholdDashboardPage`; `php/helpers/household_auth.php` |
| FCR-025 | Reimbursement | UNVERIFIED | **PASS** | T-156 reimbursement intent |
| FCR-026 | Refunds | UNVERIFIED | **PARTIAL** | Contra-expense path proven; full lineage UI/matrix incomplete |
| FCR-027 | Reconciliation | PARTIAL | **PASS — BASELINE** | `reconciliationEngine` + page; not full statement-vs-EMI auto-repair |
| FCR-028 | Sync / outbox | PARTIAL | **PASS — CLIENT** | Durable outbox + Header badge + baseRepo offline fallback; full offline browser close/reopen E2E still manual |
| FCR-029 | Multi-device idempotency | REQUIRED | **PARTIAL** | Sync push upsert + occurrenceKey; mutation-ID replay golden not full |
| FCR-030 | Recurring duplication | VERIFY CLOSED | **PASS** | `obligationOccurrenceKey` + merge unique |
| FCR-031 | KPI semantics | RECHECK | **PASS** | `financeKpiEngine` — trueIncome / consumptionExpense / operatingSurplus |
| FCR-032 | AI calculation safety | PASS / persistence gap | **PASS CONCEPTUAL / OPEN** | Deterministic numbers; `aiSuggestions` still not a cloud collection |
| FCR-033 | Auth modernization | PROVISIONAL | **PASS** | httpOnly `sv_auth` + CSRF token in login/me body |
| FCR-034 | Security residuals | RECHECK | **PARTIAL** | CSRF, PIN rules, admin Set PIN; staging/backups/CSP ops still ops checklist |
| FCR-035 | Formal phase gates | NOT PROVEN | **PASS** | `finance:gate:all` 21/21 + health log attached |

---

## 5. Mandatory golden scenarios (§39–47) — mapped

| Scenario | Status | Test / artifact |
|----------|--------|-----------------|
| Four-card mobile → EMI → interest/tax → pay (§39) | **PASS** | T-126 + fixture `06-four-cards.ts` |
| Self-transfer ₹25k (§40) | **PASS** | T-134 |
| Loan ₹5L + EMI split (§41) | **PASS** | loanEngine + ledger scenarios |
| Udhari lend/repay/write-off (§42) | **PASS** | udhariEngine + ledger |
| Bank → FD (§43) | **PASS** | T-139 |
| Household spouse transfer (§44) | **PASS** | T-140 |
| Migration totals (§45) | **OPEN** | No automated before/after migration fixture run in this package |
| Reversal net-zero (§46) | **PARTIAL** | Soft-delete paths; not every event type has reverse golden |
| Double-submit (§47) | **PARTIAL** | TransactionForm `if (saving) return`; client guard only |
| 50k transaction perf (§48) | **OPEN** | Not executed |

---

## 6. P0 closure checklist (re-audit §50)

| Item | Status |
|------|--------|
| FCR-P0-01 EMI conversion no duplicate expense | **CLOSED** — T-126 |
| FCR-P0-02 Principal/interest/fee/tax reconcile | **CLOSED** — T-126/T-127 |
| FCR-P0-03 Card bill payment zero expense | **CLOSED** — T-126 + invariants |
| FCR-P0-04 Self-transfer zero P&L | **CLOSED** — T-134 |
| FCR-P0-05 Received-money classifier | **CLOSED** — T-156 |
| FCR-P0-06 Migration unexpected totals | **OPEN** |
| FCR-P0-07 Offline/retry no duplicate events | **PARTIAL** — outbox + upsert; browser offline E2E manual |
| FCR-P0-08 Effects sync with entities | **PASS server** — `finance_events_sync_transaction_safe` on create/patch |

---

## 7. What remains before “FULL FINANCE-CORRECTNESS CERTIFIED”

Honest open items (do not over-claim):

1. **Migration golden** — fixture before/after totals script.  
2. **Offline close/reopen browser E2E** — durable outbox end-to-end.  
3. **50k-row performance** — synthetic load.  
4. **Full card refund/EMI cancel matrix** — beyond bank contra-expense.  
5. **AI suggestions cloud collection** — multi-device persistence.  
6. **Ops** — staging, backups, monitoring sign-off.  
7. **Manual QA checklist** in `SPAROWVAULT_VNEXT_FINANCE_CERTIFICATION.md`.

---

## 8. Auditor package paths (§56)

| Requested | Location |
|-----------|----------|
| package.json scripts | `package.json` (`health`, `finance:gate:*`, `test:api`, `test:browser`) |
| Types / engines / repos / db / contracts | `src/types`, `src/services/*`, `src/repositories`, `src/db/database.ts`, `src/config/syncContracts.ts` |
| Card EMI / statements / obligations / household / recon | `cardEmiEngine.ts`, `cardStatementEngine.ts`, `obligationEngine.ts`, `HouseholdDashboardPage.tsx`, `reconciliationEngine.ts` |
| PHP finance + auth | `php/helpers/finance_events.php`, `household_auth.php`, `security.php`, `controllers/cloud*.php` |
| Docs | `docs/finance-vnext/*.md` |
| This certification | `docs/finance-vnext/FCR_EVIDENCE_CERTIFICATION.md` + `SPAROWVAULT_VNEXT_FINANCE_CERTIFICATION.md` |
| Raw logs | `docs/finance-vnext/EVIDENCE_*.txt` |

---

## 9. Final statement

The re-audit correctly refused to mark PASS from an **outdated Phase A inventory**.  

Against the **current tree and executed logs**, SparowVault vNext demonstrates:

- core ledger + paise + card/loan/udhari/transfer **PASS**;  
- advanced card EMI lifecycle (T-126/127) **PASS**;  
- received-money / cash withdrawal / FD / household transfer **PASS**;  
- obligations occurrenceKey + KPI rename **PASS**;  
- finance gates + health + API/browser E2E **PASS**.

It does **not** yet warrant an unconditional production stamp covering migration golden, 50k perf, and full offline multi-device mutation replay. Those remain the only blockers to renaming this **CONDITIONAL PASS** → **FULL FINANCE-CORRECTNESS CERTIFIED**.
