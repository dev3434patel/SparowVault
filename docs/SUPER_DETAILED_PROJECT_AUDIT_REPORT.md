# SparowVault — Super-Detailed Project Audit Report

| Field | Value |whi
|-------|-------|
| Document ID | `SV-SUPER-AUDIT-2026-09-21` |
| Repository | `https://github.com/dev3434patel/SparowVault.git` |
| Audited revision | `b76c9d0` (*comitter*) + local session patches (`auth_sessions` applied) |
| Company | SparowTech Solution LLP / SparowVault |
| Auditor | Automated deep codebase + documentation audit |
| Scope | Entire product surface: UI, engines, APIs, SQL, sync, statements, security, structure |
| Honesty rule | **PASS / PARTIAL / FAIL / OPEN / N/A** only with evidence. Never invent bank accuracy. |

---

## 0. Executive verdict

| Track | Verdict |
|-------|---------|
| Core finance ledger (paise, intents, card/loan/udhari/KPI) | **STRONG / largely PASS** under defined automated matrix |
| vNext features (household, obligations, EMI, wealth types) | **IMPLEMENTED** with automated gates |
| Bank statement upload (major feature) | **PARTIAL** — production-grade **pipeline** exists; **bank-layout certification is NOT complete** |
| Hosted production release (statements expansion track) | **NO-GO** per project docs (staging not certified for all banks) |
| Local run status (this machine) | App runnable; DB migrated; `auth_sessions` fixed |

**One-line product truth:** SparowVault is a SQL-first personal finance OS with a serious ledger core and an advanced statement-import *pipeline*. It is **not** yet a certified “every Indian bank PDF → perfect ledger” product.

---

## 1. Coding structure (architecture)

### 1.1 Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 7 + TypeScript + Zustand + Dexie (IndexedDB) |
| Backend | PHP 8.x + MySQL/MariaDB |
| Money | Integer **paise** only (`amountPaise`) |
| Sync | Contract-driven collections (`syncContracts.ts` ↔ PHP allowlist) |
| Auth | Username + PIN (bcrypt `PIN:salt`), cookie/JWT + DB `auth_sessions` |
| Statements | Client PDF.js + optional local Tesseract OCR → reviewed JSON → PHP import |

### 1.2 Source-of-truth hierarchy (finance)

```text
User domain entity (transaction / card / loan / …)
        ↓
Canonical economic event + financial_effects  (financeEventBuilder / finance_events.php)
        ↓
Derived projections (KPI, reports, dashboards, card intel)
        ↓
UI summaries
```

**Rule:** UI must not invent parallel P&L math. Violations are defects.

### 1.3 Repository layout

| Path | Role |
|------|------|
| `src/` | React app, engines, Dexie, UI |
| `api/` | Public PHP HTTP entrypoints |
| `php/` | Controllers, helpers, config, router |
| `sql/` | Schema, migrations, hosting SQL |
| `scripts/` | Gates, packaging, OCR prepare, audits |
| `tests/` | Unit / API / browser / integrity / statements |
| `docs/` | Specs, certification, research, this audit |
| `public/` | Static assets + self-hosted OCR workers |

### 1.4 Data stores

| Store | Contents |
|-------|----------|
| MySQL | Users, sessions, cloud_collection_rows, financial_events/effects, SaaS, mutation keys, auth_sessions |
| Dexie v5 | 41 tables: 37 synced entities + 4 local-only (`users`, `sessions`, `syncMutations`, `aiSuggestions`) |
| localStorage | Legacy sync outbox markers / badge |
| sessionStorage | CSRF token for cross-origin |

### 1.5 Sync surface — 37 collections

`accounts`, `cards`, `categories`, `transactions`, `budgets`, `loans`, `emiPayments`, `udhari`, `udhariSettlements`, `investments`, `savingsContributions`, `goals`, `goalContributions`, `reminders`, `alerts`, `recurringRules`, `attachments`, `auditLogs`, `snapshots`, `exportHistory`, `settings`, `transferLinks`, `creditLimitGroups`, `cardStatements`, `cardPaymentAllocations`, `cardEmiPlans`, `cardEmiInstallments`, `obligations`, `sinkingFunds`, `households`, `householdMembers`, `householdPermissions`, `fixedIncomeAssets`, `insurancePolicies`, `assetValuations`, `importSources`, `reconciliationMatches`

**Local-only (not cloud-synced):** `users`, `sessions`, `syncMutations`, `aiSuggestions` (device-local by design).

---

## 2. Complete UI inventory — pages, routes, sections

Routing is **NavKey-based** (`navStore` + `navRoutes`), not classic React Router page files alone.

### 2.1 User pages (25 routed + 1 nested)

| NavKey | Path | Page | Primary sections / capabilities |
|--------|------|------|----------------------------------|
| `dashboard` | `/` | DashboardPage | KPI tiles, explain metrics, alerts, persona/adaptive cues, recent activity |
| `transactions` | `/transactions` | TransactionsPage | Master ledger table, filters, edit/delete/duplicate, contribution return |
| `income` | `/income` | IncomePage | Transactions filtered `income` |
| `expenses` | `/expenses` | ExpensesPage | Transactions filtered `expense` |
| `categories` | `/categories` | CategoriesPage | Category CRUD, colors, cleanup |
| `budgets` | `/budgets` | BudgetsPage | Budget forms, burn/smart status |
| `goals` | `/goals` | GoalsPage | Goals + contributions |
| `accounts` | `/accounts` | AccountsPage | Bank/cash/wallet accounts, balances |
| `cards` | `/cards` | CardsPage | Credit cards, utilization, EMI simulator, repair queue |
| `loans` | `/loans` | LoansPage | Loans, EMI, amortization |
| `udhari` | `/udhari` | UdhariPage | Lend/borrow, settle, write-off, ageing |
| `savings` | `/savings` | WealthHubPage | Tabs: Investments / FD·RD / Insurance / Valuations (+ embeds InvestmentsPage) |
| `reports` | `/reports` | ReportsPage | CA-style / period reports, exports hooks |
| `suggestions` | `/suggestions` | SuggestionsPage | AI/coach suggestions (local) |
| `export` | `/export` | ExportPage | Export center, PIN confirm for full export |
| `import` | `/import` | ImportPage | CSV/XLSX import + restore confirm |
| `bill-calendar` | `/bills` | BillCalendarPage | Obligations calendar |
| `reconciliation` | `/reconciliation` | ReconciliationPage | Orphans / match review |
| `household` | `/household` | HouseholdDashboardPage | Household, members, permissions |
| `alerts` | `/alerts` | AlertsPage | Alert center |
| `settings` | `/settings` | SettingsPage | Preferences, demo seed, wipe |
| `profile` | `/profile` | ProfilePage | Profile & security, PIN, recovery |
| `audit` | `/audit` | AuditPage | Audit & backup |
| `subscription` | `/subscription` | SubscriptionPage | SaaS plan (if Razorpay enabled) |

