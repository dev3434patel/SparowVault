# SparowVault Company — Super Detailed Current-State Audit

**Audit date:** 2026-09-23 (post-migration / post-demo remediation pass)  
**Scope:** Entire `/company` domain — architecture, schema, posting logic, preview, UI, APIs, tests, gaps  
**Method:** Code inventory + posting/authz/seed review + page LIVE vs STUB scorecard + demo-certify + unit/gate evidence  
**Certification label:** **NOT ACCOUNTING CORE CERTIFIED**  
**Honesty rule:** This document describes **what the code actually does today**, not the product blueprint.

Allowed labels: `PASS` | `PARTIAL` | `FAIL` | `STUB` | `LIVE` | `NOT RUN` | `SCHEMA-ONLY`

---

## 0. Executive verdict (read this first)

| Question | Answer |
|----------|--------|
| Can you create a company workspace? | **YES** — migration applied; `company_workspaces` exists; create API seeds COA |
| Can you post balanced vouchers to MySQL? | **YES** — `company_post_voucher` is real; demo-certify passes many combinations |
| Is the UI a complete accounting product? | **NO** — quick entry + create/select/dashboard partially live; most masters/reports/admin are stubs |
| Are books isolated from personal finance? | **MOSTLY** — separate `company_*` tables + `/company` shell; lock/PIN bypass still incomplete |
| Is preview identical to what posts? | **NO** — client drafts against control ledgers; PHP often posts to party relationship subledgers |
| Are there remaining correctness bugs? | **YES** — see §12 P0 list (`OTHER` on received, PROPERTY_PAYMENT, non-atomic reversal, etc.) |
| Accountable certification? | **WITHHELD** |

**Bottom line:** Treat PHP posting + seed + reports as the **accounting core under test**. Treat most of `src/company/pages/*` as **UX scaffolding**. Demo certification proves server combinations; it does **not** prove the UI product is complete or bug-free.

---

## 1. Architecture overview

### 1.1 Domain boundary (hard rule)

```
Personal SparowVault (existing)          Company SparowVault (/company)
─────────────────────────────────        ────────────────────────────────
personal_* / finance tables              company_* tables only
Sidebar in App.tsx                       CompanyAppShell (separate nav)
Outbox / PIN lock for personal           Company path skips personal hydrate
                                         MUST NOT mix books
```

**Mount point:** `src/App.tsx` — if `pathname` starts with `/company` → render `<CompanyApp />` and skip personal data load/outbox.  
**Gap:** `/company` does **not** enforce the same `locked` / `mustChangePin` gates that the personal app enforces.

### 1.2 Layer cake (actual)

| Layer | Path | Role today |
|-------|------|------------|
| Docs / blueprint | `docs/company/*` | Spec + prior certs (several still say PARTIAL) |
| Schema | `sql/migrations/20260923_company_core.sql` | ~36 `company_*` tables |
| PHP helpers | `php/helpers/company/*.php` | Seed, authz, posting, reports, exports, audit |
| PHP controller | `php/controllers/company.php` | HTTP handlers |
| API facades | `api/company/*.php` | Thin require → controller |
| TS services | `src/company/services/*` | Client-side purpose/balance/report engines (unit-tested) |
| API client | `src/company/api/client.ts` | Subset of endpoints wired |
| Zustand store | `src/company/store/companyStore.ts` | activeCompanyId, memberships, workspace, permissions |
| Pages | `src/company/pages/*` | Mix of LIVE and STUB |
| Gates/scripts | `scripts/company/*` | migration, demo-certify, file/vitest gates |

### 1.3 Routing model

- **No React Router** inside company.
- `src/company/routes.ts` maps path segments → route keys via `companyPath` / `pathToCompanyRoute`.
- `CompanyApp.tsx` listens to `popstate` and switches page components.
- Shell: `CompanyAppShell` + `CompanySidebar` + `CompanyHeader` + `CompanyMobileNav`.

### 1.4 Architecture docs inventory

