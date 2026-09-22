# SparowVault — Super-Detailed Master Audit Report

| Field | Value |
|-------|--------|
| Audit ID | `SV-FULL-AUDIT-2026-09-22` |
| Date | 2026-09-22 (IST) |
| Scope | Entire current checkout — UI, finance modules, statement upload (primary), API, sync, security, tests, coding structure |
| Method | Code inventory + live local gates (`statements:certify`, prior `test:statements`, typecheck) + prior local-finalization evidence |
| Honesty rule | **No invented bank accuracy.** Name recognition ≠ layout verification. |

---

## 0. Executive verdict (read first)

| Claim | Honest status |
|-------|----------------|
| Local product software (ledger, sync, statement **pipeline**, UI routes) | **WORKING** — local mandatory evidence COMPLETE (DELTA-0222) |
| Statement **upload feature as software** | **WORKING** end-to-end (PDF on-device → review → API → ledger) |
| “Every Indian bank statement reads at super accuracy” | **FALSE / BLOCKED** — **0** layouts `verified-for-scope` |
| 20 target banks registered | **YES** (15 registered-only + 5 synthetic-tested) |
| Hosted production | **NOT_TESTED** |
| Physical multi-device | **NOT_TESTED** |

**One-line truth:** SparowVault is a large, paise-accurate, local-first finance app with a serious statement-import system and strong ledger guardrails — but **bank-layout money accuracy is only proven on synthetic fixtures for five banks**, not on authorized real holdouts for twenty.

---

## 1. Product identity & coding structure

### 1.1 Stack

- **Client:** React 19 + Vite + TypeScript, Zustand stores, Dexie (`sparowvault_v1`) IndexedDB
- **Server:** PHP 8 + MySQL, thin `api/*.php` → `php/controllers/*`
- **Money:** integer **paise** everywhere on commit paths
- **Routing:** No React Router — `NavKey` + `history.pushState` (`src/lib/navRoutes.ts`, `src/store/navStore.ts`)

### 1.2 Top-level tree

| Path | Role |
|------|------|
| `src/` | SPA: components, services, stores, db, repositories, lib |
| `api/` | Public HTTP entrypoints |
| `php/` | Controllers, helpers (auth, CSRF, cloud_write, statements), config |
| `tests/` | Vitest units + Playwright/Node e2e + statement fixtures |
| `scripts/` | Gates, packaging, DB, certify, local-finalization |
| `docs/` | Audits, certification, local-finalization evidence |
| `sql/` | Schema + migrations + hosting import SQL |
| `release/` | Built hosting bundle (operator install) |
| `.htaccess` | Apache deny/MIME/CSP/SPA fallback |

### 1.3 `src/` architecture layers

```
UI (components/pages, layout, forms, statements)
  → Zustand (authStore, dataStore, uiStore, navStore, cloudAppStore)
  → Repositories (BaseRepo → Dexie + durableOutbox)
  → Services (finance engines, statements/*, sync)
  → lib/apiClient → PHP API
```

**Screens live under** `src/components/pages/` (**31** page TSX trees including admin) — there is no separate `pages/` or `views/` root.

### 1.4 Zustand stores

| Store | File | Job |
|-------|------|-----|
| `authStore` | `src/store/authStore.ts` | Session, lock, PIN gates |
| `dataStore` | `src/store/dataStore.ts` | In-memory collections + `ensureCollections` |
| `navStore` | `src/store/navStore.ts` | Active page / URL sync |
| `uiStore` | `src/store/uiStore.ts` | Toasts, confirms, dashboard mode, statement open |
| `cloudAppStore` | `src/store/cloudAppStore.ts` | Plan flags, SaaS features |

### 1.5 Dexie collections (high level)

Core ledger: `accounts`, `cards`, `categories`, `transactions`  
Planning: `budgets`, `goals`, `goalContributions`  
Debt: `loans`, `emiPayments`, `udhari`, `udhariSettlements`  
Wealth: `investments`, `savingsContributions`, `fixedIncomeAssets`, `insurancePolicies`, `assetValuations`  
Ops: `reminders`, `alerts`, `recurringRules`, `attachments`, `exportHistory`, `auditLogs`, `snapshots`  
vNext: `transferLinks`, `creditLimitGroups`, `cardStatements`, `cardPaymentAllocations`, `cardEmiPlans`, `cardEmiInstallments`, `obligations`, `sinkingFunds`, `households`, `householdMembers`, `householdPermissions`, `importSources`, `reconciliationMatches`  
Local-only: `users`, `sessions`, `syncMutations`, `aiSuggestions`