### 2.2 Admin pages (6)

| NavKey | Path | Page |
|--------|------|------|
| `admin-dashboard` | `/admin` | AdminDashboardPage |
| `admin-users` | `/admin/users` | UserManagementPage (incl. Set PIN) |
| `admin-plans` | `/admin/plans` | PlanManagementPage |
| `admin-subscriptions` | `/admin/subscriptions` | SubscriptionManagementPage |
| `admin-flags` | `/admin/flags` | FeatureFlagsPage |
| `admin-branding` | `/admin/branding` | BrandingSettingsPage |

### 2.3 Global chrome / dialogs

| Component | Role |
|-----------|------|
| Header | Quick Add, **Upload bank statement**, sync badge, alerts, theme |
| QuickAddDialog | Intent-driven TransactionForm |
| StatementImportDialog | Full statement analyze → review → import |
| CommandPalette | Keyboard navigation to modules |
| SyncOutboxBadge | Pending durable/sync mutations |
| CardEmiSimulatorDialog | EMI tenure / cost simulator |
| ExplainMetricDrawer | “Why this number?” |
| CloudAuth / AdminAuth / LockScreen / RequiredPinChange | Auth surfaces |

---

## 3. Backend API inventory (41 endpoints)

### Auth
`api/auth/register.php`, `login.php`, `logout.php`, `me.php`, `profile.php`, `change-pin.php`, `reset-pin.php`, `security-recovery.php`, `account.php`, `data-export.php`, `admin-login.php`

### Cloud sync / entities
`api/cloud/register.php`, `login.php`, `me.php`, `entity.php`, `entity-item.php`, `sync/pull.php`, `sync/push.php`  
(+ `api/data/entity*.php` legacy aliases)

### Import
`api/import/statement.php` — **reviewed statement JSON only**  
`api/import/transactions.php` — bulk txn import

### Public / policies / health
`api/public/config.php`, `api/policies/current.php`, `api/policies/accept.php`, `api/health.php`

### SaaS
`api/subscriptions/*`, `api/payments/razorpay/webhook.php`

### Admin
`api/admin/dashboard.php`, `users.php`, `users-reset-pin.php`, `users-toggle-active.php`, `users-assign-plan.php`, `plans.php`, `subscriptions.php`, `feature-flags.php`, `settings.php`

### Controllers
`php/controllers/{account,admin,cloud,cloud_data,imports,payments,policies,public_config,statements,subscriptions}.php`

---

## 4. Finance engines — logic, equations, test status

### 4.1 Core money invariants

| ID | Equation / rule | Engine | Status |
|----|-----------------|--------|--------|
| M1 | All money = integer paise | `money.ts`, PHP money parser | PASS |
| M2 | Soft-deleted txn → 0 events/effects | `financeEventBuilder` | PASS |
| M3 | Self-transfer: Δincome=0, ΔconsumptionExpense=0 | intent + ledger | PASS (T-134/135) |
| M4 | Card purchase: Δexpense=+P, ΔcardLiability=+P, Δbank=0 | ledger | PASS |
| M5 | Card payment: Δbank=−P, ΔcardLiability=−P, Δexpense=0 | ledger | PASS |
| M6 | EMI conversion (ignore new fees): ΔtotalLiability≈0, no new consumption | card EMI + ledger | PASS (T-126) |
| M7 | Loan disbursement: Δcash=+principal, ΔloanLiability=+principal, Δincome=0 | loanEngine | PASS |
| M8 | Udhari lend: Δcash=−A, Δreceivable=+A, Δexpense=0 | udhariEngine | PASS |
| M9 | Udhari collect: Δcash=+A, Δreceivable=−A, Δincome=0 | udhariEngine | PASS |
| M10 | Refund / contribution return: not false income | refund + expenseContributions | PASS / PARTIAL edge cases |
| M11 | Issuer actual > user_confirmed > estimate | issuerSchedulePrecedence | PASS |
| M12 | Shared limit available = groupLimit − Σmax(0, memberOutstanding) | cardEngine | PASS |
| M13 | EMI schedule: Σprincipal = principal; final balance = 0 | cardEmiEngine | PASS (pairwise) |
| M14 | KPI: trueIncome / consumptionExpense / operatingSurplus | financeKpiEngine | PASS |
| M15 | Net worth ≈ assets − liabilities (proxy from effects) | checksum / NW views | PASS (proxy) |

### 4.2 Module-wise finance matrix