| File | Purpose |
|------|---------|
| `COMPANY_PRODUCT_BLUEPRINT.md` | Product vision |
| `COMPANY_ACCOUNTING_MODEL.md` | Double-entry equations |
| `COMPANY_DATABASE_SCHEMA.md` | Schema design notes |
| `COMPANY_ROUTE_PAGE_MAP.md` | Intended routes |
| `COMPANY_PERMISSION_MATRIX.md` | Role → permission keys |
| `COMPANY_VOUCHER_RULES.md` | Purpose templates / voucher rules |
| `COMPANY_REPORT_MATRIX.md` | Report catalogue |
| `COMPANY_TEST_MATRIX.md` | Planned test layers |
| `PERSONAL_COMPANY_DOMAIN_BOUNDARY.md` | Isolation rule |
| `COMPANY_SAAS_FUTURE_PLAN.md` | Future multi-tenant |
| `COMPANY_*_CERTIFICATION.md` / `OPEN_GAPS.md` | Prior honest status |
| `SPAROWVAULT_COMPANY_FINAL_CERTIFICATION.md` | Prior full audit (pre this remediation) |
| This file | **Current-state super audit** |

---

## 2. Database schema (current)

**File:** `sql/migrations/20260923_company_core.sql`  
**Conventions:** InnoDB, utf8mb4; money = `BIGINT *_paise`; IDs `VARCHAR(191)`; company-owned rows carry `company_id`.

### 2.1 Table groups

| Group | Tables |
|-------|--------|
| Tenancy | `company_workspaces`, `company_groups`, `company_group_members` |
| Access | `company_roles`, `company_role_permissions`, `company_memberships`, `company_membership_roles` |
| Dimensions | `company_business_units`, `company_branches`, `company_areas`, `company_projects`, `company_cost_centres` |
| Parties | `company_parties`, `company_party_roles`, categories/tags + memberships |
| COA | `company_account_groups`, `company_ledgers`, `company_party_relationship_accounts` |
| Books | `company_vouchers`, `company_voucher_lines`, `company_voucher_cost_allocations` |
| Bills | `company_bill_refs`, `company_bill_allocations` |
| Controls | `company_period_locks`, `company_approvals`, `company_financial_write_receipts`, `company_audit_logs` |
| Future / schema-only | `company_documents`, `company_recurring_rules`, `company_cross_domain_links`, `company_org_subscriptions` |

### 2.2 Critical uniqueness / money

- Vouchers: `UNIQUE (company_id, voucher_number)`, `UNIQUE (company_id, mutation_id)`
- Bill refs: `UNIQUE (company_id, party_id, ref_number)`; `original_amount_paise`, `outstanding_paise`
- Idempotency store: `company_financial_write_receipts` PK `(company_id, mutation_id)` + `request_hash`
- **No DB CHECK** that line amounts > 0 or Dr=Cr (enforced in PHP only)
- **No FK** on `reversed_voucher_id` / `correction_of_voucher_id`

### 2.3 Migration status

- Applied to live DB `sparowvault` via `scripts/company/apply-migration.php`.
- Bill tables repaired once via `fix-bill-tables.php` (FK name collisions errno 121/150).
- Prior UI error `Table 'sparowvault.company_workspaces' doesn't exist` was **missing migration**, not application logic.

---

## 3. Seed / COA logic (server truth)

**File:** `php/helpers/company/seed.php`  
**Entry:** `company_seed_workspace($db, $companyId, $userId)` called from `company_workspaces_create`.

### 3.1 What gets seeded

1. System roles: `OWNER`, `SUPER_ADMIN`, `ACCOUNTANT`, `MANAGER`, `DATA_ENTRY`, `VIEWER`, `AUDITOR`
2. Role → permission keys (`company_seed_role_permissions`)
3. Account groups (~nature ASSET/LIABILITY/EQUITY/INCOME/EXPENSE)
4. System ledgers (≈20), including:
   - Money: `CASH_IN_HAND`, `BANK_PRIMARY`
   - Controls: `AR_CONTROL`, `AP_CONTROL`, `ADVANCES_GIVEN`, `LOANS_BORROWED`, `LOANS_GIVEN`, …
   - P&L / equity: `SALES_LEDGER`, `PURCHASE_LEDGER`, `FARMING_EXPENSE`, `PROPERTY_EXPENSE`, `CAPITAL_LEDGER`, `DRAWINGS_LEDGER`, …
