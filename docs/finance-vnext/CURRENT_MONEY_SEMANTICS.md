# SparowVault vNext — Current Money Semantics

| Field | Value |
|-------|-------|
| Generated | 2026-08-21 |
| Source of truth for effects | `src/services/financeEventBuilder.ts` |
| Source of truth for P&L views | `src/services/ledgerCalculations.ts` |
| Transaction types | `src/types/index.ts` → `TransactionType` |
| Status | **Describes current behaviour** — flags economic errors for vNext |

---

## How to Read This Document

For each money movement we document:

| Column | Meaning |
|--------|---------|
| User-facing transaction | What the user enters in UI |
| Financial event | `FinancialEvent.eventType` produced |
| Financial effects | Ledger postings (target × component × direction) |
| Cash impact | Bank/cash/wallet account effects |
| Expense impact | Consumption P&L (expense_category) |
| Income impact | Earned P&L (income_category) |
| Asset impact | Goals, investments, cash as asset |
| Liability impact | Credit cards, loans |
| Receivable/payable | Udhari |
| Net worth impact | Approximate Δ net worth |
| Budget impact | Category budget consumption |
| Obligation impact | Future due tracking |

**Effect notation:** `↑` = increase, `↓` = decrease, `—` = no effect, `⚠` = incorrect or incomplete in current code.

---

## 1. Cash Expense (UPI / bank / debit / wallet)

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=expense`, `paymentMode` ∈ {cash, upi, bank_transfer, debit_card, cheque, wallet, auto_debit, other}, `accountId`, `categoryId` |
| **Financial event** | `expense` |
| **Effects** | `account` cash ↓; `expense_category` expense ↑ |
| **Cash** | Source account ↓ |
| **Expense** | Category ↑ — **correct consumption expense** |
| **Income** | — |
| **Assets** | — |
| **Liabilities** | — |
| **Receivable/payable** | — |
| **Net worth** | ↓ (wealth consumed) |
| **Budget** | Category spend ↑ (from raw transactions) |
| **Obligation** | — |

**Status:** ✅ Correct for consumption expense.

---

## 2. Bank Expense

Same as §1 with `paymentMode=bank_transfer` or `auto_debit`. Semantics identical.

---

## 3. UPI Expense

Same as §1 with `paymentMode=upi`.

**vNext gap:** UPI is modeled only as `paymentMode`, not separated from funding instrument (e.g. UPI-on-credit-card).

---

## 4. Credit Card Purchase

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=expense`, `paymentMode=credit_card`, `linkedCardId`, `categoryId` |
| **Financial event** | `credit_card_purchase` |
| **Effects** | `credit_card` liability ↑; `expense_category` expense ↑; **no account cash effect** |
| **Cash** | — (bank unchanged) ✅ |
| **Expense** | Category ↑ at purchase date ✅ |
| **Income** | — |
| **Assets** | — |
| **Liabilities** | Card ↑ ✅ |
| **Net worth** | ↓ (expense recognized) ✅ |
| **Budget** | Category ↑ |
| **Obligation** | Implicit via card liability; no EMI plan entity |