| Module | Key properties | Happy paths | Negative / edge | Automated evidence | Verdict |
|--------|----------------|-------------|------------------|--------------------|---------|
| Transactions / intents | type + transactionIntent | expense, income, transfer, refund, cc_payment, card_emi_* | invalid amount, wrong links | acceptanceMatrix, form rules | PASS |
| Accounts | opening + effects | bank/cash/wallet | delete with refs | accountBalanceEngine tests | PASS |
| Cards | limit, util, statement window, credit balance | purchase/pay/overpay | over-limit, isolation | cardEngine, fourCardIsolation | PASS |
| Card EMI | schedule, foreclosure, no-cost | convert, charge | refund mid-plan | T-126/127, pairwise | PASS (core) |
| Loans | EMI, amort | disbursement, EMI | prepay (partial coverage) | loanEngine.test | PASS |
| Udhari | ageing, settle | lend/borrow/collect | cross-person isolation | udhariEngine.test | PASS |
| Goals / budgets | progress, burn | contribute | over-target edges | goal/smartBudget tests | PASS |
| Wealth | FD/insurance/valuations | CRUD tabs | incomplete product depth | types + UI | PARTIAL |
| Obligations | occurrenceKey | generate/pay | duplicate occurrence | obligationEngine | PASS |
| Household | roles server-side | create/members | viewer write denied | household_auth + API | PASS |
| Reconciliation | orphan/match | suggest | fuzzy auto-repair forbidden | engine + UI | PARTIAL |
| KPI / Reports | cross-surface | month KPIs | NaN/Infinity forbidden | financeCrossView, caReports | PASS / PARTIAL report goldens |
| Offline / outbox | durable mutations | offline create/replay | conflict review | durableOutbox, syncOutbox | PASS (harness) |
| Idempotency | mutationId unique | duplicate POST | concurrent race | financial_mutation_keys | PASS |
| SaaS billing | Razorpay | webhook idempotency | bad signature | webhook tests | PASS (when enabled) |

### 4.3 Combinatorial / equation testing already present

| Suite | What it covers |
|-------|----------------|
| `acceptanceMatrix.test.ts` | Transfer / cash / FD / household acceptance |
| `cardEmiLifecycle.t126.test.ts` | EMI lifecycle golden |
| `cardRefundLifecycle.fullMatrix.test.ts` | Refund A/B/C/D/E/G/I |
| `eventReversal.golden.test.ts` | Soft-delete reversal |
| `emiPrecisionPairwise.test.ts` | Rates × tenures × principals |
| `financeSequenceFuzz.test.ts` | Seeded 50-step sequences |
| `sharedLimitMatrix.test.ts` | Shared facility math |
| `fourCardIsolation.fcr005.test.ts` | Multi-card isolation |
| `localCombinationMatrix.test.ts` | Local combo matrix |
| Integrity / atomic-writes E2E | Server all-or-nothing writes |

**Gap honesty:** Full Cartesian of every prompt matrix (EMI×refund×statement×household×offline) is **not** fully closed. Risk-based + pairwise coverage exists.

---

## 5. MAJOR FEATURE — Bank statement uploading system (deep audit)

### 5.1 Product intent

Allow users to upload Indian bank PDF statements, extract transactions with high arithmetic integrity, human-review classification, then import into the ledger **without double-counting or false income**, while **never uploading PDF/password to the server**.

### 5.2 End-to-end architecture

```text
[Header → Upload bank statement]
        ↓
StatementImportDialog (analyze)
        ↓
PDF.js local open (+ optional Tesseract OCR)  ← PDF & password stay on device
        ↓
Generic geometric table parser (+ Kotak numbered special-case)
        ↓
Reconcile: prev + credit − debit = balance  AND  opening + Σc − Σd = closing
        ↓
Human review (purpose, category, links, OCR confirm)
        ↓
POST /api/import/statement.php  ← JSON only (no PDF bytes)
        ↓
PHP re-validates arithmetic + ownership + OCR gate + idempotency
        ↓
cloud_write_save → transactions + financial_events/effects + provenance
```

### 5.3 Components & files

| Layer | Path |
|-------|------|
| UI entry | `src/components/layout/Header.tsx` |
| Dialog | `src/components/statements/StatementImportDialog.tsx` |
| Types / bank list | `src/services/statements/types.ts` |
| PDF | `src/services/statements/pdf.ts` |
| OCR | `src/services/statements/ocr.ts` |
| Parser | `src/services/statements/parser.ts` |
| Classification | `src/services/statements/classification.ts` |
| Bank registry | `php/config/statement_banks.json` (38 entries) |
| API | `api/import/statement.php` → `php/controllers/statements.php` |
| OCR assets | `public/ocr/7.0.0/` (self-hosted) |

### 5.4 Hard limits (accuracy / safety gates)

| Limit | Value |
|-------|-------|
| Max PDF size | 20 MB |
| Max pages | 60 |
| Max OCR pages | 12 |
| Max rows | 2,000 |
| OCR confidence fail | &lt; 80 |
| Reviewed POST body | ≤ 1 MiB |
| Rate limit | 20 imports / minute |
| Money | integer paise only |

### 5.5 Critical equations (statement arithmetic)

For every included row \(i\):

\[
B_{i} = B_{i-1} + C_{i} - D_{i}
\]

Document-level:

\[
B_{close} = B_{open} + \sum C - \sum D
\]

Where \(C\) = credit paise, \(D\) = debit paise, \(B\) = running balance paise.  
Parser tries ascending and descending order. **Mismatch → Import disabled** (client) and **422** (server). No partial ledger write.

### 5.6 Bank coverage matrix (accuracy honesty)

Registry has **38 IDs** (37 named banks + `other`). **Names ≠ certified adapters.** There is **one shared geometric parser** + **one Kotak numbered layout special-case**.