Server sync renames: `emiPayments`→`emis`, `goalContributions`→`goalContribs`, `savingsContributions`→`savingsContribs`.

### 1.6 Sync / outbox model

1. Repo write → Dexie row  
2. Durable mutation in `syncMutations` (`durableOutbox.ts`) with stable `mutationId`  
3. Drain when online → `api/cloud/entity*.php` / sync push  
4. Server `cloud_write.php`: row lock + `financial_write_receipts` idempotency (same mutationId + same hash = replay; different hash = conflict)

---

## 2. Complete page / section / action inventory

### 2.1 Auth & shells

| Screen | Path / trigger | File |
|--------|----------------|------|
| Hydration / data bootstrap | any | `App.tsx` |
| Cloud sign-in / register | logged out | `CloudAuth.tsx` |
| Lock screen | `locked` | `LockScreen.tsx` |
| Required PIN change | `mustChangePin` | `RequiredPinChange.tsx` |
| User shell | authenticated | `AppShell.tsx` (Sidebar + Header + page) |
| Admin login / shell | `/admin*` | `AdminAuth.tsx`, `AdminAppShell.tsx` |

### 2.2 User routes (every NavKey)

| NavKey | Path | Page | Primary sections / actions |
|--------|------|------|----------------------------|
| dashboard | `/` | DashboardPage | KPIs, cashflow, goals, budgets, alerts, recent tx; mode basic/full |
| transactions | `/transactions` | TransactionsPage | Search/filter/sort; Add/Edit; Contribution return |
| income | `/income` | IncomePage | Same as transactions, type fixed income |
| expenses | `/expenses` | ExpensesPage | Same, type fixed expense |
| categories | `/categories` | CategoriesPage | List + Cleanup/merge; New/Edit; archive |
| budgets | `/budgets` | BudgetsPage | Month KPIs; New/Edit/Delete budgets |
| goals | `/goals` | GoalsPage | Goal cards; Contribute (earmark / funded_transfer); Edit |
| savings | `/savings` | WealthHubPage | Tabs: Investments, FD/RD, Insurance, Valuations |
| accounts | `/accounts` | AccountsPage | Account cards + derived balances; New/Edit |
| cards | `/cards` | CardsPage | Credit/Debit/Review tabs; EMI simulator; repair queue |
| loans | `/loans` | LoansPage | Outstanding/EMI; amortization; prepay/foreclose sims |
| udhari | `/udhari` | UdhariPage | People / Entries / History; settle; write-off |
| bill-calendar | `/bills` | BillCalendarPage | Upcoming obligations (recurring + EMI) |
| household | `/household` | HouseholdDashboardPage | Create household; members; month KPIs |
| reports | `/reports` | ReportsPage | Library + Overview/Spending/Trends/Ratios; CA workbook |
| reconciliation | `/reconciliation` | ReconciliationPage | Orphans; transfer suggestions; account summary |
| suggestions | `/suggestions` | SuggestionsPage | Engine cards; dismiss/useful; persona coach |
| alerts | `/alerts` | AlertsPage | Active/Dismissed; refresh; dismiss/restore |
| export | `/export` | ExportPage | Module exports; CA workbook; full backup (PIN) |
| import | `/import` | ImportPage | CSV/XLSX map+preview; JSON restore |
| settings | `/settings` | SettingsPage | Appearance, FY, thresholds, payment modes, wipe/seed |
| profile | `/profile` | ProfilePage | Profile, PIN change, security recovery, lock/logout |
| audit | `/audit` | AuditPage | Searchable audit log; export |
| subscription | `/subscription` | SubscriptionPage | Plans/checkout (**Razorpay env gate**) |

### 2.3 Admin routes

