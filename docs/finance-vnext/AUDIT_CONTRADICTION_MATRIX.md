# SparowVault vNext — Audit Contradiction Matrix

| Field | Value |
|-------|-------|
| Generated | 2026-08-21 |
| Purpose | Reconcile older audits vs latest inventory vs **actual current code** |
| Rule | An older audit issue is **not active** until current code confirms it |

Legend for **Action** column:

- **RESOLVED** — fixed in code; remove from active risk list
- **PARTIAL** — improved but not complete
- **CONFIRMED** — still true in current code
- **NEW GAP** — not in older audits but required for vNext
- **VERIFY DEPLOY** — code may be fixed; production/staging must be checked

---

## Matrix

| Subject | Older audit (MVP `AUDIT_REPORT_MVP.html`, 2026-05-12) | Latest inventory (`PROJECT_AUDIT_FULL.md`, 2026-05-14) | Actual current code (2026-08-21) | Action |
|---------|------------------------------------------------------|--------------------------------------------------------|----------------------------------|--------|
| JWT stored in `localStorage` | Critical — token in localStorage, XSS exfiltration risk | Bearer JWT in Authorization header | `set_auth_cookie()` httpOnly cookie; `apiClient.ts` **removes** legacy tokens from localStorage; requests use `credentials: "include"` | **RESOLVED** (client auth transport) |
| JWT refresh / short-lived access | High — 7-day bearer in localStorage | Same | Still 7-day cookie expiry; no refresh token rotation | **PARTIAL** — cookie mitigates XSS but long session remains |
| CSRF protection | Recommended when moving to cookies | Not mentioned | No CSRF token/header found on mutating API calls | **CONFIRMED** — needed with cookie auth |
| Example JWT secret in hosting bundle | Critical — `.env.host` contains example secret | Not re-checked | Not re-verified in this pass; `jwt_secret()` throws if `CLOUD_JWT_SECRET` empty | **VERIFY DEPLOY** — strip template secrets before ship |
| HTTPS / security headers | High — no HSTS/CSP in `.htaccess` | Not detailed | `.htaccess` exists; header set depends on hosting | **VERIFY DEPLOY** |
| Webhook updates subscription by order_id only | Critical — no ownership check | Phase 1 tightened | `payments.php` looks up `(provider_order_id, user_id)`; amount/currency validation; idempotent `event_id` | **RESOLVED** |
| Self-service data export / account delete | Critical — missing | Phase 13+ | `php/controllers/account.php` export/delete endpoints exist | **RESOLVED** |
| Dexie-first vs cloud-first writes | MVP implied local-first | "Frontend writes to Dexie first, then queues push" | `BaseRepo.create()` **cloud-first**; local mirror on success; local-only fallback on cloud failure | **CONTRADICTION** — inventory outdated; code is **cloud-first hybrid** |
| Paise integer normalization | Not in MVP HTML | Phase 3 complete | `money.ts`, `moneyEntityNormalize.ts`, `money_paise.php`, migration `phase_03_cloud_amount_paise.sql`, 20+ unit tests | **RESOLVED** |
| Financial ledger (event/effect) | Not in MVP | Phase 5 — source of truth | `financeEventBuilder.ts` + `ledgerCalculations.ts` + SQL tables; 20 ledger scenario tests | **RESOLVED** (core flows) |
| CC purchase doesn't reduce bank | Not explicit in MVP | Documented | Ledger: liability↑ expense↑, no cash decrease — **tested** | **RESOLVED** |
| CC payment is not expense | Not explicit | Documented | Ledger: cash↓ liability↓, no expense — **tested** | **RESOLVED** |
| Card EMI lifecycle | Not in MVP | Not implemented | **No** `cardEmiPlan`, `cardEmiInstallment`, or conversion transaction type | **NEW GAP** — vNext Phase E |
| Card credit balance (overpayment) | Not mentioned | Not mentioned | `calculateCardOutstanding()` uses `Math.max(0, bal)` — negative liability hidden | **NEW GAP** |
| Payment channel vs funding instrument | Not mentioned | Single `paymentMode` field | Still single `PaymentMode` enum conflates UPI channel with credit funding | **NEW GAP** — vNext §7 |
| Net savings KPI ambiguity | Not named | "Net savings" on dashboard | Dashboard uses ledger income−expense when ledger exists; still labeled "Net savings"; `netMonthlySavings()` used in alerts | **PARTIAL** — vNext §3 |
| Intent-based Quick Add | Not mentioned | Type picker (income/expense/…) | `TransactionForm` + `transactionFormRules.ts` — type-first, not intent-first | **NEW GAP** — vNext §4–6 |
| Household / family mode | Not mentioned | Personas only (individual) | No `household` entity, roles, or consolidation | **NEW GAP** — vNext Phase G |
| Unified obligations engine | Bills via recurringRules | recurringRules + reminders | `recurringRules` exists; no normalized obligation statuses/bill/payment split | **NEW GAP** — vNext Phase F |
| Reconciliation center | Not mentioned | Card repair queue | `buildCardRepairQueue()` only — no transfer matching, statement reconcile | **NEW GAP** — vNext §89 |
| Sync outbox visibility | Not mentioned | Push on boot | No user-visible `pending/syncing/failed` for financial writes | **NEW GAP** — vNext §101 |
| AI invents financial numbers | Not in MVP | Guardrails Phase 10–11 | `aiGuardrails.test.ts`, suggestion engine uses deterministic inputs | **RESOLVED** (by design) |
| Server/client collection allowlists | Not in MVP | syncContracts | `syncContracts.ts` + generated JSON + PHP allowlist + drift test | **RESOLVED** |
| Loan disbursement ≠ income | Not explicit | Documented | Ledger tested — cash↑ loan principal↑, no income | **RESOLVED** |
| Udhari repayment ≠ income | Not explicit | Documented | `udhari_collect` — cash↑ receivable↓, no income — **tested** | **RESOLVED** |
| Investment purchase ≠ expense | Not explicit | Documented | `investment_contribution` — asset transfer — **tested** | **RESOLVED** |
| Bank refund = income (wrong) | Not flagged | Not flagged | Non-card `refund` posts `income_category` increase | **CONFIRMED BUG** — vNext Phase B |
| Cash withdrawal type | Not mentioned | Use transfer | No dedicated type; transfer bank→cash works if accounts exist | **PARTIAL** — semantics OK via transfer |
| Phase gates all green | N/A | 18/18 local (May 2026) | Unit tests 247/247 pass today; full `phase:all:gates` not re-run in this session | **VERIFY** — re-run before release |
| Admin role from DB not JWT claim | MVP confirmed good | Same | `auth_require_admin()` pattern in PHP | **RESOLVED** (assumed unchanged) |
| Generic cloud store vs specialized tables | Not in MVP | JSON + shadow tables | Entities in `cloud_collection_rows`; ledger in `financial_events/effects`; cards/loans/udhari shadow tables | **CONFIRMED** — dual model; needs reconciliation test (vNext §99) |