| Bank ID | Name | Detection pattern | Synthetic fixture | Real-bank measured accuracy | Layout certified? | Status |
|---------|------|-------------------|-------------------|-----------------------------|-------------------|--------|
| kotak | Kotak Mahindra Bank | `\bKOTAK\b` | Yes (+ numbered) | **Yes — private 36 pg / 1240 rows / 8680 field compares / 0 mismatches** (evidence local, not all in git) | Numbered layout only | **PARTIAL → strongest** |
| hdfc | HDFC Bank | `\bHDFC\b` | Yes | NOT MEASURED on real customer PDFs in repo | No | OPEN for real accuracy |
| sbi | State Bank of India | SBI / full name | Yes | NOT MEASURED | No | OPEN |
| indusind | IndusInd Bank | INDUSIND | Yes | NOT MEASURED | No | OPEN |
| axis | Axis Bank | AXIS BANK | Yes | NOT MEASURED | No | OPEN |
| icici | ICICI Bank | ICICI | Name only | NOT MEASURED | No | OPEN |
| idfc_first | IDFC FIRST Bank | IDFC FIRST | Name only | NOT MEASURED | No | OPEN |
| bob | Bank of Baroda | BANK OF BARODA | Name only | NOT MEASURED | No | OPEN |
| boi | Bank of India | BANK OF INDIA | Name only | NOT MEASURED | No | OPEN |
| maharashtra | Bank of Maharashtra | … | Name only | NOT MEASURED | No | OPEN |
| canara | Canara Bank | … | Name only | NOT MEASURED | No | OPEN |
| central | Central Bank of India | … | Name only | NOT MEASURED | No | OPEN |
| indian | Indian Bank | … | Name only | NOT MEASURED | No | OPEN |
| iob | Indian Overseas Bank | … | Name only | NOT MEASURED | No | OPEN |
| pnb | Punjab National Bank | … | Name only | NOT MEASURED | No | OPEN |
| psb | Punjab & Sind Bank | … | Name only | NOT MEASURED | No | OPEN |
| uco | UCO Bank | … | Name only | NOT MEASURED | No | OPEN |
| union | Union Bank of India | … | Name only | NOT MEASURED | No | OPEN |
| bandhan | Bandhan Bank | … | Name only | NOT MEASURED | No | OPEN |
| csb | CSB Bank | … | Name only | NOT MEASURED | No | OPEN |
| city_union | City Union Bank | … | Name only | NOT MEASURED | No | OPEN |
| dcb | DCB Bank | … | Name only | NOT MEASURED | No | OPEN |
| dhanlaxmi | Dhanlaxmi Bank | … | Name only | NOT MEASURED | No | OPEN |
| federal | Federal Bank | … | Name only | NOT MEASURED | No | OPEN |
| jk | Jammu & Kashmir Bank | … | Name only | NOT MEASURED | No | OPEN |
| karnataka | Karnataka Bank | … | Name only | NOT MEASURED | No | OPEN |
| kvb | Karur Vysya Bank | … | Name only | NOT MEASURED | No | OPEN |
| nainital | Nainital Bank | … | Name only | NOT MEASURED | No | OPEN |
| rbl | RBL Bank | … | Name only | NOT MEASURED | No | OPEN |
| south_indian | South Indian Bank | … | Name only | NOT MEASURED | No | OPEN |
| tmb | Tamilnad Mercantile Bank | … | Name only | NOT MEASURED | No | OPEN |
| yes | YES Bank | … | Name only | NOT MEASURED | No | OPEN |
| idbi | IDBI Bank | … | Name only | NOT MEASURED | No | OPEN |
| au | AU Small Finance Bank | … | Name only | NOT MEASURED | No | OPEN |
| jana | Jana Small Finance Bank | … | Name only | NOT MEASURED | No | OPEN |
| equitas | Equitas Small Finance Bank | … | Name only | NOT MEASURED | No | OPEN |
| ujjivan | Ujjivan Small Finance Bank | … | Name only | NOT MEASURED | No | OPEN |
| other | Other / generic | never auto | Manual select | N/A | Generic only | OPEN |

**Accuracy conclusion (non-negotiable):**  
Claiming “every bank statement reads at super accuracy” is **FALSE today**.  
What *is* true: **pipeline integrity** (reconcile fail-closed, human review, server re-check, no PDF upload) is strong; **Kotak numbered** has the best measured evidence; **most banks are selector + generic parser only**.

### 5.7 Statement test coverage map

| Test | Covers |
|------|--------|
| `tests/unit/statementParser.test.ts` | Money/dates, synthetic layouts, brand overlap, Kotak numbered regressions |
| `tests/statement-api-checks.mjs` | Auth/CSRF, balance fail-closed, no password/PDF in body, idempotency, throttle |
| `tests/browser-statement-import.mjs` | Password PDF, 5 banks + multipage, OCR gates, scanned blocked |
| Fixtures | `hdfc`, `kotak`, `sbi`, `indusind`, `axis`, locked, multipage, OCR, scanned, kotak-numbered |

### 5.8 Security of upload feature

| Artifact | Leaves device? |
|----------|----------------|
| PDF bytes | **No** |
| PDF password | **No** |
| Document SHA-256 | Hash only to server |
| Reviewed rows JSON | Yes (financial metadata) |
| OCR | Local Tesseract only |

### 5.9 Statement feature — defect / gap register

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| ST-01 | 31+ banks name-only / unmeasured real PDFs | High (product claim risk) | OPEN |
| ST-02 | Scans/rotations/handwriting/multilingual not certified | High | OPEN |
| ST-03 | OCR field correction editor incomplete | Medium | OPEN |
| ST-04 | Categories are suggestions, not bank truth | Medium | Accepted with review UI |
| ST-05 | No durable unfinished review draft (by design for password safety) | Low/Med | Accepted |
| ST-06 | Completeness vs omitted offsetting pairs not cryptographically proven | High theoretically | Mitigated by reconcile + review |
| ST-07 | Hosting CSP/MIME for OCR assets not fully certified on all hosts | Medium | OPEN |
| ST-08 | AppleDouble `._*` noise in last git commit | Low (repo hygiene) | OPEN |

---