5. Owner membership + OWNER role
6. Audit event `workspace.seeded`

### 3.2 Client COA mismatch (important)

`src/company/services/coaSeed.ts` / `LedgersPage` show **different codes** than PHP seed:

| Client template (fiction for UI) | Server seed (truth) |
|----------------------------------|---------------------|
| `ADVANCE_GIVEN` | `ADVANCES_GIVEN` |
| `LOAN_PAYABLE` | `LOANS_BORROWED` |
| `CAPITAL` | `CAPITAL_LEDGER` |
| `SALES` / `PURCHASE` / `SALARY` | `*_LEDGER` variants |

**Implication:** Ledgers page is **not** the live chart of accounts.

---

## 4. Authz / RBAC (current logic)

**File:** `php/helpers/company/authz.php`

| Function | Behavior |
|----------|----------|
| `company_permission_keys()` | Canonical permission string list |
| `company_require_membership` | User must have ACTIVE membership for company |
| `company_user_permissions` | Join membership → roles → permission keys |
| `company_require_permission` | 403 if key missing |
| `company_assert_same_company` | Tenant guard on loaded rows |
| `company_permission_for_voucher_type` | Maps RECEIPT/PAYMENT/… → create_* permission |

**Posting nuance:** If user lacks `post_voucher` but has create permission, voucher may land as `PENDING_APPROVAL` instead of `POSTED`.

**Not implemented from matrix:** sensitive PIN gates, full browser role matrix certification.

---

## 5. Posting engine — heart of the system

**File:** `php/helpers/company/posting.php`  
**Primary API:** `company_post_voucher($db, $companyId, $userId, $payload)`

### 5.1 Post pipeline (exact order)

1. Validate `mutationId` (regex, required)
2. Compute `company_request_hash` of canonicalized payload
3. Infer `voucherType` from `purpose` if omitted
4. Authz: membership + voucher-type permission + `post_voucher` (else pending)
5. Lock workspace row `FOR UPDATE`
6. Idempotency:
   - Same mutation + same hash → return stored voucher JSON (replay)
   - Same mutation + different hash → `409 IDEMPOTENCY_CONFLICT`
7. Period lock: if `voucher_date < lock_before_date` → `423`
8. Build lines:
   - If `lines` present → use explicit lines
   - Else require `purpose` + `amountPaise` + `cashBankLedgerId` → `company_preview_purpose`
9. Assert Σ Debit paise === Σ Credit paise (exact integer)
10. Cash-bank shape rules for RECEIPT / PAYMENT / CONTRA (**skipped when `isReversal`**)
11. Decide status: `DRAFT` | `PENDING_APPROVAL` | `POSTED` (threshold / permission)
12. Insert voucher header + lines
13. If status `POSTED` and `billAllocations` present → apply allocations
14. Write approval row if pending; audit; write receipt; commit

### 5.2 Purpose → lines (`company_preview_purpose`)

**Shape:**
- Receipt purposes: Dr cash/bank, Cr counter
- Payment purposes: Dr counter, Cr cash/bank
- Party purposes often call `company_resolve_party_relationship_ledger` → creates/uses per-party subledger under control

**PHP purpose cases (current):**