| Path | Page | Actions |
|------|------|---------|
| `/admin` | AdminDashboardPage | KPIs; refresh |
| `/admin/users` | UserManagementPage | Toggle active; assign plan; set PIN |
| `/admin/plans` | PlanManagementPage | Create/edit plans |
| `/admin/subscriptions` | SubscriptionManagementPage | Manage subs (Razorpay gate) |
| `/admin/flags` | FeatureFlagsPage | Save flags |
| `/admin/branding` | BrandingSettingsPage | Identity + legal |

### 2.4 Global chrome (not routes)

| Control | Location | Behavior |
|---------|----------|----------|
| Command palette | Header Ctrl/Cmd+K | Navigate + Quick Add + search |
| Sync outbox badge | Header | Pending durable mutations |
| **Upload bank statement** | Header | **Lazy-loads** `StatementImportDialog` (only React.lazy dialog in app) |
| Quick Add | Header | Income / expense / transfer → TransactionForm |
| Alerts drawer | Header bell | Active alerts |
| Theme / profile menu | Header | Theme, Profile, Settings, Lock, Logout |
| Mobile bottom nav | MobileNav | Home, Ledger, Budget, Goals, Reports |

### 2.5 Feature gates (properties that hide modules)

- `VITE_ENABLE_RAZORPAY` → subscription UI / admin subscriptions  
- `cloudAppStore.flags.exports` / `effectiveFeatures.exports` → Export Center  
- `effectiveFeatures.advanced_reports` → Reports depth  
- Admin group only when pathname starts with `/admin`

---

## 3. Finance module logic map (module-wise)

| Module | UI | Core logic files | Key equations / rules |
|--------|----|------------------|----------------------|
| Transactions | Tx/Income/Expenses | `transactionRepo`, intent builders | Type/direction/paymentMode consistency; paise |
| Accounts | AccountsPage | `deriveAccountBalance*` | Opening + Σ effects |
| Cards | CardsPage | `cardEngine`, EMI engines | Liability ≠ cash; payment allocation |
| Goals | GoalsPage | `goalEngine`, funding modes | Earmark: no cash move; funded_transfer: A→B, NW unchanged |
| Budgets | BudgetsPage | `smartBudgetEngine` | Spent vs budgeted vs projected |
| Loans/EMI | LoansPage | loan/EMI engines | Amortization; prepay sims |
| Udhari | UdhariPage | `udhariEngine` | Settlements reduce exposure |
| Investments | WealthHub | investment/savings repos | Contributions; valuations |
| Reports | ReportsPage | `caReports`, KPI engines | MoM/YoY; need/want; DTI etc. |
| Reconciliation | ReconciliationPage | `reconciliationEngine` | Suggestions only until confirmed |
| Import CSV | ImportPage | import mapping | Template + duplicate preview |
| Export | ExportPage | `xlsxExporter` | PIN for full backup |
| Alerts | AlertsPage | `alertsEngine` | Rule-generated alerts |
| Suggestions | SuggestionsPage | `suggestionEngine` | Non-authoritative coaching |
| Household | HouseholdDashboard | household repos | Shared month income/expense |
| **Statements** | StatementImportDialog | `services/statements/*` | See §4 (primary feature) |

---

## 4. ★ STATEMENT UPLOADING SYSTEM — deep audit (primary feature)

### 4.1 Why this is the major feature

Statement upload turns a **bank PDF** (on-device) into **reviewed ledger rows** without sending PDF/password to the server. Accuracy depends on:

1. Correct extraction of money fields  
2. Running-balance / liability arithmetic  
3. Completeness (detect omitted offsetting pairs)  
4. Human review of purpose/category/scope  
5. Server refusal of stale digests / bad provenance  

### 4.2 End-to-end pipeline

```
Header “Upload bank statement”
  → StatementImportDialog (lazy)
  → openStatementPdf (pdf.ts) — PDF.js, SHA-256, password local
  → routeStatementDocumentClass (cardDocument.ts)
  → analyzeStatement (parser.ts) — geometric / Kotak numbered
  → OCR if sparse (ocr.ts, ≤12 pages)
  → suggestStatementDecision (classification.ts) — never auto-reviewed
  → reconcileStatement + validateStatementCompleteness (verifier.ts)
  → User: opening/closing, INR confirm, purpose/category/scope, Reviewed / Review all
  → reviewDigest (sha256 server-aligned material)
  → POST /api/import/statement.php  OR  /api/import/statement-card.php
  → statements_commit / statements_card_commit
  → cloud transactions + importSources + optional matches
```