## 6. Auth, security, sync — module audit

| Area | Properties | Status |
|------|------------|--------|
| Register / login / logout | PIN bcrypt `PIN:salt` | PASS |
| `auth_sessions` | Credential-bound DB sessions | PASS (after migration applied) |
| Forced PIN change | Blocks finance APIs | PASS |
| CSRF | Mutations require token | PASS / PARTIAL admin parity history |
| Household RBAC | viewer cannot write config | PASS server-side |
| Cross-user entity isolation | 404 on foreign ids | PASS API E2E |
| Mutation idempotency | `(userId, mutationId)` | PASS |
| Durable outbox | Dexie syncMutations | PASS |
| PII logging | Must not log PIN/cookies | Static checks PARTIAL |
| Backup CLI | Private BACKUP_DIR required | PASS design / PARTIAL ops |

---

## 7. Services catalog (53) — purpose index

See inventory: accountBalance, adaptiveMode, alertPriority, alertsEngine, authService, businessPersonalSplit, calculations, cardEmiEngine, cardEngine, cardPaymentAllocator, cardStatementEngine, caReports, cashflowSurvival, categoryColor, defaults, demoData, durableOutbox, emergencyFund, expenseContributions, exportSafety, financeEventBuilder, financeKpi, financeLedgerExplain, financialChecksum, goalEngine, importExportRepair, issuerSchedulePrecedence, ledgerCalculations, ledgerDiagnostics, loanEngine, loanPaymentSync, obligationEngine, personaEngine, planFeatureGate, reconciliationEngine, refIntegrity, sinkingFund, smartBudget, suggestionAiExplain, suggestionEngine, suggestionSync, syncOutbox, transactionFormRules, transactionIntent, transactionPreview, udhariEngine, validators, statements/{types,parser,pdf,ocr,classification}.

---

## 8. Dexie tables (41)

`syncMutations`, `users`, `sessions`, `settings`, `accounts`, `cards`, `categories`, `transactions`, `budgets`, `goals`, `goalContributions`, `loans`, `emiPayments`, `udhari`, `udhariSettlements`, `investments`, `savingsContributions`, `reminders`, `alerts`, `recurringRules`, `attachments`, `exportHistory`, `auditLogs`, `snapshots`, `aiSuggestions`, `transferLinks`, `creditLimitGroups`, `cardStatements`, `cardPaymentAllocations`, `cardEmiPlans`, `cardEmiInstallments`, `obligations`, `sinkingFunds`, `households`, `householdMembers`, `householdPermissions`, `fixedIncomeAssets`, `insurancePolicies`, `assetValuations`, `importSources`, `reconciliationMatches`.

---

## 9. SQL / migration posture

| Asset | Role | Status |
|-------|------|--------|
| `sql/HOSTING_READY_CLEAN_IMPORT.sql` | Fresh hosting schema | Present |
| `sql/SPAROWVAULT_NEW_DATABASE.sql` | New DB bootstrap (git) | Present |
| `sql/migrations/20260910_atomic_writes.sql` | Atomic write support | Present |
| `sql/migrations/20260911_security_sessions.sql` | `auth_sessions` + recovery | Present — **must be applied** |
| `phase_vnext_02_mutation_idempotency.sql` | mutation keys | Present |
| Local DB `sparowvault` | Migrated this session | Working after sessions fix |

---

## 10. Test & certification landscape

| Gate | Typical result (docs / prior runs) |
|------|-----------------------------------|
| Unit tests | Hundreds (docs cite 331+ after expansion) |
| `finance:gate:all` | 21/21 historically PASS |
| API E2E | 65/65 historically |
| Browser E2E | 37/37 historically |
| Statement API/browser suites | Present |
| Integrity atomic-writes | Present |
| Finance certify all | Previously YES on local cert matrix; expansion track still NO-GO for “all banks” |

Traceability: `docs/finance-vnext/FINAL_CERTIFICATION_TRACEABILITY_MATRIX.md`.

---

## 11. Coding-structure quality notes

| Topic | Observation | Risk |
|-------|-------------|------|
| Contract-driven sync | Strong single source | Low if regenerate kept |
| Paise discipline | Strong | Low |
| Statement parser | One generic + Kotak special-case | High if marketed as all-bank perfect |
| Git hygiene | Many `._*` AppleDouble files in last commit | Medium clutter |
| Bundle size | Large main JS (~2MB) | Perf follow-up |
| Imagick version warning | Noise on Windows PHP | Non-money |
| AI suggestions | Device-local by design | Documented N/A |

---

## 12. Recommended perfection roadmap (statements-first)

### P0 — Accuracy program (to truthfully claim multi-bank)

1. Collect **real anonymized PDFs** for top banks: HDFC, SBI, ICICI, Axis, Kotak (all products), IndusInd, PNB, BoB, Canara, YES, IDFC, Federal.  
2. Per bank: create **layout adapter** OR prove generic parser with golden field comparisons (≥99.9% field match + 100% reconcile).  
3. Expand OCR corpus (scanned, skewed, locked) with measured CER/WER + money-field accuracy.  
4. Add editable OCR field correction UI.  
5. Publish bank scorecard in docs (PASS/FAIL with evidence hashes).

### P1 — Product hardening

6. Clean `._*` from git.  
7. Ensure hosting package always applies `20260911_security_sessions.sql`.  
8. Staging deploy + restore drill sign-off.  
9. Bundle code-splitting for statement/OCR modules.

### P2 — Expansion

10. Credit-card statements as distinct class.  
11. UPI / CSV channel adapters.  
12. Multi-currency policy (currently INR-first).

---

## 13. Final scoreboard (honest)