**Status:** ✅ Core semantics correct (test: `ledger.scenarios.test.ts` #2).

**Missing:** Post-purchase EMI conversion, merchant EMI at checkout, limit block tracking.

---

## 5. Credit Card Payment (Bill Pay)

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=cc_payment`, `accountId`, `linkedCardId` |
| **Financial event** | `credit_card_payment` |
| **Effects** | `account` cash ↓; `credit_card` liability ↓ |
| **Cash** | Bank ↓ ✅ |
| **Expense** | — ✅ (not double-counted) |
| **Income** | — |
| **Liabilities** | Card ↓ ✅ |
| **Net worth** | — (asset↓ liability↓) ✅ |

**Status:** ✅ Correct.

**Missing:** Partial payment allocation, multiple payments per statement, autopay records, overpayment credit balance.

---

## 6. Card Refund

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=refund`, `paymentMode=credit_card`, `linkedCardId`, `categoryId` |
| **Financial event** | `refund` |
| **Effects** | `credit_card` liability ↓; `expense_category` expense ↓ |
| **Expense** | Contra original category ✅ |
| **Income** | — ✅ |

**Status:** ✅ Correct for card refunds.

**Missing:** Refund after bill paid (credit balance), refund during EMI plan adjustment.

---

## 7. Card Reversal

No distinct type. User would enter `refund` or delete transaction. No automatic issuer reversal linkage.

**vNext:** Needs `reversalOfEventId` workflow.

---

## 8. Transfer (Self-Transfer)

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=transfer`, `accountId` (from), `toAccountId` (to), amount |
| **Financial event** | `transfer` |
| **Effects** | From account cash ↓; to account cash ↑ |
| **Expense/Income** | — ✅ |
| **Net worth** | — ✅ |

**Status:** ✅ Atomic single event with two legs (test #7).

**Missing:** UTR/reference, fee as separate expense, transfer status, auto-match on import.

---

## 9. Cash Withdrawal

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | **No dedicated type.** User creates `type=transfer` from bank account → cash account |
| **Effects** | Bank cash ↓; cash account cash ↑ |
| **Expense** | — ✅ (if classified as transfer) |

**Status:** ⚠ **PARTIAL** — economically correct only if user maintains a cash account and uses transfer.

**vNext:** Dedicated intent "ATM withdrawal" with fee line item.

---

## 10. Cash Deposit

Same as §9 reversed: `transfer` from cash account → bank account.

**Status:** ⚠ PARTIAL — same constraint as withdrawal.

---

## 11. Loan Disbursement

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=loan_disbursement`, `accountId`, `linkedLoanId` |
| **Financial event** | `loan_disbursement` |
| **Effects** | `account` cash ↑; `loan` principal ↑ |
| **Income** | — ✅ |
| **Liabilities** | Loan ↑ ✅ |
| **Net worth** | ≈ unchanged at inception ✅ |

**Status:** ✅ Correct (test 4c).

---

## 12. Loan EMI Payment

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=emi_payment`, `accountId`, `linkedLoanId`, linked `EMIPayment` row |
| **Financial event** | `emi_payment` |
| **Effects** | Bank ↓ full EMI; loan principal ↓ (principal component); `expense_category` interest ↑ (and penalty/fee if present) |
| **Expense** | Interest + penalties/fees only ✅ |
| **Cash** | Full EMI leaves bank ✅ |

**Status:** ✅ Correct split when EMIPayment row exists (tests 4, 4b).

**Fallback:** Without EMIPayment row, entire amount treated as principal with `needs_review` flag.

---

## 13. Loan Principal (Prepayment)

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=loan_prepayment` |
| **Effects** | Bank ↓; loan principal ↓ |
| **Expense** | — (principal repayment not consumption) ✅ |

**Status:** ✅ Correct (test 4d).

---

## 14. Loan Interest

Recognized inside `emi_payment` as `interest` component on `expense_category`. Not a separate transaction type.

**Status:** ✅ Correct when EMI row provides split.

---

## 15. Udhari Given (Lent)

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=udhari_given`, `accountId`, `linkedUdhariId` |
| **Effects** | Bank ↓; `udhari_person` receivable ↑ |
| **Expense** | — ✅ |

**Status:** ✅ Correct (test 5).

---

## 16. Udhari Borrowed

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=udhari_received` |
| **Effects** | Bank ↑; `udhari_person` payable ↑ |
| **Income** | — ✅ |

**Status:** ✅ Correct (test 6).

---

## 17. Udhari Settlement — Collect

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=udhari_collect` |
| **Effects** | Bank ↑; receivable ↓ |
| **Income** | — ✅ |

**Status:** ✅ Correct (test 7b).

---

## 18. Udhari Settlement — Repay

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=udhari_repay` |
| **Effects** | Bank ↓; payable ↓ |
| **Expense** | — ✅ |

**Status:** ✅ Correct (test 7c).

---

## 19. Bad-Debt Write-Off

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=udhari_write_off`, `categoryId`, `linkedUdhariId` |
| **Effects** | Receivable ↓; `expense_category` expense ↑ |
| **Expense** | Bad debt expense ✅ |

**Status:** ✅ Correct (test 7c-2).

---

## 20. Investment Purchase

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=investment_contribution`, `linkedSavingsId` |
| **Effects** | Bank ↓; `investment` asset ↑ |
| **Expense** | — ✅ |

**Status:** ✅ Correct (test 7f). Covers bank→MF, bank→FD pattern if investment typed correctly.

**Missing:** Realized/unrealized gain split on redemption.

---

## 21. Investment Redemption

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=investment_sell` |
| **Effects** | Investment asset ↓; bank ↑ (full amount) |
| **Income** | — (no gain/loss split) ⚠ |

**Status:** ⚠ **PARTIAL** — cash and asset correct; gain/loss not separated.

---

## 22. Savings / Goal Contribution

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=savings_contribution`, `linkedGoalId` |
| **Effects** | Bank ↓; `goal` asset ↑ |
| **Expense** | — ✅ |

**Status:** ✅ Correct (test 7d).

---

## 23. Goal Withdrawal

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=goal_withdrawal` |
| **Effects** | Goal asset ↓; bank ↑ |
| **Income** | — ✅ |

**Status:** ✅ Correct (test 7e).

---

## 24. Reimbursement

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | **Not implemented** |

**vNext:** Expense + reimbursement receivable; settlement reduces receivable not income.

---

## 25. Refund (Bank / Cash — Non-Card)

| Dimension | Current behaviour |
|-----------|-------------------|
| **User transaction** | `type=refund`, `paymentMode` ≠ credit_card, `accountId`, `categoryId` |
| **Effects** | Bank ↑; **`income_category` income ↑** |
| **Expense** | — |

**Status:** ⚠ **WRONG for purchase refunds**

| Issue | Detail |
|-------|--------|
| Old behaviour | Full refund amount posted as income |
| Why wrong | Purchase refund is contra-expense or receivable settlement, not earned income |
| Correct behaviour | Link to original expense → `expense_category` ↓; or reimbursement receivable ↓ |
| Migration | Rebuild effects for historical `refund` txs; user review queue for unlinked |
| Compatibility | Card refunds already correct; only non-card path affected |
| Tests needed | Bank refund full/partial; must not appear in income report |

**Code:** `financeEventBuilder.ts` lines 192–201.

---

## 26. Cashback / Rewards

No dedicated type. Would be entered as `income` or negative `expense` manually.

**vNext:** Policy-driven: contra_expense | other_income | card_credit.

---

## 27. Fees & Taxes

Partially via EMI `fee`/`penalty`/`tax` components on loan EMI. Card interest/fees not modeled separately from purchases.

---

## 28. Recurring Bills

| Dimension | Current behaviour |
|-----------|-------------------|
| **Entity** | `recurringRules` generates/reminds; not a separate obligation ledger |
| **Expense recognition** | When user posts `expense` transaction |
| **Obligation** | Due dates in reminders/alerts; no bill vs payment split |

**Status:** ⚠ Basic recurring; not unified obligation engine.

---

## 29. Card EMI (Post-Purchase Conversion)

| Dimension | Current behaviour |
|-----------|-------------------|
| **Support** | **NONE** |

Purchases stay as regular card liability until paid. No:
- EMI plan entity
- Principal/interest billing split on card
- Conversion without second expense
- Schedule override from issuer

**vNext Phase E** — full lifecycle required.

---

## 30. KPI Semantics (Dashboard)

| KPI label (UI) | Current calculation | Economic meaning | vNext name |
|----------------|---------------------|------------------|------------|
| Income | Ledger `income_category` effects OR `sumIncome(txs)` | Mixed — includes non-card refunds as income in fallback | **True income** |
| Expense | Ledger expense view OR `sumExpense(txs)` | Mostly consumption; excludes cc_payment ✅ | **Consumption expense** |
| Net savings | income − expense (dashboard) | Conflates operating surplus with asset moves | **Operating surplus** |
| Net savings (alerts) | `netMonthlySavings()` = income − expense − emi − cc_payment − udhari_given | Different formula than dashboard | ⚠ Inconsistent |
| Money left | `cashflowSurvivalEngine` disposable | Liquidity planning | **Free cash** |
| Safe daily spend | disposable / days | Liquidity planning ✅ | Keep |
| Net worth | Assets − liabilities (partial) | Incomplete for investments/market value | **Net worth** |

---

## 31. View Matrix (Current vs Required)

| View | Current support | Gap |
|------|-----------------|-----|
| A — Income | Ledger income_category | Bank refunds pollute; loan proceeds excluded ✅ |
| B — Consumption expense | Ledger expense_category | Savings/investment excluded ✅; card EMI interest not modeled |
| C — Cash movement | Account cash effects | Available via ledger; not separate dashboard |
| D — Debt/liability | Card + loan engines | No card EMI sub-ledger; credit balance hidden |
| E — Assets | Goals, investments, accounts | No property/gold valuation history |
| F — Obligations | recurringRules + EMI due dates | No unified obligation entity |

---

## 32. Payment Channel vs Funding Instrument

| Field today | Values | Problem |
|-------------|--------|---------|
| `paymentMode` | cash, upi, bank_transfer, credit_card, debit_card, wallet, … | Cannot express "UPI paid with credit card" |

**vNext:** Split into `paymentChannel` + `fundingInstrument`.

---

## 33. Data Provenance

| Field | Current |
|-------|---------|
| Transaction source | Not systematically stored |
| Ledger source | `FinancialEvent.source`: transaction \| backfill \| manual |
| Import row hash | Partial in import flow |

**vNext:** Full provenance on all financial records.

---

## 34. Known Economic Bugs Summary

| ID | Issue | Severity | Phase |
|----|-------|----------|-------|
| ECON-001 | Bank refund → income instead of contra-expense | High | B |
| ECON-002 | `INCOME_TYPES` includes refund | Medium | B |
| ECON-003 | Card outstanding clamped at zero | Medium | D |
| ECON-004 | No card EMI lifecycle | Critical | E |
| ECON-005 | Investment sell — no gain/loss split | Low | H |
| ECON-006 | KPI "Net savings" ambiguous | Medium | B |
| ECON-007 | `netMonthlySavings` ≠ dashboard net | Medium | B |
| ECON-008 | Budget spend from transactions not ledger | Low | B |
| ECON-009 | paymentMode conflates channel/instrument | Medium | B/C |

---

## 35. Migration Impact Preview (No Changes Made)

When fixing ECON-001:

1. Backfill `financial_effects` for non-card refunds via reverse+apply.
2. Run checksum script per user (see `BASELINE_TEST_RESULTS.md`).
3. Income reports may **decrease**; expense reports may **decrease** (contra); net P&L unchanged.
4. Users with refunds classified as salary/income need review queue.

---

## 36. Test Coverage Cross-Reference

| Scenario | Test file | Pass |
|----------|-----------|------|
| CC purchase | ledger.scenarios #2 | ✅ |
| CC payment | ledger.scenarios #3 | ✅ |
| CC refund | ledger.scenarios #3b | ✅ |
| Transfer | ledger.scenarios #7 | ✅ |
| Loan disbursement | ledger.scenarios #4c | ✅ |
| EMI split | ledger.scenarios #4 | ✅ |
| Udhari full cycle | ledger.scenarios #5-7c-2 | ✅ |
| Investment | ledger.scenarios #7f-7g | ✅ |
| Bank refund | — | ❌ Missing |
| Card EMI | — | ❌ Missing |
| Overpayment | — | ❌ Missing |

---

## 37. References

```
src/services/financeEventBuilder.ts    — effect builder
src/services/ledgerCalculations.ts     — P&L views from effects
src/services/calculations.ts           — transaction rollups, netMonthlySavings
src/services/cardEngine.ts             — card liability views
src/services/loanEngine.ts             — loan amortization
src/store/dataStore.ts                 — in-memory ledger rebuild
php/helpers/finance_events.php         — server-side ledger persistence
src/services/__tests__/ledger.scenarios.test.ts
```
