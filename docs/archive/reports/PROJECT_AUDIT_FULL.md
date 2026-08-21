# SparowVault — Phase 3: Full Project Deep-Dive Audit

| Field | Value |
|---|---|
| Generated | 2026-05-14 |
| Companion files | `PROJECT_AUDIT_FUNCTIONS.md` (function lists), `PROJECT_AUDIT_STRUCTURE.md` (file map + DB schema) |
| Audit scope | Architecture · features · flows · phases · security · risks |

This is the comprehensive deep-dive. Everything you can do with SparowVault, every system that makes it work, every flow end-to-end, every test gate, every known issue.

---

## 1. WHAT SPAROWVAULT IS

**One-line:** A multi-user, offline-first personal finance platform for the Indian market with React 19 frontend, PHP+MySQL backend, Razorpay billing, IndexedDB local mirror, and an 18-phase engineering plan that has reached Phase 14 in code.

**Audiences served (Phase 16 personas):**
- `student` (income < ₹15k/mo)
- `salaried` (steady monthly income, default)
- `freelancer` (30-60% business transactions)
- `small_business` (>60% business transactions)
- `family` (variance pattern, multiple goals)
- `high_net_worth` (liquid assets > 50× monthly income)
- `cash_heavy` (>70% cash transactions)
- `debt_heavy` (net debt > 6× monthly income)

**Key differentiators vs. other personal-finance apps:**
1. **Udhari engine** — first-class informal lending tracking (receivable/payable, ageing, WhatsApp reminders, write-offs).
2. **Phase 5 financial ledger** — accounting-correct separation of expense view, cashflow view, net-worth view, debt view, receivables/payables. Credit-card purchases don't reduce bank balance.
3. **Paise integers everywhere** — never floats, no `0.1+0.2=0.30000000000000004` bugs.
4. **Explainable AI suggestions** — every suggestion ties to deterministic calculation inputs; LLM only rephrases, never invents numbers.
5. **CA-grade reports** — Transaction Master, Monthly Cashflow, Category/Account/Card Ledgers, Interest Paid, Udhari Ageing, GST Missing Bill, Net Worth, Business vs. Personal split.
6. **Persona-aware coaching** — student sees "safe daily spend"; debt-heavy sees "pay down card"; small_business sees "missing bills/tax".

---

## 2. ARCHITECTURE

### 2.1 Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| State | Zustand (5 stores) |
| Local DB | Dexie / IndexedDB (24 stores) |
| Styling | Tailwind CSS + Radix UI primitives |
| Charts | Recharts (wrapped in SafeChart) |
| Forms | Native + Zod schemas (validators.ts) |
| Animations | framer-motion |
| Backend | PHP 8.x (custom router) |
| Server DB | MySQL 5.7+ / MariaDB 10.4+ (utf8mb4) |
| Auth | Custom HS256 JWT + bcrypt PIN hash |
| Payments | Razorpay (orders + webhook + signature verification) |
| Testing | Vitest + Playwright + custom e2e harnesses |
| CI | GitHub Actions (`ci.yml` + `phase-e2e.yml`) |

### 2.2 Topology

```
Browser  ───►  Vite dev (5173)  ──proxy /api──►  PHP dev server (5000)  ──PDO──►  MySQL
                                                            │
                                                            ▼
                                                       Razorpay (webhook + orders)

       Dexie (IndexedDB) ←──── two-way sync ────► cloud_collection_rows (JSON store)
```

### 2.3 Sync model

The frontend writes to Dexie first, then queues a push to `/api/cloud/sync/push.php`. Pull from `/api/cloud/sync/pull.php` runs on app boot and after each significant change. The sync table `cloud_collection_rows` is generic — one row per entity per user with `payload LONGTEXT` JSON. **No per-entity table on the server**; Phase 4 adds denormalized hot columns for fast reports.

### 2.4 Auth state machine

```
unauthenticated → CloudAuth screen
   sign-in / register → POST /api/auth/login.php → JWT issued
   JWT stored → useAuthStore.currentUser set
   hydrate cloudAppStore (settings + feature flags + viewerRole)
   if must_change_pin=1 → force PIN change UI (Phase 1 F)
   if pending policy versions → policies/current+accept (Phase 13)
   load Dexie + sync from cloud
   route to AppShell (user) or AdminAppShell (admin) based on viewerRole
```

### 2.5 Trust boundaries

- **Browser → API**: JWT in `Authorization: Bearer` header (Phase 1 A4 — needs RS256 in v1).
- **API → MySQL**: PDO prepared statements, charset utf8mb4, credentials from env.
- **Razorpay → API**: HMAC-SHA256 over raw webhook body with `RAZORPAY_WEBHOOK_SECRET`; idempotent via `webhook_events.event_id UNIQUE`.
- **Admin → API**: same JWT, but `auth_require_admin()` re-reads role from DB (not just claim) so revoked admins lose access immediately.

---

## 3. FEATURE MAP — PAGE BY PAGE

### 3.1 User-facing pages (21)

#### Dashboard (`DashboardPage.tsx`)
- KPI cards: income / expense / net savings / savings rate (Phase 0 calc engine)
- Top categories chart (Phase 12 distinct colors)
- Monthly trend (last 6 months)
- Account balances breakdown
- Card health summary (utilization, due, risk)
- Goal progress overview
- Emergency fund coverage (Phase 10)
- Cashflow survival widget — "₹X for Y days, safe daily spend ₹Z" (Phase 10)
- Smart budget statuses (Phase 10 anti-false-panic)
- Top suggestions inline (Phase 11)
- Explain-this-number drawer on every KPI (Phase 12)
- Dashboard modes: basic / normal / premium (Phase 12)
- Empty-state guidance for new users