| Domain | Completeness | Correctness evidence | Production readiness |
|--------|--------------|----------------------|----------------------|
| Core ledger finance | High | High | Conditional YES (prior certify matrix) |
| Cards / EMI / loans / udhari | High | High | Conditional YES |
| Household / obligations / wealth | Medium–High | Medium–High | Conditional |
| Statement upload **pipeline** | High | High (gates) | Local YES |
| Statement upload **all-bank accuracy** | Low–Medium | Low (except Kotak numbered) | **NO** |
| Security sessions / CSRF | High | High (post-migrate) | Conditional |
| Ops / staging / backup age | Medium | Medium | PARTIAL |

---

## 14. Signature statement

> This audit enumerates the current SparowVault product surface (pages, APIs, engines, sync, SQL, statements) and evaluates logic with documented equations and test evidence.  
> It does **not** claim that every Indian bank PDF is read at “super accuracy.”  
> It **does** claim that the statement import architecture is fail-closed on arithmetic, keeps PDFs/passwords on-device, and has strong Kotak-numbered evidence plus synthetic coverage for a small bank set.

---

## 15. Appendix A — Complete `src/services/` catalog

### Finance / ledger
| File | Purpose |
|------|---------|
| `accountBalanceEngine.ts` | Cash/bank closing; CC purchase must not hit cash |
| `calculations.ts` | Central pure money calcs (paise) |
| `cardEngine.ts` | Outstanding, util, risk, shared limit, repair queue |
| `cardEmiEngine.ts` | EMI schedules, foreclosure, tenure compare |
| `cardPaymentAllocator.ts` | Allocate payments onto statements |
| `cardStatementEngine.ts` | Per-card statement cycle aggregation |
| `cashflowSurvivalEngine.ts` | Safe daily spend / runway |
| `emergencyFundEngine.ts` | Emergency fund vs essential burn |
| `financeEventBuilder.ts` | Tx → events + effects (ledger SoT) |
| `financeKpiEngine.ts` | Month KPIs / consolidated net worth |
| `financeLedgerExplain.ts` | Explain-this-number |
| `financialChecksum.ts` | Integrity fingerprint |
| `goalEngine.ts` | Goal pace / shortfall |
| `issuerSchedulePrecedence.ts` | Actual > confirmed > estimate |
| `ledgerCalculations.ts` | Ledger-backed income/expense/debt views |
| `ledgerDiagnostics.ts` | Consistency diagnostics |
| `loanEngine.ts` | EMI, amort, prepay, foreclosure |
| `loanPaymentSync.ts` | EMI payments ↔ transactions |
| `obligationEngine.ts` | Unified dues calendar |
| `reconciliationEngine.ts` | Orphans + transfer match suggestions |
| `sinkingFundEngine.ts` | Monthly sinking requirement |
| `smartBudgetEngine.ts` | Pace-aware budgets |
| `udhariEngine.ts` | Rollups, ageing, reminders |

### Alerts / AI / persona / plans
| File | Purpose |
|------|---------|
| `alertPriority.ts` | P0–P6 urgency |
| `alertsEngine.ts` | Generate/evaluate alerts |
| `personaEngine.ts` | Persona + coach + AI guardrails |
| `planFeatureGate.ts` | Client feature gating |
| `suggestionEngine.ts` | Deterministic suggestions (amounts) |
| `suggestionAiExplain.ts` | Optional AI rephrase; must not invent numbers |
| `suggestionSync.ts` | Persist suggestions |

### Auth / sync / IO
| File | Purpose |
|------|---------|
| `authService.ts` | Local PIN + cloud auth |
| `defaultsService.ts` | Default seed |
| `demoData.ts` | Indian demo seeder |
| `durableOutbox.ts` | Durable cloud write outbox |
| `syncOutbox.ts` | Pending write badge state |
| `exportSafety.ts` | Safe export shaping |
| `importExportRepair.ts` | Import/export repair |
| `refIntegrity.ts` | Delete reference checks |

### Txn UX / reports
| File | Purpose |
|------|---------|
| `businessPersonalSplit.ts` | Biz vs personal |
| `caReports.ts` | CA / micro-business reports |
| `categoryColorEngine.ts` | Chart colors |
| `expenseContributions.ts` | Shared expense recovery |
| `transactionFormRules.ts` | Conditional form fields |
| `transactionIntent.ts` | Intent → TransactionType |
| `transactionPreview.ts` | Pre-save impact preview |
| `validators.ts` | Zod schemas |
| `adaptiveModeEngine.ts` | Essential/Family/Wealth mode |

### Statements
| File | Purpose |
|------|---------|
| `statements/types.ts` | Bank registry + row types |
| `statements/parser.ts` | Parse + analyze + reconcile |
| `statements/pdf.ts` | Local PDF open/hash |
| `statements/ocr.ts` | Local Tesseract |
| `statements/classification.ts` | Suggest decisions / dupes |

---

## 16. Appendix B — Statement pipeline (perfection detail)

### B.1 Exact flow
1. Header `Upload bank statement` → `statementOpen`
2. Lazy `StatementImportDialog`; ensure collections accounts/categories/transactions/cards
3. User: bank (auto|id), destination account (`bank|savings|current|debit_linked`), PDF, OCR mode (`auto|force|off`)
4. Analyze (device-only): `openStatementPdf` → `analyzeStatement` → `suggestStatementDecision` + `statementDuplicate`
5. Review gate (`ready`): reconcile matched, no extraction issues, all included rows pass `decisionProblems`, ≥1 row, INR confirmed, OCR confirm if used
6. Import: strip `reason`/`duplicate`, `mutationId = statement:{sha256(...)}`, body ≤ 1 MiB
7. `POST /api/import/statement.php` → `statements_import` → `cloud_write_atomic` → `statements_commit`

### B.2 Arithmetic (client + server, identical intent)

Per row (chronological after order normalize):

```
running = openingPaise
for each row:
  assert exactly one of debitPaise, creditPaise > 0
  running = running + creditPaise - debitPaise
  assert running === balancePaise
assert running === closingPaise
```

