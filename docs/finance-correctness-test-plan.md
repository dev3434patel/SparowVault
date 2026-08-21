# Finance Correctness Test Plan

> Living document. Every phase that touches a money path must add or update
> entries here BEFORE the code change is merged.

## 0. Principles

1. **Every rupee in the system must have a single source of truth.**
   - Income and expense are derived from `transactions`; account balances are
     a *projection*, not an authoritative independent number.
2. **Never double-count a flow.**
   - A `cc_payment` from a bank account is the bank's outflow AND the card's
     inflow against its outstanding balance — both must net to one transfer.
   - A `udhari_received` repayment must NOT also appear as `income`.
3. **Every aggregate must be filtered by the authenticated user.**
4. **Every formula must have an explicit fixture in `tests/fixtures/` that
   asserts the result and a `// why` comment.**
5. **Money is rupees today; the rule is "store with the precision you display
   with, and never compare floats with `===`".** A move to paise integers is
   tracked in the audit (B3) — until that lands, prefer `toBeCloseTo(_, 2)` in
   tests.

## 1. Categories of risk

| Risk                          | Example trigger                                   | How we detect                                              |
|-------------------------------|---------------------------------------------------|------------------------------------------------------------|
| Double-count                  | EMI counted both as `expense` and `emi_payment`   | Characterization test asserts `netMonthlySavings` formula  |
| Sign error                    | A refund credited as expense                      | `isIncomeTx` / `isCashInflow` unit tests                   |
| Cross-user leakage            | Aggregator forgets `WHERE user_id=?`              | SQL grep + per-user fixture isolation test (Phase 1)       |
| Time-zone drift               | Recurring rule materialised twice                 | Fixture-driven recurring test (Phase 1)                    |
| Rounding residue              | Amortization last row leaves ₹0.04                | Schedule-sum-equals-principal test (Phase 1)               |
| Period straddle               | Renewal at NOW() instead of `period_end`          | Subscription extension test (Phase 1)                      |

## 2. Required tests by surface

### 2.1 Calculation engine — `src/services/calculations.ts`
| Function              | Required tests                                          | Phase added |
|-----------------------|---------------------------------------------------------|-------------|
| `calculateEMI`        | 0% rate, 0 principal, 0 tenure, textbook P=100k r=12 n=24 | 0 (lock-in) |
| `amortizationSchedule`| sum of principal portions = principal; final row balance = 0 ± 1 paisa | 1 |
| `netMonthlySavings`   | income−expense−emi−cc−udhari_given matches formula      | 0 (lock-in) |
| `savingsRate`         | clamps to [-100, 999]; 0 income input                    | 0 (lock-in) |
| `projectMonthEndSpend`| day-1 multiplier = daysInMonth                           | 0 (lock-in) |
| `budgetStatuses`      | over / warn / projected-overrun thresholds               | 1           |
| `cardHealth`          | utilization buckets at 30 / 50 / 80                      | 1           |
| `goalProgress`        | on-track threshold 0.9 of pace                           | 1           |
| `healthScore`         | weights sum to 100; zero-income synthetic user           | 1           |

### 2.2 Sync — `api/cloud/sync/*.php`
- Push of a malformed JSON → 400.
- Push of >64 KB payload → 413 (Phase 1).
- Pull must NOT return soft-deleted rows.
- Pull from user A must never include rows owned by user B (per-user fixture test).

### 2.3 Subscriptions & payments
- Webhook with invalid signature → 401, no DB writes.
- Webhook replay (same `event_id`) → 200, no second write (idempotent).
- `provider_order_id` mismatched user → 403 + audit log row (Phase 1).
- Renewal before expiry extends from `current_period_end`, not `NOW()` (Phase 1).

### 2.4 Authorization
- Every `api/cloud/*` endpoint denies missing / expired / forged JWT.
- Every `api/admin/*` endpoint denies non-admin JWT.
- Role flipped in DB → next request reflects new role (claim-vs-DB drift test).

## 3. Fixture matrix

Each fixture under `tests/fixtures/users/` exercises one path:

| Fixture                       | Income | Expense | EMI | Card | Udhari | Goal | Budget |
|-------------------------------|:------:|:-------:|:---:|:----:|:------:|:----:|:------:|
| 01-cash-account               |        | ✅      |     |      |        |      |        |
| 02-bank-account               | ✅     | ✅      |     |      |        |      |        |
| 03-credit-card                |        | ✅      |     | ✅   |        |      |        |
| 04-personal-loan              |        |         | ✅  |      |        |      |        |
| 05-udhari-receivable          |        |         |     |      | ✅     |      |        |
| 06-udhari-payable             |        |         |     |      | ✅     |      |        |
| 07-goal                       |        |         |     |      |        | ✅   |        |
| 08-income-and-budgets         | ✅     | ✅      |     |      |        |      | ✅     |

Combine fixtures in tests via `import { allFixtures } from "tests/fixtures/users"`.

## 4. Manual verification rituals

Run before declaring any money-related phase complete:

1. `npm run test:calculations` — green.
2. Reset test DB, seed fixtures, open the app pointed at the test API.
3. For each fixture, eyeball the Dashboard against the values asserted in tests.
4. Print the `/api/cloud/sync/pull.php` response for user 08 and check that
   only user 08's rows are present.
5. Submit a Razorpay test webhook twice; confirm exactly one subscription
   update in `admin_audit_logs`.

## 5. Sign-off block (paste into the phase report)

> "I, {name}, ran the finance correctness test plan against branch
> `phase-{NN}-{slug}` on {YYYY-MM-DD}. All tests above either pass or are
> marked deferred with a target phase. No production data was touched."
