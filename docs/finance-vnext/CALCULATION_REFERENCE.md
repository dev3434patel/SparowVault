# SparowVault vNext — Calculation Reference (Phase B)

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Phase | B |

## trueIncome

- **Purpose:** Genuine earned/received income for the period.
- **Inputs:** `FinancialEvent[]`, `FinancialEffect[]`, year, month (1–12).
- **Formula:** `sum(income_category effects where component=income, direction=increase)` in month.
- **Units:** Integer paise.
- **Rounding:** None (integer sum).
- **Zero case:** 0 when no income effects.
- **Fallback:** `sumIncome(transactions)` excluding refunds when ledger empty.
- **Test:** `src/services/__tests__/financeKpiEngine.test.ts`
- **Engine:** `calculateIncomeView` / `financeKpiEngine.calculateFinanceMonthKpis`

## consumptionExpense

- **Purpose:** Actual economic spending including financing charges.
- **Formula:** `sum(expense_category effects where component ∈ {expense, interest, fee, penalty, tax})`.
- **Excludes:** Card bill payment, loan principal, transfers, investments.
- **Test:** `financeKpiEngine.test.ts`, `ledger.scenarios.test.ts`
- **Engine:** `calculateExpenseView`

## operatingSurplus

- **Purpose:** Money generated before reallocating among assets/liabilities.
- **Formula:** `trueIncome − consumptionExpense`
- **Test:** `financeKpiEngine.test.ts`
- **Engine:** `financeKpiEngine.calculateFinanceMonthKpis`

## netLiquidChange

- **Purpose:** Change in bank/cash account balances in period.
- **Formula:** `cashInflow − cashOutflow` on account cash effects in month.
- **Engine:** `calculateNetLiquidChangeView`

## debtPrincipalRepaid

- **Purpose:** Wealth rebuilding via principal reduction (not consumption).
- **Formula:** `sum(principal decreases on loan and credit_card targets in month)`
- **Engine:** `calculateDebtPrincipalRepaidView`

## financingCost

- **Purpose:** Interest, fees, penalties, taxes in P&L.
- **Formula:** `sum(expense_category interest|fee|penalty|tax components in month)`
- **Engine:** `calculateFinancingCostView`

## operatingSurplusRate

- **Formula:** `round(operatingSurplus / trueIncome × 100, 2)`; 0 if income is 0.
- **Engine:** `operatingSurplusRate`

## netWorth (consolidated)

- **Formula:** `sum(account closing cash) + investments + receivables − card liability − loan principal − payables`
- **Engine:** `calculateConsolidatedNetWorthPaise`

## Bank refund (vNext fix)

- **Old:** Bank refund → income_category increase.
- **Correct:** Bank refund → account cash increase + expense_category decrease (contra-expense).
- **Test:** `ledger.scenarios.test.ts` case 3c, `financeKpiEngine.test.ts`