### 4.3 Privacy contract

| Item | Leaves device? |
|------|----------------|
| PDF bytes | **No** |
| PDF password | **No** |
| Reviewed JSON (rows, decisions, hash, balances) | **Yes** (API) |
| Draft in localStorage | Hash + decisions only (`draft.ts`) |

### 4.4 Hard client limits (`pdf.ts`)

- Max **20 MB**, **60 pages**  
- Rotated pages (`page.rotate ≠ 0`) **rejected** for import (export upright PDF)  
- OCR mode: auto / force / off; force capped  

### 4.5 Bank registries (two different things)

| Registry | Source | Count | Means |
|----------|--------|------:|-------|
| **Name list `BANKS`** | `php/config/statement_banks.json` | **38** | UI detect / select labels |
| **Layout registry** | `php/config/statement_layouts.json` | **20 targets** | Accuracy program |

#### Layout status (authoritative)

| Status | Count | Banks |
|--------|------:|-------|
| `verified-for-scope` | **0** | — |
| `synthetic-tested` | **5** | kotak, hdfc, sbi, axis, indusind |
| `registered` (name only) | **15** | icici, pnb, bob, canara, union, idbi, boi, iob, maharashtra, uco, federal, yes, idfc_first, au, bandhan |

**Kotak special-case:** numbered table adapter in `parser.ts` (Page N of M, continuous serials, printed summary cross-check) — **synthetic fixture only**; private corpus not claimed.

### 4.6 Accuracy equations (must hold or import fails)

#### Deposit running balance (client + server)

```
balance_after = previous_balance + creditPaise − debitPaise
opening + Σcredits − Σdebits = closing
last_row.balancePaise = closing
```

#### Completeness (independent of net — catches omitted ±pairs)

When printed evidence present:

- Page continuity / serial continuity  
- Printed debit/credit **counts** and **gross** vs extracted  
- `expectedTransactionCount === extracted.length`  

Comment in verifier: omitting debit 100 + credit 100 can still leave balances matching — hence completeness is separate.

#### Card liability (not deposit RB)

```
liability₀ = previousBalancePaise
debit  → liability += amount
credit → liability −= amount
closingLiability = liability
Server: previous + increases − decreases == closing
```

Synthetic fixture check: `1000 + 500 + 20 − 800 − 100 = 620`.

#### Review digest

```
SHA-256(JSON(accountId, bank, documentHash, parserVersion,
  opening, closing, order, rows+decisions, sourceEvidence, reviewRevision))
```

Mismatch → `409 STALE_REVIEW_DIGEST`, **zero** ledger writes.

### 4.7 Classification / review UX guardrails

| Control | Behavior |
|---------|----------|
| Weak suggestion | Direction-only → `suggestedKind` only; `kind` empty; never `reviewed` |
| Bulk Confirm complete | Only rows with strong/filled fields + no `decisionProblems` |
| **Review all** | Checks Reviewed on all **included** rows; does **not** invent purpose |
| Clear reviews | Unchecks Reviewed |
| Import ready | Bank + matched arithmetic + currency confirm + no remaining problems + card/account destination |

### 4.8 Server gates (`php/controllers/statements.php`)

- CSRF + rate limit (`statement_import` / `statement_card_import`)  
- Allowlisted body keys only (no PDF/password fields)  
- `documentHash` = 64 hex  
- Parser version allowlist  
- OCR path requires `ocrSourceConfirmed`  
- Digest optional but binding when sent  
- Arithmetic + completeness + per-row running walk  
- Included rows require reviewed + scope + valid kind  
- Idempotent IDs `stmt_*` / `stmtcard_*`  
- Same PDF → different account → `DOCUMENT_ACCOUNT_CONFLICT`  

### 4.9 Statement module file map