---

## Contradictions Requiring Documentation Updates

1. **`PROJECT_AUDIT_FULL.md` §2.3** says Dexie-first — **update to cloud-first hybrid** per `baseRepo.ts`.
2. **`PROJECT_AUDIT_FULL.md` §2.4** describes JWT in Authorization header as primary — **update to httpOnly cookie** with credentials.
3. **MVP audit A3 (localStorage JWT)** — mark **resolved**; retain CSRF as follow-up.
4. **MVP audit webhook ownership (E-series)** — mark **resolved** per `payments.php`.

---

## Active Issues Carried Forward to vNext

Priority order for implementation planning:

| Priority | Issue | Phase |
|----------|-------|-------|
| P0 | Bank refund misclassified as income | B |
| P0 | Card EMI engine missing | E |
| P0 | KPI semantics (operating surplus vs liquid change) | B |
| P1 | Payment channel / funding instrument split | B/C |
| P1 | Card credit balance (overpayment) | D |
| P1 | Intent-based Quick Add | B/C |
| P1 | CSRF for cookie auth | L (security) |
| P2 | Unified obligations | F |
| P2 | Reconciliation center | I |
| P2 | Sync outbox UI | I |
| P2 | Household model | G |
| P3 | Hosting bundle secret scrub | L |

---

## Evidence Files

| Claim | Primary file |
|-------|--------------|
| httpOnly cookie | `php/helpers/auth.php:113-120` |
| localStorage cleanup | `src/lib/apiClient.ts:19-28` |
| Cloud-first create | `src/repositories/baseRepo.ts:80-92` |
| Webhook ownership | `php/controllers/payments.php:12-24` |
| Ledger CC payment | `src/services/__tests__/ledger.scenarios.test.ts:117-133` |
| Refund income bug | `src/services/financeEventBuilder.ts:192-201` |
| No card EMI | grep `cardEmi` → no matches |
| Card balance clamp | `src/services/cardEngine.ts:41` |