| Purpose | Direction | Counter resolution |
|---------|-----------|-------------------|
| `LOAN_RECEIVED` | Receipt | Party LOAN_PAYABLE → `LOANS_BORROWED` |
| `CUSTOMER_PAYMENT` | Receipt | Party RECEIVABLE → `AR_CONTROL` |
| `SALE` | Receipt | `SALES_LEDGER` (party required but not used on counter) |
| `CAPITAL_INTRODUCED` | Receipt | `CAPITAL_LEDGER` |
| `ADVANCE_RETURNED` | Receipt | Party ADVANCE → `ADVANCES_GIVEN` |
| `INTEREST_INCOME` | Receipt | `INTEREST_INCOME` |
| `PROPERTY_RECEIPT` / `FARMING_RECEIPT` / `OTHER_INCOME` | Receipt | matching income ledgers |
| `LOAN_REPAYMENT` | Payment | Party LOAN_PAYABLE |
| `VENDOR_PAYMENT` | Payment | Party PAYABLE → `AP_CONTROL` |
| `PURCHASE` | Payment | `PURCHASE_LEDGER` |
| `ADVANCE_GIVEN` / `FARMER_ADVANCE` | Payment | Party ADVANCE → `ADVANCES_GIVEN` |
| `MONEY_LENT` | Payment | Party LOAN_ASSET → `LOANS_GIVEN` |
| `OWNER_DRAWING` / `CAPITAL_WITHDRAWAL` | Payment | `DRAWINGS_LEDGER` |
| `CONTRA` | — | **throws** — require explicit lines |
| `FARMING_PAYMENT` / `PROPERTY_PAYMENT` / `EXPENSE` / `OTHER` / `SALARY` / `INTEREST` | Payment | expense ledgers |
| `REFUND` | Payment | Dr `OTHER_INCOME` (questionable semantics) |

**P0 bug:** `OTHER` always maps to expense / payment. Quick Received still offers `OTHER` → can post money-out shape from a “received” screen.

**P0 bug:** `PROPERTY_PAYMENT` always → `PROPERTY_EXPENSE`, while product rules say ask advance vs investment vs expense; FE also marks `affectsProfit: false` which blocks save when preview shows profit impact.

### 5.3 Reversal (`company_reverse_voucher`)

1. Load original; require `reverse_voucher` permission
2. Flip each line side; build payload with `isReversal: true`
3. Call `company_post_voucher` (own transaction/commit)
4. UPDATE original → `REVERSED`
5. Restore outstanding only for allocations with type `AGAINST_REFERENCE`
6. Audit

**P0 gaps:**
- Steps 3–5 are **not one atomic transaction** → crash window = posted reversal + original still POSTED
- `NEW_REFERENCE` bills created by original are **not** closed/cancelled on reverse

### 5.4 Bill allocations

| allocationType | Behavior |
|----------------|----------|
| `NEW_REFERENCE` | Insert `company_bill_refs` + allocation row |
| `AGAINST_REFERENCE` | Reduce `outstanding_paise`; update status OPEN/PARTIAL/SETTLED |
| default / `ON_ACCOUNT` without billRef | **silent `continue` (no-op)** — easy to believe allocation happened |

Allocations applied **only when voucher status is POSTED at insert time**. Approving a PENDING voucher later does **not** replay deferred allocations.

### 5.5 Cash / bank invariants

- RECEIPT: at least one DEBIT to `is_cash_bank` ledger
- PAYMENT: at least one CREDIT to cash/bank
- CONTRA: all lines cash/bank
- Skipped for reversals (`isReversal`)

---

## 6. Preview — two engines (this is why UI “feels wrong”)

### 6.1 Server preview

- Endpoint: `api/company/voucher-preview.php` → `company_vouchers_preview` → `company_preview_purpose`
- Returns the **same line builder** posting will use for purpose posts
- Does **not** preview arbitrary multi-line journals (those go as explicit `lines`)

### 6.2 Client preview (what users mostly see)

- `src/company/services/purposeEngine.ts` → `mapPurposeToDraftLines`
- Used by Quick Received/Paid/Transfer before save
- Maps purpose → control ledger **codes** via a local `PURPOSE_LEDGER_CODE` table on the page
- **Does not call** `companyApi.previewVoucher` today

### 6.3 Divergence table

| Aspect | Client preview | Server post |
|--------|----------------|-------------|
| Party loan / AR / AP / advance | Uses control ledger id from list by code | Creates/uses **party relationship subledger** |
| CONTRA | Explicit from/to lines (OK) | Purpose preview throws; explicit lines required (OK if UI sends lines) |
| OTHER | Direction-sensitive in TS (`quickDirection`) | Always expense payment in PHP |
| PROPERTY_PAYMENT | `affectsProfit: false` | Always expense |
| SALE / FARMING_RECEIPT / … | Missing or incomplete in FE catalogue | Present in PHP |

**User-visible effect:** Effect preview can show different ledger IDs than the voucher that lands in MySQL — balance totals may still match, but subledger/party books differ.