| File | Role |
|------|------|
| `pdf.ts` | Open/hash/OCR orchestration |
| `parser.ts` | Geometry + Kotak numbered |
| `verifier.ts` | Arithmetic + completeness |
| `classification.ts` | Suggestions + problems + bulk gate |
| `ocr.ts` / `ocrUncertainty.ts` | Tesseract + uncertainty blocks |
| `geometry.ts` | BBox / rotation mapping for overlay |
| `observations.ts` | Source observations (no PDF) |
| `matching.ts` | Duplicate suggestions |
| `draft.ts` | Local draft |
| `reviewDigest.ts` / `reviewState.ts` | Digest + corrections |
| `cardDocument.ts` | Card class + liability fixture |
| `layoutRegistry.ts` | Support labels / scorecard |
| `exportBundle.ts` | Review download bundle |
| `reports.ts` | Bank vs economic months |
| `StatementImportDialog.tsx` | Full product UI |

### 4.10 Combination matrix — what is tested vs not

| Combination | Covered? | How |
|-------------|----------|-----|
| Synthetic HDFC/SBI/Axis/IndusInd/Kotak PDF parse | **Yes** | Unit + fixtures |
| Locked PDF wrong/right password | **Yes** | Browser statement suite |
| Multipage / OCR paths | **Yes** | Fixtures + units |
| Omit offsetting pair (balances match, counts don’t) | **Yes** | Live API 422 |
| Stale digest after amount/date/DR flip | **Yes** | Live API |
| Concurrent same-document imports | **Yes** | Race suite: 1 economic row |
| Card liability mismatch | **Yes** | Live API |
| Card dialog destination + class route | **Yes** | Playwright dialog |
| Overlay rotation × DPI (Chromium/FF/WK) | **Yes** | Geometry matrix 243 cases |
| Real HDFC/ICICI/… customer PDF holdout | **No** | **BLOCKED** — no authorized corpus |
| All 20 banks money-field accuracy | **No** | Strict gate fails |
| Rotated production PDF import | **Rejected by design** | Client hard fail |
| Hosted Apache provider | **NOT_TESTED** | Local Apache extract only |

### 4.11 Fixtures inventory (`tests/fixtures/statements/`)

`hdfc.pdf`, `hdfc-locked.pdf`, `sbi.pdf`, `axis.pdf`, `indusind.pdf`, `kotak.pdf`, `kotak-numbered.pdf`, `multipage.pdf`, `ocr-clean.pdf`, `ocr-locked.pdf`, `scanned.pdf`, `credit-card-synthetic.pdf`, `v2/synthetic-acceptance-2026-03-04.json` + generators.

All are **PUBLIC_SYNTHETIC** — not bank-issued.

### 4.12 Accuracy bottom line (statement feature)

| Question | Answer |
|----------|--------|
| Does the upload **system** work properly? | **Yes** (pipeline + ledger + guards) |
| Will **every** bank PDF read at “super accuracy”? | **No — not certified** |
| What unlocks that claim? | Owner-authorized real PDFs + independent holdouts → promote layouts to `verified-for-scope` without weakening `statements:gate:strict` |

---

## 5. API surface (domain map)

### Auth / identity
`register`, `login`, `admin-login`, `logout`, `me`, `profile`, `change-pin`, `security-recovery`, `reset-pin`, account export/delete

### Data / sync
`cloud/sync/pull|push`, `data/entity`, `data/entity-item` (+ cloud aliases)

### Import
`import/transactions.php`, `import/statement.php`, `import/statement-card.php`

### SaaS
plans, create-order, confirm-payment, my, cancel, Razorpay webhook

### Admin
dashboard, users (+ toggle/reset-pin/assign-plan), plans, settings, feature-flags, subscriptions

### Public
`health.php`, `public/config.php`, policies current/accept

---

## 6. Security properties (project-wide)

| Control | Status |
|---------|--------|
| PIN bcrypt + weak PIN bans | Present |
| CSRF double-submit on mutations | Present |
| CORS allowlist + credentials | Present |
| MySQL rate limits | Present |
| `.htaccess` deny SQL/env/data/backups/tests | Present |
| CSP / XFO / HSTS / nosniff | Present |
| Statement body allowlist (no PDF) | Present |
| Mutation idempotency receipts | Present |

---

## 7. Test & evidence matrix

### Fresh this audit window

| Command | Result |
|---------|--------|
| `npm run statements:certify` | **0** exit; 86 unit tests PASS; `blocked: true` (5 synthetic / 15 registered) |
| Prior `npm run test:statements` | **0** exit (full live API + backup) |
| `statements:gate:strict` | **1** exit — **expected** (0 verified-for-scope) |