Mismatch → Import disabled (client) / HTTP 422 (server). No partial ledger write.

### B.3 Hard limits

| Limit | Value | Where |
|-------|-------|-------|
| PDF size | 20 MB | `pdf.ts` |
| PDF pages | 60 | `pdf.ts` + PHP |
| OCR pages | 12 | `ocr.ts` |
| OCR confidence | &lt; 80 blocks | `parser.ts` |
| Sparse text | &lt; 20 chars → OCR/scan path | `pdf.ts` |
| Max rows | 2000 | parser + PHP |
| Max \|paise\| | 1e12 | parser + PHP |
| POST body | 1 048 576 bytes | dialog + http helper |
| Rate limit | 20 / 60s | `statements.php` |
| Narration / ref | 2000 / 250 chars | PHP |
| Dates | 1900-01-01 … 2100-12-31 | both |

### B.4 POST allowlist (security)

Allowed top-level only:  
`userId, accountId, bank, documentHash, parserVersion, openingPaise, closingPaise, order, rows, mutationId, ocrSourceConfirmed`

Forbidden by design: PDF bytes, multipart, passwords, arbitrary extra keys.  
Decision keys only: `include, reviewed, kind, categoryId, scope, counterpartId`.  
Row `issues` must be `[]`.

### B.5 Kotak special-case (only dedicated layout)

When `bank === "kotak"` and numbered header (`# Date Description Chq/Ref Withdrawal Deposit Balance`):
- Brand via legal/footer (not payee “HDFC” etc.)
- Printed Page X of Y must match PDF index
- Headerless continuation pages allowed only if page verified
- Continuous source `#` sequence
- Opening/Closing as table cells
- Exactly one Account Summary savings/current row cross-check

All other banks: registry regex + **generic geometric table parser** only.

### B.6 Statement tests & fixtures

| Asset | Role |
|-------|------|
| `tests/unit/statementParser.test.ts` | Normalize, layouts, Kotak numbered |
| `tests/statement-api-checks.mjs` | Auth/CSRF/arithmetic/idempotency/throttle |
| `tests/browser-statement-import.mjs` | Full UI path |
| `tests/validate-local-kotak.mjs` | Real Kotak vs independent oracle (local) |
| Fixtures | hdfc, sbi, axis, indusind, kotak, kotak-numbered, locked, multipage, scanned, ocr-* |

### B.7 Documented gaps (S01–S08 class)

Real-bank multi-layout evidence, OCR maturity (skew/handwriting/multilingual), semantic classification truth, duplicate soft-match edges, durable unfinished drafts (intentionally avoided for password safety), hosting OCR CSP, completeness vs omitted offsetting pairs, credit-card statement class.

---

## 17. Appendix C — Engine exports & invariants (summary)

| Engine | Key exports | Critical invariants |
|--------|-------------|---------------------|
| financeEventBuilder | `buildLedgerForTransaction`, `buildFullLedger` | One tx ≤ one event + N effects; deleted → none; CC purchase ≠ cash |
| financeKpiEngine | `calculateFinanceMonthKpis`, NW | KPIs from effects only |
| cardEngine | outstanding, util, shared limit, intel | Shared pool ≠ Σ card limits; outstanding floored at 0 |
| cardEmiEngine | schedule, foreclosure, compare | Σ principal = input (±1 last); no new consumption on convert |
| loanEngine | EMI, amort, prepay, foreclosure | Last amort balance = 0; paise throughout |
| udhariEngine | people intel, settle labels | Lend/collect ≠ expense/income |
| obligationEngine | materialize + calendar | Unique `occurrenceKey` |
| reconciliationEngine | orphans, transfer matches | Suggest only; no silent auto-repair of money |
| accountBalanceEngine | closing + breakdown | CC expense does not reduce cash |

---

## 18. Appendix D — Test landscape map

### Co-located `src/services/__tests__/`
acceptanceMatrix, accountBalance, adaptiveMode, businessPersonalSplit, calculations.characterization, cardEmi, cardEmiLifecycle.t126, cardEngine, cardRefundLifecycle.fullMatrix, cashflowSurvival, debtQa, emergencyFund, emiPrecisionPairwise, eventReversal.golden, financeInvariants, financeKpi, financeSequenceFuzz, fourCardIsolation.fcr005, goal, issuerSchedulePrecedence, ledger.scenarios, loan, obligation, persona, phase10Engines, planFeatureGate, sharedLimitMatrix, smartBudget, transactionFormRules, transactionPreview, transferReceivedMoney, udhari.

### `tests/unit/`
aiGuardrails, billingPhase14Static, caReports, categoryColor, durableOutbox, expenseContributions, financeCrossView, importExportRepair, localCombinationMatrix, phase-01-secrets, phase-02-sync-contracts, phase-03-money-contract, privacyPhase15Static, smoke, statementParser, suggestionAiExplain, suggestionEngine, syncOutbox, vnextFinanceMigrationGolden.

### Browser / API / integrity (representative)
`browser-*.mjs`, `*-api-checks.mjs`, `atomic-writes-e2e.mjs`, statement suites, finance certify scripts under `scripts/`.

### Persona fixtures (`tests/fixtures/users/`)
cash, bank, credit-card, personal-loan, udhari receivable/payable, four-cards, goal, income-and-budgets.

---

## 19. Appendix E — PHP surface

### Controllers
`account`, `admin`, `cloud`, `cloud_data`, `imports`, `payments`, `policies`, `public_config`, `statements`, `subscriptions`.

### Critical helpers
`auth`, `security`, `money_paise`, `finance_events`, `cloud_write`, `cloud_payload`, `mutation_idempotency`, `household_auth`, `billing`, `payments`, `policy`, `audit`/`user_audit`, `expense_contributions`, `http`, `request_id`, `observability`, `app`, `utils`, `validate`/`validator`.