---

## 7. Reports (server)

**File:** `php/helpers/company/reports.php`  
**Dispatch:** `company_reports_dispatch` via `api/company/reports.php?report=…`

| Report key | Function | Notes |
|------------|----------|-------|
| `trial-balance` | `company_trial_balance` | POSTED only; closing Dr/Cr |
| `profit-loss` / `pnl` | `company_profit_loss` | Income − expense |
| `balance-sheet` | `company_balance_sheet` | Assets vs L+E + `balanced` flag |
| `day-book` | `company_day_book` | Also used for vouchers list |
| `party-statement` | `company_party_statement` | Requires `partyId` |
| `ageing` | `company_ageing` | receivable/payable buckets |
| `cash-bank-book` | `company_cash_bank_book` | Requires `ledgerId` |

**UI Report hub keys that do NOT exist on API:** `cash-book`, `bank-book`, `receivables`, `payables`, `outstanding-ageing`, `receipts-payments`, `project-report`, etc. Report view page does not call `companyApi.report`.

---

## 8. API surface vs frontend client

### 8.1 Endpoints on disk (`api/company/`)

workspaces, workspace, workspace-create, workspace-item, memberships, parties, party-create, party-item, ledgers, dimensions, vouchers, voucher-item, voucher-post, voucher-preview, voucher-reverse, bills, reports, period-locks, approvals, exports, bootstrap

### 8.2 Wired in `companyApi` (`src/company/api/client.ts`)

`listMemberships`, `getWorkspace`, `createWorkspace`, `listParties`, `getParty`, `createParty`, `listLedgers`, `listVouchers`, `getVoucher`, `postVoucher`, `previewVoucher`, `report`, `listBills`

### 8.3 Present on server, unused by client

`voucher-reverse`, `memberships` invite, `dimensions`, `period-locks`, `approvals`, `exports`, `workspace-item`, `party-create` (duplicate of parties POST)

### 8.4 Missing entirely

- Audit **list/read** API (only `company_audit_write` exists)
- Cost allocation write API
- Recurring / documents / cross-domain / org subscription APIs

---

## 9. Frontend page scorecard (honest)

| Page | Status | What it actually does |
|------|--------|----------------------|
| LoginPage | LIVE | Cloud login → company select |
| SelectCompanyPage | LIVE | Memberships hydrate / pick company |
| CreateCompanyPage | LIVE | 3-step wizard → `createWorkspace` → seed on server |
| DashboardPage | PARTIAL LIVE | KPIs from TB + day-book + bills + recent vouchers; links to stub pages |
| QuickReceivedPage | LIVE (bugs) | Loads parties/ledgers; client preview; `postVoucher` by purpose |
| QuickPaidPage | LIVE (bugs) | Re-export of same form (`direction=paid`) |
| QuickTransferPage | LIVE | Explicit CONTRA lines post |
| QuickJournalPage | LIVE | Explicit JOURNAL lines post |
| PartiesPage | STUB | Hardcoded `Sample Party`; Add party no handler |
| PartyDetailPage | STUB | Fake name for `p1`; zero balances |
| LedgersPage | STUB | Local `coaSeed` flatten — not DB |
| VouchersPage / Detail / New | STUB | Empty copy; APIs unused |
| Receivables / Payables | STUB | `ageingBuckets([])` → always ₹0 |
| ReportsHubPage | NAV ONLY | Links with wrong keys |
| ReportViewPage | STUB | No report fetch |
| Masters / Users / Settings / Audit / Export / Search | STUB | Disabled / empty |

---

## 10. Client services (unit-tested logic)

| Module | Role | Truth level |
|--------|------|-------------|
| `purposeEngine.ts` | Purpose catalogue + draft lines | Client mirror; **not** identical to PHP |
| `voucherBalance.ts` | ΣDr/ΣCr helpers | Shared math — good |
| `invariants.ts` | INV-01…10 structural checks | Test/helper mirror |
| `reportEngine.ts` | Pure TS TB/P&L/BS/ageing | Used in tests + empty AR/AP UI |
| `coaSeed.ts` | Default COA template | Display-only; codes diverge from PHP |
| `plainLanguageBalance.ts` | “they pay / you pay” wording | Utility |