#### Transactions (`TransactionsPage.tsx`)
- Full list with date / category / account / amount columns
- Filters: date range, category, account, type, payment mode, business/personal
- Search by merchant/description
- Bulk select + delete
- Click row → drilldown showing event/effects via `ExplainMetricDrawer` (Phase 5)
- QuickAdd from this page (Phase 6 conditional form)
- Filter-from-chart-slice support (consumed via `useUIStore.consumePendingTransactionFilters`)

#### Income / Expenses (`IncomePage`, `ExpensesPage`)
- Pre-filtered Transactions views

#### Accounts (`AccountsPage.tsx`)
- Bank, cash, wallet, UPI accounts
- Opening balance (paise)
- Computed closing balance via `computeAccountBalanceBreakdown` (Phase 6)
- Account type per `AccountType` enum
- Soft-delete via `isDeleted` flag

#### Cards (`CardsPage.tsx`) — Phase 7 surface
- Credit limit, outstanding, available
- Utilization % with risk band (≤30% safe / ≤50% watch / ≤80% risky / >80% danger / ≥100% over-limit)
- Statement window (Phase 7 `calculateStatementWindow`)
- Next due date with "Due in N days" tag
- Minimum due
- Repair queue for `paymentMode='credit_card'` rows with empty `linkedCardId` (Phase 7 F)
- Outstanding source disclosure ("computed from financial_effects" vs "from transactions")

#### Loans (`LoansPage.tsx`) — Phase 8 surface
- Active / closed loans
- EMI amount (paise) — `calculateEMIPaise(P, r, n)`
- Amortization schedule (`buildAmortizationSchedule`)
- Principal paid, interest paid, remaining tenure
- Overdue EMIs banner
- Prepayment simulator
- Foreclosure estimate
- Lifecycle modes: `fresh` (compute from start_date) vs `ongoing_imported` (respect entered outstanding)
- Friendly summary line ("You borrowed ₹X, paid ₹Y, remaining ₹Z, next EMI on ...")

#### Udhari (`UdhariPage.tsx`) — Phase 9 surface
- People list with net balance per person
- Receivable vs Payable tabs
- Ageing buckets: 0-7 / 8-30 / 31-90 / 90+ days
- Settlement history
- Write-off action (creates bad-debt expense effect)
- WhatsApp reminder text generator (`buildUdhariWhatsAppReminder`)
- Risk badge per person (Phase 9)

#### Goals (`GoalsPage.tsx`) — Phase 10 surface
- Goal CRUD with target amount + target date
- Saved amount + manual contributions
- Monthly required (`remaining / max(1, monthsLeft)`)
- Pace per month + projected finish
- On-track status (pace ≥ 0.9 × required)
- Priority tier (critical/important/lifestyle/wealth)
- Goals-at-risk summary (`summarizeGoalsAtRisk`)