---

## 20. Appendix F — SQL migrations inventory

`20260910_atomic_writes.sql`, `20260911_security_sessions.sql`, `all_phases_combined(.sql|_rollback.sql)`, `IMPORT_VIA_PHPMYADMIN(.sql|_V2.sql)`,  
`phase_01_security`, `phase_03_cloud_amount_paise`, `phase_04_indexed_sync_fields`, `phase_05_financial_ledger`, `phase_07_user_credit_cards`, `phase_08_user_loans`, `phase_09_udhari_engine`, `phase_11_ai_suggestions`, `phase_13_privacy_audit`, `phase_14_saas_billing` (+ rollbacks where present),  
`phase_vnext_01_cards`, `phase_vnext_02_mutation_idempotency`.

Hosting bootstrap: `sql/HOSTING_READY_CLEAN_IMPORT.sql`, `sql/SPAROWVAULT_NEW_DATABASE.sql`.

---

## 21. Appendix G — Certification document index

### `docs/finance-vnext/`
CURRENT_STATE_CERTIFICATION, STAGING_CERTIFICATION, FCR_EVIDENCE_CERTIFICATION, FINAL_CERTIFICATION_TRACEABILITY_MATRIX, BASELINE_TEST_RESULTS, AUDIT_CONTRADICTION_MATRIX, EVIDENCE_* files, `evidence-final/*`.

### `docs/certification/`
PRODUCTION_RELEASE_CERTIFIED, SPAROWVAULT_FINAL_FINANCE_CORRECTNESS_CERTIFICATION, SPAROWVAULT_VNEXT_FINANCE_CERTIFICATION, SPAROWVAULT_VNEXT_MANUAL_QA, PHASE_L_VNEXT_FINANCE_GATE_REPORT, FINAL_OPEN_GAPS.

### Statement docs
`docs/BANK-STATEMENT-IMPLEMENTATION.md`, `docs/KOTAK-STATEMENT-FIX.md` (and related research if present).

---

## 22. Appendix H — Page capability checklist (what each page can do)

| Page | Create | Read | Update | Delete / void | Money-sensitive rules |
|------|--------|------|--------|---------------|------------------------|
| Dashboard | — | KPIs, alerts | — | — | Explain from ledger |
| Transactions | Quick Add / form | Table+filters | Edit | Soft-delete | Intent + effects |
| Income / Expenses | via form | Filtered | Edit | Soft-delete | Same ledger |
| Categories | Yes | List | Yes | Ref-check | Colors |
| Budgets | Yes | Status | Yes | Yes | Smart pace |
| Goals | Yes + contribute | Progress | Yes | Yes | Contributions |
| Accounts | Yes | Balances | Yes | Ref-check | Opening + effects |
| Cards | Yes | Intel/util/EMI | Yes | Ref-check | Liability effects |
| Loans | Yes + EMI | Amort | Yes | Ref-check | Reducing balance |
| Udhari | Lend/borrow | Ageing | Settle/write-off | — | Not expense/income |
| Wealth hub | FD/Ins/Val | Tabs | Yes | Yes | Product depth PARTIAL |
| Reports | — | Period reports | — | — | CA views |
| Suggestions | — | List | Accept/dismiss | — | AI no number invent |
| Export | Trigger | History | — | — | PIN for full |
| Import | CSV/XLSX | — | — | — | Repair path |
| Bills | Obligation pay | Calendar | — | — | occurrenceKey |
| Reconciliation | Match | Orphans | — | — | Suggest only |
| Household | Create/members | Dashboard | Permissions | — | Server RBAC |
| Alerts | — | Center | Dismiss | — | Priority |
| Settings | Prefs/demo/wipe | — | Yes | Wipe | Dangerous |
| Profile | PIN/recovery | Profile | Yes | Account delete | Security |
| Audit | Backup hooks | Logs | — | — | Privacy |
| Subscription | Order | Plan | Cancel | — | Razorpay if on |
| Admin * | Plans/users/flags | Dashboards | Assign/toggle | — | Admin CSRF |

---

## 23. Appendix I — Combinatorial coverage honesty matrix

| Combination class | Covered? | How | Residual risk |
|-------------------|----------|-----|---------------|
| Transfer self / cross | Yes | acceptanceMatrix | Low |
| Card purchase → pay → overpay | Yes | cardEngine + refund matrix | Low |
| Card EMI convert / charge / lifecycle | Yes | T-126/127 + pairwise | Medium mid-plan refund edges |
| Shared limit multi-card | Yes | sharedLimitMatrix + FCR-005 | Low |
| Udhari lend/collect/write-off | Yes | udhari tests | Low |
| Soft-delete reversal | Yes | eventReversal golden | Low |
| Sequence fuzz 50-step | Yes | financeSequenceFuzz | Medium unknown seeds |
| Offline durable replay | Yes | durableOutbox + browser | Medium conflict UX |
| MutationId race | Yes | API idempotency | Low |
| Statement reconcile fail-closed | Yes | unit+API+browser | Low for synthetic |
| Statement × real HDFC/SBI/ICICI layouts | **No** | — | **High** |
| Statement OCR multilingual/skew | **No** | — | High |
| Full EMI×refund×statement×household Cartesian | **No** | risk-based only | Medium |
| Credit-card PDF statements | **No** | bank PDF only | High for that product class |

---

## 24. How to use this audit

1. Treat **§5 + §16** as the statement accuracy source of truth.  
2. Treat **§4 + §17 + §23** as finance correctness truth.  
3. Treat **§2 + §22** as UI completeness checklist for manual QA.  
4. Do not market “all banks perfect” until §5.6 rows move from OPEN → PASS with real-PDF evidence hashes.

---

*End of report `SV-SUPER-AUDIT-2026-09-21`. Full narrative + appendices. Interactive scoreboard canvas lives beside chat in Cursor canvases.*