**Tests:** `npm run company:test` → 29 tests across 6 files — all pure TS, **no HTTP**.

**Gates:** `company:gate:*` aliases all run the same file-existence + vitest gate — they do **not** specialize per domain.

---

## 11. Demo certification (what was proven on server)

**Script:** `php scripts/company/demo-certify.php`  
**Latest result:** ALL COMBINATION CHECKS PASSED (direct DB + posting helpers; not browser)

Covered scenarios:
- Create Company A + B + multi-role parties
- A Loan received (no P&L)
- B Farmer advance (not expense)
- C Settle advance (expense recognised)
- I Contra (no P&L change)
- G/H Bill full settle + partial + ageing on remaining
- Reversal of loan voucher
- TB balanced + BS balanced
- Tenant isolation (scoped queries)
- Over-allocation rejected
- Idempotent mutation replay
- Capital / Sale / Purchase / Drawing semantics
- Unbalanced journal rejected
- Final TB still balanced

**Not proven by demo:** browser UI, IDOR across sessions, role matrix, period-lock UI, export fidelity, approve→bill path.

---

## 12. Prioritized findings (current)

### P0 — correctness / user-blocking

1. **`OTHER` on Money Received posts as expense/payment** (`posting.php` OTHER case + QuickReceived catalogue)
2. **`PROPERTY_PAYMENT` always expense; FE profit-guard can block save**
3. **Reversal not atomic; NEW_REFERENCE bills not unwound**
4. **Default/ON_ACCOUNT bill allocation silent no-op**
5. **Parties UI fake — cannot create/list real parties from UI**
6. **Vouchers list/detail/new stubs — cannot browse/reverse from UI**

### P1 — product gaps / mismatches

7. FE ↔ PHP purpose catalogue drift (SALE, FARMING_*, PROPERTY_RECEIPT, REFUND, …)
8. Client preview ≠ server subledgers for party purposes
9. Report hub keys ≠ API report keys; ReportView not wired
10. Receivables/Payables always zero
11. Users/Settings/Audit/Export/Masters/Search stubs; no audit list API
12. `/company` bypasses personal lock/PIN gates
13. Client missing reverse / period-lock / approvals / exports / dimensions methods
14. Ledgers page shows fictional COA codes
15. Quick entry does not enforce `requiresParty` before submit (server 422)

### P2 — hardening / completeness

16. Schema-only tables unused (documents, recurring, cross-domain, org subscriptions)
17. Gate script aliases are cosmetic
18. Sensitive PIN permissions from matrix not implemented
19. Approve path does not re-check period lock / apply deferred bill allocations
20. No FK on reverse linkage columns
21. Performance / migration rollback / browser IDOR suites NOT RUN

---

## 13. Domain certification table (updated)

| Domain | Backend | UI | Unit | Demo/API script | Browser | Verdict |
|--------|:-------:|:--:|:----:|:---------------:|:-------:|---------|
| Workspace create + seed | Y | LIVE | — | PASS | NOT RUN | **PARTIAL** |
| COA live | Y | STUB | — | PASS | — | **PARTIAL** |
| Quick received/paid | Y | LIVE* | PASS | PASS | NOT RUN | **PARTIAL** (*purpose bugs) |
| Transfer / journal | Y | LIVE | PASS | PASS | NOT RUN | **PARTIAL** |
| Parties master | Y | STUB | — | PASS (direct insert) | — | **FAIL** (UI) |
| Voucher browser / reverse UI | Y | STUB | — | PASS reverse helper | — | **FAIL** (UI) |
| Bills / ageing UI | Y | STUB | PASS (TS) | PASS | — | **FAIL** (UI) |
| Reports UI | Y | STUB | PASS (TS) | — | — | **FAIL** (UI) |
| Period locks | Y | none | — | — | — | **PARTIAL** |
| Approvals | Y | none | — | — | — | **PARTIAL** |
| Exports | Y (minimal) | STUB | — | — | — | **FAIL** |
| RBAC | Y | hydrate only | — | — | NOT RUN | **PARTIAL** |
| Tenant isolation | Y (scoped SQL) | — | — | PASS demo | NOT RUN IDOR | **PARTIAL** |
| Personal isolation | mostly | shell | — | — | — | **PARTIAL** |