### Suite map

| Layer | Covers |
|-------|--------|
| Vitest finance `__tests__` | Ledger, cards, loans, goals, budgets, fuzz |
| Vitest `tests/unit` statements | Parser, geometry, intelligence v2 |
| `test:statements` | Live statement API combinations |
| Browser statement / card / geometry / pdfjs | Product paths + overlays |
| Independent client sync | Dual Playwright contexts ≠ physical device |
| Apache package check | Loopback extract MIME + SQL deny |

### Local-finalization packs

- `LF-20260922-013706` parent  
- `DELTA-020111` / `DELTA-0210` / **`DELTA-0222` tip** → `LOCAL_SOFTWARE_COMPLETE_WITH_EXTERNAL_EVIDENCE_GAPS`

---

## 8. Combination / equation checklist (finance + statements)

Use this as a regression checklist. **Green** = evidenced in repo tests; **Blocked** = needs external corpus.

| ID | Equation / combination | Status |
|----|------------------------|--------|
| E1 | Deposit RB: opening+CR−DR=closing | Green |
| E2 | Per-row balance walk | Green |
| E3 | Completeness ≠ net (omit pair) | Green |
| E4 | Card liability previous+inc−dec | Green |
| E5 | Stale digest no writes | Green |
| E6 | Same PDF second account conflict | Green |
| E7 | Concurrent import economic once | Green |
| E8 | Goal earmark vs funded_transfer NW | Green |
| E9 | CC payment reduces cash + card liability | Green |
| E10 | Contribution return ≤ remaining expense | Green |
| E11 | Weak suggestion cannot bulk-approve | Green |
| E12 | Real bank holdout money fields | **Blocked** |
| E13 | 20× layout verified-for-scope | **Blocked** |
| E14 | Hosted TLS + provider htaccess | **NOT_TESTED** |
| E15 | Physical device soak | **NOT_TESTED** |

---

## 9. Coding-structure quality notes

**Strengths**

- Clear separation: UI → repos → services → API  
- Money as paise; server re-validates arithmetic  
- Statement privacy: PDF never uploaded  
- Idempotent cloud writes  
- Honest layout registry (does not fake verified)

**Risks / gaps**

- Shared geometric parser for most banks → layout drift risk without holdouts  
- `dataStore` does not mirror every Dexie v4 table in memory  
- Subscription/Reports gated by env/plan — easy to miss in QA if flags off  
- Review all does not fill purpose (by design) — users may think import is ready when remaining > 0  

---

## 10. Perfection criteria vs reality

| “Perfection” ask | Reality |
|------------------|---------|
| Every module listed | Covered in §§2–3 |
| Every statement bank super-accurate | **Not met** — 0 verified-for-scope |
| Every equation tested | Core ledger + statement equations **yes**; infinite real-PDF variants **no** |
| Hosted + all devices | **Not tested** |
| Coding structure documented | §1 + architecture inventory |

**To reach bank-accuracy perfection:** supply authorized real statements + independent holdouts; promote layouts only via evidence; keep `statements:gate:strict` failing until then.

---

## 11. Related artifacts

| Artifact | Path |
|----------|------|
| This report | `docs/full-project-audit-2026-09-22/MASTER_AUDIT_REPORT.md` |
| Bank scorecard | `docs/audit-post-impl-2026-09-22/BANK_LAYOUT_SCORECARD.csv` |
| Remaining work | `docs/audit-post-impl-2026-09-22/REMAINING_WORK.md` |
| Local completion tip | `docs/local-finalization/LF-20260922-013706-DELTA-0222/` |
| Statement deep dive (this audit §4) | same file |

---

## 12. Final signed conclusion

SparowVault’s **current project** is a full personal-finance platform (ledger, cards, loans, goals, wealth, household, reports, import/export, admin SaaS) with a **production-grade statement upload pipeline** that correctly prioritizes arithmetic integrity, human review, and privacy.

It is **not** yet a certified “all banks, super-accurate statement reader.” That claim remains **BLOCKED** until real holdout evidence exists. Treating name recognition or synthetic PDFs as certified accuracy would be an audit failure — this report deliberately refuses that claim.