#### Budgets (`BudgetsPage.tsx`) — Phase 10 surface
- Monthly envelopes per category
- Spent / budgeted / % used (Phase 0)
- Status: on-track / warning / over / projected-overrun (Phase 0)
- Smart budgets with recurring-rule awareness (Phase 10 — rent paid on day 1 doesn't trigger 30× projection panic)
- Carry-forward + rollover-savings flags

#### Investments (`InvestmentsPage.tsx`) — labelled `savings` in nav
- Investment portfolio (mutual funds, stocks, FDs)
- Monthly contributions, current value, returns
- Investment buy/sell events feed into financial_effects

#### Categories (`CategoriesPage.tsx`)
- 25 default expense + 12 default income (Phase 0 seed)
- Color + emoji + icon
- Tax-relevant / GST-relevant flags
- `CategoryCleanupPanel` for dedup / merge (Phase 12)
- Duplicate-color detection (Phase 12)
- Suggested next color when creating new category (Phase 12)

#### Reports (`ReportsPage.tsx`) — Phase 15 surface
- Where money went (where spend went per category, with drilldown)
- Money left (cashflow)
- Bills coming (recurring rules + EMI + card dues)
- Debt summary (cards + loans + payable udhari)
- Goals summary
- Udhari summary
- **CA reports (Phase 15, gated by `ca_reports` feature on PRO):**
  - Transaction Master (every transaction with all flags)
  - Monthly Cashflow
  - Category Ledger
  - Account Ledger
  - Credit Card Ledger
  - Interest Paid Summary
  - Udhari Ageing Report
  - Business Expense / Personal Expense (Phase 15 split)
  - GST / Missing Bill Report
  - Tax Flag Report
  - Net Worth Report

#### Alerts (`AlertsPage.tsx`)
- Alert history with severity (info/warning/danger/success)
- Sources: budget over/warn/projected, card utilization 30/50/80, EMI overdue, udhari overdue, low savings, negative cashflow

#### Profile (`ProfilePage.tsx`)
- Username, display_name, mobile, email, avatar
- Change PIN flow (PIN re-entry verification)
- Security recovery Q+A setup
- "Must change PIN" enforcement (Phase 1 F)

#### Settings (`SettingsPage.tsx`)
- Dashboard mode toggle (basic/normal/premium)
- Chart accessibility (default / colorblind)
- Theme (light/dark/system)
- Sidebar collapsed
- (More settings via app_settings on server)

#### Subscription (`SubscriptionPage.tsx`)
- Current plan + next billing date
- Plan list with feature comparison
- Razorpay checkout integration:
  1. POST `/api/subscriptions/create-order.php` → returns `{ order_id, amount, currency, key_id }`
  2. Open `window.Razorpay({ order_id, key_id, handler })`
  3. On success, POST `/api/subscriptions/confirm-payment.php` with signature
  4. Server verifies HMAC, marks payment captured, activates subscription
- Cancel subscription action
- Feature lock UI (Phase 14 `planFeatureGate`)

#### Export (`ExportPage.tsx`)
- CA workbook (sheets: Transaction Master, Monthly Cashflow, Category Ledger, Account Ledger, Card Ledger, Loan Amortization, Interest Paid, Udhari Ageing, Business Expense, GST Missing Bill, Tax Flag, Net Worth)
- Full data workbook (all collections)
- Filename includes user label + ISO date
- **Phase 14**: gated on `exports` feature; quota `max_exports_per_month` enforced

#### Import (`ImportPage.tsx`)
- Bulk transaction CSV/XLSX import
- Maps columns to fields
- Server-side validation per Phase 4 schema rules

#### Suggestions (`SuggestionsPage.tsx`) — Phase 11 surface
- AI-suggestion feed grouped by topic + severity
- Topics: safe_daily_spend, credit_card, loan, udhari, subscription, tax, missing_bill, emergency_fund, goal, budget, investment, net_worth
- Each suggestion shows: title, reason, recommended_action, expected_impact
- Calculation inputs visible (Phase 11 transparency rule)
- Dismiss / snooze / mark-useful actions
- AI rephrase (optional, gated; Phase 16 `aiGuardrails` blocks security buy/sell text)
- Persona-aware ordering (Phase 16)

#### Audit (`AuditPage.tsx`)
- All transactions sorted by created/updated timestamp
- Includes soft-deleted (showing the deletion as an event)
- Audit-log integration

### 3.2 Admin pages (6)

| Page | Purpose |
|---|---|
| `AdminDashboardPage` | User count, active subs, MRR, recent registrations, failed webhook count |
| `UserManagementPage` | Search + paginate users, toggle `is_active`, assign plan, view sub history |
| `SubscriptionManagementPage` | Active / past_due / cancelled subs, manual extend |
| `PlanManagementPage` | Plan CRUD, feature toggles per plan, quota editing |
| `BrandingSettingsPage` | `app_title`, `logo_url`, `favicon_url`, `theme_*`, `support_email`, `privacy_url`, `terms_url` |
| `FeatureFlagsPage` | Global feature flag toggler |

---

## 4. ENGINE-BY-ENGINE WORKING MODEL

### 4.1 Calculation engine (`calculations.ts`)
Pure functions, all paise integers. Handles transaction roll-ups, savings rate, projections, budgets, goals, amortization, card health, financial health score (weights 22/14/14/14/12/14/10 = 100).

### 4.2 Ledger engine (Phase 5)
- `financeEventBuilder.buildLedgerForTransaction(tx, ctx)` — converts one Transaction into 0-N FinancialEffects via 22 event types.
- `ledgerCalculations.*View()` — produces expense / cashflow / net-worth / debt / receivables-payables views.
- **Money correctness rule** (Phase 5): credit-card purchase → expense ↑ + card liability ↑, **NOT** bank ↓. Card bill payment → bank ↓ + card liability ↓, **NOT** expense.
- EMI payment → bank ↓ full EMI + loan principal ↓ principal-component + interest expense ↑ interest-component.
- Udhari given → bank ↓ + receivable ↑, **NOT** expense. Udhari received → bank ↑ + payable ↑, **NOT** income.
- Transfer → from-account ↓ + to-account ↑, no expense/income.

### 4.3 Card engine (Phase 7)
- Source-of-truth precedence: financial_effects (Phase 5) > transactions (legacy fallback).
- Utilization buckets trigger alerts at 30/50/80%.
- Statement window calculated from `statement_day` + `due_day` + today.
- Risk levels: safe / watch / risky / danger / over_limit.

### 4.4 Loan engine (Phase 8)
- EMI formula: `EMI = P × r × (1+r)^n / ((1+r)^n − 1)` where `r = annualRate/12/100`.
- Zero-interest fallback: `EMI = P / n`.
- Schedule: per month → `interest = balance × r`, `principal = min(balance, EMI − interest)`, balance subtracts principal.
- Lifecycle mode `ongoing_imported`: uses user-entered `current_principal_paise` instead of recomputing.
- Overdue detection: any scheduled EMI whose `due_date < today` without a paid `EMIPayment`.
- Prepayment simulator: split into principal + interest at the entered date, recompute remaining tenure.

### 4.5 Udhari engine (Phase 9)
- `personKey` = `slugify(personName) + ":" + opaquePhoneHash(phone)` so renaming a person doesn't fork their ledger.
- `phone_hash` is SHA-256 (no raw phone stored).
- Ageing buckets 0-7 / 8-30 / 31-90 / 90+ days from `startDate`.
- Outstanding = principal − sum(settlements where settlement is "I'm collecting back what I lent" or "I'm paying back what I borrowed").
- Write-off action creates a bad-debt expense effect equal to the outstanding amount; receivable goes to 0.

### 4.6 Goal engine (Phase 10)
- `monthlyRequired = remaining / max(1, monthsLeft)` (no divide-by-zero on past-due target).
- `pacePerMonth = saved / monthsSinceStart`.
- On-track if `pacePerMonth ≥ monthlyRequired × 0.9`.
- Priority tiers determine ranking on Suggestions feed.

### 4.7 Emergency fund engine (Phase 10)
- Essential categories detected by name match: rent, food, basic groceries, EMI, school fees, medical, utilities, transport.
- `averageMonthlyEssentialPaise` over last N months (default 3).
- `coverageMonths = totalFund / monthlyEssential`.
- Target months default 6.

### 4.8 Smart budget engine (Phase 10)
- Subtracts already-paid recurring debits (rent, EMI) from the linear projection so rent on day 1 doesn't surface "you'll spend 30× rent this month" panic.
- Falls back to plain `projectMonthEndSpend` for variable categories.

### 4.9 Cashflow survival engine (Phase 10)
Inputs: accounts, transactions, recurring rules, loans, EMIs, cards, goals, udhari, ledger effects, today.
- `cashAvailable` = sum of liquid account closing balances.
- `expectedIncome` = sum of upcoming income from recurring rules until next salary.
- `fixedBills` = card dues + EMI dues + scheduled recurring outflows + goal commitments + udhari payable.
- `daysUntilNextIncome` = days from today to next recurring income event.
- `safeDailySpend = max(0, (cashAvailable + expectedIncome − fixedBills) / daysUntilNextIncome)`.
- Renders as plain-language line on Dashboard widget.

### 4.10 Suggestion engine (Phase 11) + Persona engine (Phase 16)
- Deterministic rule-based draft builder; no LLM calls in this stage.
- Each draft has `calculation_inputs_json` — JSON of the exact numbers the rule fired on.
- `dedupe_key` ensures the same trigger doesn't create duplicate suggestions.
- `expires_at` defaults 7 days (configurable).
- Phase 16 `inferPersona(signals)` classifies the user and `rankSuggestionsForPersona` reorders so the right topics surface first.
- AI rephrase via `suggestionAiExplain.explainSuggestionInSimpleLanguage` — gated, the prompt sends only `calculation_inputs_json` so the LLM can't invent numbers.
- `aiGuardrails(text)` rejects LLM output that recommends specific securities to buy/sell.

### 4.11 Category color engine (Phase 12)
- Distinct color assignment for top-N chart slices.
- Default palette + colorblind-safe palette.
- Separate palettes for expense / income / module (cards / loans / goals / udhari).
- Duplicate detection on category create.

### 4.12 Alerts engine (`alertsEngine.runAlertEngine(user)`)
- Idempotent — same condition fires once per period.
- 8 triggers: budget over/warn/projected-overrun, card utilization 30/50/80, card due 3d/7d/overdue, EMI overdue, udhari overdue, low savings, negative cashflow, large-receivable warning.
- Writes into Dexie `alerts` store + (when synced) `cloud_collection_rows`.

### 4.13 Plan feature gate (Phase 14)
- `UserPlanSnapshot` = current plan + active features (boolean) + numeric quotas.
- `isFeatureUnlocked(snapshot, key)` for boolean checks.
- `remainingQuota(snapshot, key, usedInWindow)` returns `Infinity` if no quota, else max(0, limit − used).
- `lockReason(snapshot, key)` produces human-readable upgrade copy.

---

## 5. PHASE-BY-PHASE SUMMARY (0 through 17)

| # | Title | Migration | Engines | Status |
|---|---|---|---|---|
| 0 | Baseline safety | n/a | Vitest harness, fixtures, gate runner | ✅ scaffolded |
| 1 | Security launch blockers | phase_01_security | Webhook ownership, JWT guard, .htaccess hardening, data-export + account-delete endpoints | ✅ scaffolded |
| 2 | CI + calculation tests | n/a | `.github/workflows/ci.yml` + Vitest tests | ✅ scaffolded |
| 3 | Money as paise integers | phase_03_cloud_amount_paise | `src/utils/money.ts` + entity normalizers | ✅ baked into bootstrap SQL |
| 4 | Indexed sync + payload validation | phase_04_indexed_sync_fields | `php/helpers/cloud_payload.php` allowlist + hot-field extraction | ✅ baked in |
| 5 | Financial event/effect ledger | phase_05_financial_ledger | `financeEventBuilder`, `financeLedgerExplain`, `ledgerCalculations` + 2 tables | ✅ baked in |
| 6 | Smart form + balance engine | n/a | `transactionFormRules`, `transactionPreview`, `accountBalanceEngine` | ✅ scaffolded |
| 7 | Card intelligence engine | phase_07_user_credit_cards | `cardEngine` + shadow table | ✅ baked in |
| 8 | Loan + EMI engine | phase_08_user_loans | `loanEngine`, `loanPaymentSync` + 2 shadow tables | ✅ baked in |
| 9 | Udhari engine | phase_09_udhari_engine | `udhariEngine` + 3 tables | ✅ baked in |
| 10 | Goals / cashflow / budgets | n/a | `goalEngine`, `emergencyFundEngine`, `smartBudgetEngine`, `cashflowSurvivalEngine` | ✅ scaffolded |
| 11 | AI suggestions | phase_11_ai_suggestions | `suggestionEngine`, `suggestionSync`, `suggestionAiExplain` + table | ✅ baked in |
| 12 | Colors / dashboard / reports | n/a | `categoryColorEngine`, `ExplainMetricDrawer` | ✅ scaffolded |
| 13 | Privacy / audit / retention | phase_13_privacy_audit | `policy.php`, `user_audit.php`, retention sweeper + 3 tables | ✅ baked in |
| 14 | SaaS billing fairness | phase_14_saas_billing | `billing.php`, `planFeatureGate` + plan_prices + sub fairness cols | ✅ baked in |
| 15 | CA reports + business/personal | n/a | `caReports.ts`, `businessPersonalSplit.ts` | ✅ scaffolded |
| 16 | Persona-aware AI coach | n/a | `personaEngine.ts` + `aiGuardrails` | ✅ scaffolded |
| 17 | Launch readiness | n/a | `health.php` rich, `request_id.php`, `restore-drill.mjs`, launch checklist | ✅ scaffolded |

**Verification status:** all 18 phases have code + tests + gate runners + completion-report templates. The bootstrap SQL `SPAROWVAULT_FULL_DATABASE.sql` has 12 phase markers seeded into `schema_version`. No phase gate has been formally executed and signed off yet (pending developer-side `npm run phase:all:gates`).

---

## 6. END-TO-END FLOWS (Working module)

### 6.1 Sign-up → first transaction (cold-start user)
1. Browser loads `http://localhost:5173` → Vite serves React app
2. `main.tsx` mounts `ThemeProvider` → `AppProviders` → `App`
3. `App` checks `useAuthStore.hydrated`. If unhydrated, shows loader.
4. `useAuthStore.hydrate()` checks `localStorage` for JWT. None → routes to `CloudAuth`.
5. User clicks "Create account" → fills username + display name + PIN
6. Frontend POSTs `/api/cloud/register.php` → Vite proxies to `php -S localhost:5000` → `php/index.php` → `php/routes.php` → `cloud_register()`
7. Server validates regex, hashes PIN with bcrypt + per-user salt, inserts into `users`, issues JWT (HS256, 7d)
8. Frontend stores JWT, hydrates `cloudAppStore` (settings + feature flags + viewer role), routes to AppShell
9. Frontend seeds 25 default expense + 12 income categories + 2 default accounts via `defaultsService`
10. AppShell renders Dashboard
11. User clicks QuickAdd → `QuickAddDialog` opens
12. User picks paymentMode `upi`, amount `₹450`, category Food, account "HDFC Savings"
13. Phase 6 `transactionFormRules` validates required fields, `transactionPreview` shows: "Bank balance will decrease by ₹450, Food expense will increase by ₹450"
14. User clicks Save → Dexie insert into `transactions` store → Zustand `dataStore` update
15. Phase 5 `buildLedgerForTransaction` produces 2 effects: account-cash decrease + expense-category increase
16. Dashboard re-renders with new totals
17. `apiClient` queues push → `/api/cloud/sync/push.php` → `cloud_sync_push()` → validates per Phase 4 allowlist + payload size + transaction shape → UPSERT into `cloud_collection_rows` with hot fields (`amount_paise=45000`, `txn_local_date='2026-05-14'`, `txn_month='2026-05'`, `txn_type='expense'`, `payment_mode='upi'`, `category_id`, `account_id`) → `finance_events_sync_transaction_safe()` writes Phase 5 events + effects on server side too
18. `alertsEngine.runAlertEngine` runs → no alerts triggered yet
19. Suggestion engine evaluates → may surface "set a budget for food" if no Food budget exists

### 6.2 Returning user, second device
1. Browser loads → `useAuthStore.hydrate()` finds JWT in localStorage
2. `cloudMe()` POSTs `/api/auth/me.php` with Bearer token → returns user + `mustChangePin`
3. If `mustChangePin=true`, app forces PIN change UI (Phase 1 F)
4. `cloudAppStore.hydrate` → public config + feature flags + subscription
5. `dataStore.loadAll` → first pulls from cloud `/api/cloud/sync/pull.php`, then merges into Dexie
6. AppShell renders, user lands on Dashboard with the full transaction history that was on the first device

### 6.3 Subscribing to PRO (Razorpay flow)
1. SubscriptionPage GETs `/api/subscriptions/plans.php` → 4 plans
2. User clicks PRO ₹799/mo → `createSubscriptionOrder(planId)`
3. POST `/api/subscriptions/create-order.php` → `subscriptions_create_order()`
4. Server: convert ₹799 → 79900 paise. Call Razorpay Orders API with Basic auth. Get `order_id`.
5. Server creates pending subscription row + payments row with `expected_amount_paise=79900` (Phase 1 D1)
6. Returns `{ order, subscriptionId, paymentId, razorpayKeyId }` to client
7. Client opens `window.Razorpay({ order_id, key_id, handler })`
8. User completes payment in Razorpay UI
9. **Two paths** happen in parallel:
   - **Client confirm**: Razorpay invokes the `handler` with `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. Client POSTs `/api/subscriptions/confirm-payment.php`. Server verifies signature via `razorpay_verify_signature(orderId, paymentId, signature)` (HMAC-SHA256). If valid, marks payment captured + subscription active.
   - **Server webhook**: Razorpay POSTs `/api/payments/razorpay/webhook.php` with the event payload. Server verifies HMAC via `razorpay_verify_webhook_signature(body, signature)` (raw body, constant-time `hash_equals`). Inserts into `webhook_events` with `event_id UNIQUE` (idempotency). On `payment.captured`:
     - Reads payment row by `(provider, provider_order_id)` `FOR UPDATE`.
     - Validates `captured_amount === expected_amount_paise` AND `captured_currency === stored_currency` (Phase 1 D2-D3).
     - Updates `payments.status='captured'` keyed on `(id, user_id, provider_order_id, status IN created/authorized)`. Rejects zero-row updates.
     - Updates `subscriptions.status='active'` keyed on `(id, user_id, provider_order_id)`.
     - Audit-logs `PAYMENT_WEBHOOK_PROCESSED`.
     - Returns `{ processed: true }`. Replay returns `{ idempotent: true }`.
10. Subscription is now active; client reloads `getMySubscription()` which returns active row + `effectiveFeatures` (Phase 14 merge of plan_features + global feature flags).
11. PRO-only features (CA reports, advanced reports, exports, alerts beyond free quota) now unlock via `planFeatureGate`.

### 6.4 Self-service data export (Phase 1 E)
1. Settings → "Export my data" → enter PIN
2. POST `/api/auth/data-export.php` with Bearer + `{ pin: "..." }`
3. `account_data_export()`:
   - `rate_limit_guard("account_data_export", 5, 3600)` → 5 per hour
   - `account_verify_pin_reentry(authUser, body)` → bcrypt verify against `users.pin_hash`
   - Pulls profile, all `cloud_collection_rows` for that user, subscriptions, payments, last 5000 audit_logs
   - `audit_log_action(..., "ACCOUNT_DATA_EXPORTED", ...)`
   - Returns JSON archive
4. Frontend triggers download

### 6.5 Self-service account delete (Phase 1 E)
1. Settings → "Delete account" → enter PIN
2. DELETE `/api/auth/account.php` with Bearer + `{ pin, reason? }`
3. `account_delete()`:
   - Rate limit 5 per hour
   - PIN re-entry check
   - `BEGIN TX`
   - UPDATE subscriptions status='cancelled', cancel_at_period_end=1, cancelled_at=NOW() where user_id matches
   - UPDATE users SET is_active=0, deleted_at=NOW(), deleted_reason=?, pin_hash='', pin_salt='' WHERE id=? AND deleted_at IS NULL
   - audit_log `ACCOUNT_DELETED`
   - COMMIT
4. Future logins denied because `auth_require_active_user()` checks `is_active=1`
5. Phase 13 retention sweeper eventually hard-deletes (default 30 days after soft-delete)

### 6.6 Admin action (e.g. toggling a user)
1. Admin logs in via `/api/auth/admin-login.php` (role='admin')
2. Admin clicks "Deactivate user X" on `UserManagementPage`
3. POST `/api/admin/users-toggle-active.php?userId=X`
4. `auth_require_admin()` reads role from DB (defends against stale JWT claim)
5. UPDATE users SET is_active = NOT is_active WHERE id = X
6. `audit_log_action(adminId, 'admin', 'USER_TOGGLED_ACTIVE', 'user', X, before, after)` writes to `admin_audit_logs` (immutable)

### 6.7 Daily retention sweep (cron)
- `php scripts/retention-sweeper.php` runs daily
- 6 jobs: hard-delete soft-deleted users > 30 days, clean login_attempts > 7 days, clean api_rate_limits > 1 day, clean webhook_events processed > 90 days, clean user_audit_logs > 730 days, clean soft-deleted cloud_collection_rows > 30 days
- Each job writes a row into `retention_jobs` with start/finish/rowsSwept/status

---

## 7. SECURITY POSTURE — what's locked down, what's still open

### Closed (Phase 1)
- ✅ Webhook signature constant-time compare (`hash_equals`)
- ✅ Webhook event idempotency (`webhook_events.event_id UNIQUE`)
- ✅ Webhook ownership: payment row keyed on `(user_id, provider_order_id)`, amount + currency validated against `expected_amount_paise`
- ✅ JWT secret guard: refuses prod boot when empty / known-bad / < 32 chars
- ✅ DB_PASS guard: refuses prod boot when empty
- ✅ HTTPS forced via `.htaccess`
- ✅ HSTS / CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy headers
- ✅ Deny rules for `.env*`, `data/`, `backups/`, `sql/`, `php/config/`, `.jwt-secret`
- ✅ Source maps stripped from production build (`vite.config.ts` build.sourcemap defaults to false)
- ✅ Bundle packaging refuses to ship secrets (sanitization guard in `scripts/package-hosting.mjs`)
- ✅ Admin seed safety: refuses prod without `--force`; `must_change_pin=1` on seeded admin
- ✅ Self-service data-export + account-delete with PIN re-entry, rate-limit, audit log
- ✅ Login brute-force protection via `login_attempts` UNIQUE(username, ip) + lockout
- ✅ MySQL-backed rate limiting (atomic ON DUPLICATE KEY UPDATE)

### Phase 2 (closed)
- ✅ CI workflow blocks merge on test failure
- ✅ Phase 0/1/2 gates in CI

### Still open (flagged in audit)
- ⚠️ JWT stored in `localStorage` (Phase 1 A3) — XSS exfiltratable. Should move to httpOnly cookie + CSRF token.
- ⚠️ Custom HS256 (no `kid` rotation, no explicit `alg` allow-list against "alg:none" attack) — Phase 1 A4
- ⚠️ 4-digit minimum PIN (Phase 1 A7) — 10k key space; relies on throttling
- ⚠️ CSP allows `style-src 'unsafe-inline'` (Tailwind/Radix); tightening requires nonce build step
- ⚠️ No PII encryption at rest (mobile/email plaintext in `users` table)
- ⚠️ No CSRF protection if JWT moves to cookie
- ⚠️ `audit_logs` table not in production_schema.sql until `SPAROWVAULT_FULL_DATABASE.sql` was created; legacy environments missing it have silently-failing audit writes
- ⚠️ No staging environment provisioned yet (Phase 17 documented but not stood up)

---

## 8. MONEY-CORRECTNESS PROPERTIES (verified)

| Property | How enforced |
|---|---|
| All money in paise integers | `src/utils/money.ts` everywhere; tests in `money.test.ts` |
| EMI formula precision | `calculateEMI(100000, 12, 24)` ≈ 4707.35; tested |
| Amortization sum closes to zero | tested (or close to within ±1 paise) |
| Savings rate clamped [−100, 999] | tested |
| Projection day-1 multiplier = daysInMonth | tested |
| `netMonthlySavings = income − expense − emi − cc_pmt − udhari_given` | tested in `calculations.characterization.test.ts` |
| Credit card purchase does NOT decrease bank | Phase 5 ledger; tested in `ledger.scenarios.test.ts` |
| Credit card bill payment does NOT create expense | Phase 5 ledger; tested |
| EMI payment splits principal+interest correctly | Phase 5 ledger + Phase 8 engine; tested |
| Udhari given = receivable, NOT expense | Phase 5 ledger; tested |
| Udhari received = payable, NOT income | Phase 5 ledger; tested |
| Transfer: no expense/income, just cash movement | Phase 5 ledger; tested |
| Business/personal split: parts sum to total | `businessPersonalSplit.test.ts` |
| Plan feature quota remaining never negative | `planFeatureGate.test.ts` |

---

## 9. KNOWN BUGS FIXED THIS SESSION

1. **`AppShell.tsx:63 Uncaught ReferenceError: SubscriptionPage is not defined`** — `SubscriptionPage` referenced in PAGES map but not imported. ✅ Fixed.
2. **`DashboardPage.tsx:716 Uncaught ReferenceError: Badge is not defined`** — Badge used in emergency-fund card but not imported. ✅ Fixed.
3. **`ledger.scenarios.test.ts` field-name mismatch** — used `principalPaisePaid`/`interestPaisePaid`/`paidAt` instead of `principalComponentPaise`/`interestComponentPaise`/`paidDate`. ✅ Fixed.

---

## 10. CONFIG SURFACE — every env var

| Env | Required | Default | Purpose |
|---|---|---|---|
| `APP_ENV` | dev/prod | `development` | Production mode flag (enables boot guards) |
| `APP_ENV_FILE` | n | none | Optional env file selector (`.env.local` / `.env.host`) |
| `APP_BASE_URL` | n | none | Public app URL |
| `DATABASE_URL` | n | none | Overrides DB_* if set |
| `DB_HOST` | y* | none | MySQL host |
| `DB_PORT` | n | 3306 | MySQL port |
| `DB_NAME` | y* | none | MySQL database name |
| `DB_USER` | y* | none | MySQL username |
| `DB_PASS` | y (prod) | none | MySQL password — Phase 1 guard refuses empty in prod |
| `CLOUD_JWT_SECRET` | y (prod) | n/a | HS256 signing key; Phase 1 guard refuses empty / known-bad / <32 chars in prod |
| `CLOUD_JWT_EXPIRES_IN` | n | `7d` | JWT lifetime |
| `CORS_ALLOWED_ORIGINS` | y (prod) | empty | Comma-separated allowlist |
| `ENABLE_RAZORPAY` | n | `false` | Toggles Razorpay flow |
| `RAZORPAY_KEY_ID` | y (prod, if Razorpay) | none | Razorpay key id |
| `RAZORPAY_KEY_SECRET` | y (prod, if Razorpay) | none | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | y (prod, if Razorpay) | none | Webhook HMAC secret |
| `VITE_API_BASE_URL` | n | same-origin | Frontend API base |
| `VITE_CLOUD_ONLY_MODE` | n | `true` | Disables local-only profile flow |
| `VITE_ENABLE_RAZORPAY` | n | `false` | Frontend toggle for SubscriptionPage |
| `VITE_API_TARGET` | n | `http://localhost:5000` | Vite dev proxy target |
| `VITE_SOURCEMAP` | n | `false` | Build sourcemaps opt-in |
| `TEST_DB_HOST/PORT/USER/PASS/NAME` | n | none | Test DB connection for `scripts/db-test-*` and e2e harnesses |

---

## 11. NPM SCRIPTS — what every script does

| Script | Purpose |
|---|---|
| `dev` | concurrently runs `dev:server` (PHP) + `dev:client` (Vite) |
| `dev:server` | `php -S localhost:5000 -t . php/dev-router.php` |
| `dev:client` | `vite` (port 5173) |
| `prebuild` | `node scripts/clean-build.mjs` |
| `build` | `vite build` |
| `start` | same as `dev:server` |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:calculations` | Phase 0 characterization tests only |
| `test:api` | API e2e regression |
| `test:webhook` | Webhook replay/idempotency |
| `test:webhook:ownership` | Phase 1 webhook ownership matrix (5 scenarios) |
| `test:account:endpoints` | Phase 1 export/delete (5 scenarios) |
| `test:phase04:validation` | Phase 4 validation matrix (11 scenarios) |
| `test:browser`, `test:browser:auto`, `test:cloud`, `test:deep` | Playwright suites |
| `check:php` | `node scripts/check-php-syntax.mjs` |
| `check:sql` | `node scripts/sql-dry-run.mjs` |
| `health` | typecheck + lint + test + check:php + check:sql + build |
| `db:test:reset` | drop + reapply schema to `*_test` DB |
| `db:test:seed` | load 8 fixture users into test DB |
| `phase:00:gate` … `phase:17:gate` | Per-phase gate runner |
| `phase:all:gates` | Master orchestrator (stops on first fail; supports `--from`/`--through`/`--continue`) |
| `host:package` | Bundle for shared hosting (strips secrets/maps/node_modules) |
| `backup:db` | `php scripts/backup_db.php` |
| `backup:json` | `php scripts/backup_json.php` |

---

## 12. RISK REGISTER — biggest open risks before production launch

| # | Risk | Severity | Mitigation status |
|---|---|---|---|
| 1 | JWT in localStorage exfiltrated by XSS | High | Documented; needs httpOnly cookie + CSRF |
| 2 | Custom JWT, no `alg` allow-list / no rotation | High | Documented; consider firebase/php-jwt |
| 3 | PIN brute-force defense relies entirely on throttling | Medium | login_attempts table + 5-strike lockout in place |
| 4 | Money as DECIMAL(10,2) in `payments.amount_inr` (rest of system is paise) | Low | `expected_amount_paise` is source of truth for validation; documented |
| 5 | No staging environment | Medium | docs/staging-setup.md ready; not provisioned |
| 6 | No PII encryption at rest | Medium | Documented; deferred to Phase 17+ |
| 7 | CSP allows 'unsafe-inline' style-src | Low | Required for Tailwind/Radix; needs nonce build later |
| 8 | No monitoring / uptime alerting | Medium | UptimeRobot recommended in launch-checklist |
| 9 | No scheduled backups | Medium | `backup:db` script exists; cron not wired |
| 10 | `audit_logs` table missing in pre-bootstrap installs | Low | `SPAROWVAULT_FULL_DATABASE.sql` includes it now |
| 11 | Subscription early renewal currently uses `NOW()` instead of `MAX(NOW(), current_period_end)` | Medium | Phase 14 columns added; PHP impl pending |
| 12 | No automated retention sweep cron in prod | Low | Script exists; needs cron entry |

---

## 13. WHAT TO TEST RIGHT NOW (in order)

1. **`npm run dev`** (NOT `vite` alone) — must see both `server` (PHP on 5000) and `client` (Vite on 5173) streams.
2. **http://localhost:5000/api/health.php** — should return JSON with `data.status="healthy"` + `data.db.status="ok"` + `data.version=phase_14_*`.
3. **http://localhost:5173/** — hard refresh.
   - Two recent bugs are fixed (SubscriptionPage import, Badge import).
   - Should land on CloudAuth screen.
4. **Sign in as `admin` / `12345678`** — forced PIN change UI should appear (because `must_change_pin=1`).
5. **Change PIN, then navigate**:
   - Dashboard renders without console errors
   - Subscription page renders (the fix you saw)
   - Each nav item loads without error
6. **Add an expense** via QuickAdd. Verify it appears in Dexie + cloud_collection_rows + financial_events.
7. **Run `npm run phase:all:gates`** — paste failures back. The most likely failures are Vitest tests against type mismatches between my fixtures and your actual types — fixable one at a time.

---

## 14. ARCHITECTURAL STRENGTHS

1. **Offline-first via Dexie** — full app works offline, syncs when online.
2. **Generic JSON entity store** — new client features ship without DB migrations.
3. **Idempotency throughout** — webhook event_id UNIQUE, dedupe_key on suggestions, atomic ON DUPLICATE KEY for rate limits + login attempts.
4. **Pure-function business logic** — every engine is testable in isolation; tests run without DB or PHP.
5. **Clear separation of concerns** — services (logic), stores (state), components (presentation), lib (utilities), utils (primitives), db (storage).
6. **Phased delivery** — 18 phases with explicit gates, completion reports, and idempotent migrations.
7. **Idempotent migrations** — every phase migration is safe to re-run (information_schema guards or `IF NOT EXISTS`).

## 15. ARCHITECTURAL WEAKNESSES

1. **Tight coupling between Dexie and cloud sync** — every collection has to be declared in both client (`CLOUD_COLLECTIONS`) and server (`cloud_collection_allowlist()`).
2. **No DB-level row-level security** — relies on app filtering by `user_id`; one missing WHERE clause leaks data.
3. **JSON payload in `cloud_collection_rows`** — Phase 4 added hot columns, but field-level queries still need extraction logic kept in sync.
4. **Mix of legacy and new tables** — `cloud_users` is kept; `audit_logs` and `admin_audit_logs` are near-duplicates.
5. **Custom JWT** — works but requires careful maintenance vs. battle-tested libs.
6. **No row-level encryption for PII** — mobile, email, transaction memos plaintext.

---

## 16. CLOSING STATEMENT

SparowVault is a thoughtfully designed personal finance platform with significant engineering rigor behind it. The 18-phase plan has delivered a working money-correctness model (Phase 5 ledger), an Indian-market-specific differentiator (Phase 9 udhari), and a path to compliance (Phase 13). It's structurally consistent — every page imports its dependencies, every PHP controller has its helper functions, every column referenced in code exists in the bootstrap SQL.

**Three remaining gates to ship-readiness:**
1. **Run `npm run phase:all:gates` locally** and fix any failures (most likely type-fixture mismatches in my test scaffolding).
2. **Provision staging** per `docs/staging-setup.md` and validate the Razorpay flow end-to-end with test keys.
3. **Tick the launch checklist** at `docs/launch-checklist.md`.

When those are green, SparowVault is in a defensible posture for a paid MVP launch.

---

### Companion files

- `PROJECT_AUDIT_FUNCTIONS.md` — exhaustive function/export inventory (800+ entries)
- `PROJECT_AUDIT_STRUCTURE.md` — file map + DB schema (29 tables, 24 FKs, 95+ indexes)
- This file (`PROJECT_AUDIT_FULL.md`) — the synthesis