**Overall:** **NOT ACCOUNTING CORE CERTIFIED**

---

## 14. How each major user journey works today

### 14.1 Create & open books

1. UI Step 1–3 (`CreateCompanyPage`) collects name / FY / books start  
2. POST `workspace-create.php` → insert workspace → `company_seed_workspace`  
3. Store sets `activeCompanyId` → navigate dashboard  
4. If tables missing → SQLSTATE 42S02 (fixed once migration applied)

### 14.2 Money received (quick)

1. Load parties + ledgers  
2. Client builds preview lines via `mapPurposeToDraftLines`  
3. Optional profit guard using `purposeAffectsProfit`  
4. POST `voucher-post.php` with `purpose`, `amountPaise`, `cashBankLedgerId`, optional `partyId`  
5. Server rebuilds lines via `company_preview_purpose` (may differ from preview)  
6. Success toast with voucher id

### 14.3 Transfer

1. Load cash/bank ledgers  
2. Preview CONTRA via explicit from/to  
3. POST with `voucherType: CONTRA` + two lines (never uses purpose CONTRA)

### 14.4 Dashboard KPIs

1. Parallel fetch: trial-balance, day-book (today), bills AR, bills AP, vouchers  
2. Cash & Bank = sum of closing net for `CASH_IN_HAND` / `BANK_*`  
3. Received/Paid today from day-book voucher types  
4. Receivable/Payable = sum `outstanding_paise` on open bills  
5. Recent list from vouchers (month window via list API)

### 14.5 What users still cannot do in UI

- Real party CRUD  
- Browse / filter / open / reverse vouchers  
- See live AR/AP ageing  
- Open any formal report  
- Invite users / change roles  
- Lock periods / approve pending  
- Export packs  
- Search  
- Edit masters / dimensions  

Those APIs largely exist; pages do not call them.

---

## 15. Evidence snapshot (this pass)

| Check | Result |
|-------|--------|
| `php scripts/company/demo-certify.php` | PASS (all listed combinations) |
| `npm run company:test` | PASS (29) |
| `npm run company:gate:all` | PASS (9 file/vitest checks) |
| Browser E2E of every page | NOT RUN |
| HTTP IDOR / role matrix | NOT RUN |
| Migration rollback | NOT RUN |
| Statements strict gate (personal) | FAIL (pre-existing layouts) |

---

## 16. Recommended remediation order (for perfection)

1. Fix P0 posting semantics (`OTHER`, `PROPERTY_PAYMENT`, atomic reverse, bill ON_ACCOUNT, NEW_REFERENCE unwind)  
2. Wire Parties + Vouchers list/detail/reverse to existing APIs  
3. Align FE purpose catalogue + preview with PHP (or call `previewVoucher` and show server lines)  
4. Wire ReportView + fix hub keys; wire AR/AP to `ageing` / bills  
5. Add client methods + pages for period locks, approvals, exports, users  
6. Enforce PIN/lock on `/company`  
7. Add HTTP integration + browser scenario suite; only then reconsider certification label  

---

## 17. File map (quick reference)

```
docs/company/                          architecture + this audit
sql/migrations/20260923_company_core.sql
php/helpers/company/{bootstrap,ids,authz,seed,audit,posting,reports,exports}.php
php/controllers/company.php
api/company/*.php
scripts/company/{apply-migration,probe-db,fix-bill-tables,demo-certify,gate-*}.php|.mjs
src/company/
  CompanyApp.tsx, CompanyProviders.tsx, routes.ts
  api/client.ts, store/companyStore.ts
  services/{purposeEngine,voucherBalance,invariants,reportEngine,coaSeed,plainLanguageBalance}.ts
  services/__tests__/*
  pages/* (see §9)
  layout/*
```

---

*End of super audit. Label remains: NOT ACCOUNTING CORE CERTIFIED until P0 + core UI wiring + live API/browser evidence exist.*
