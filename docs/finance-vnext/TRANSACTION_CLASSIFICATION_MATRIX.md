# SparowVault vNext — Transaction Classification Matrix

Quick reference: does this movement count as income, consumption expense, cashflow, asset, liability, receivable, or obligation?

| User event | Transaction type | Income | Consumption expense | Cash out | Cash in | Asset | Liability | Receivable | Payable | Obligation |
|------------|------------------|--------|---------------------|----------|---------|-------|-----------|------------|---------|------------|
| Cash/bank expense | expense | — | Yes | Yes | — | — | — | — | — | — |
| CC purchase | expense + credit_card | — | Yes | — | — | — | Yes ↑ | — | — | — |
| CC bill pay | cc_payment | — | — | Yes | — | — | Yes ↓ | — | — | Due ↓ |
| Bank refund | refund (non-card) | — | Contra ↓ | — | Yes | — | — | — | — | — |
| Card refund | refund + credit_card | — | Contra ↓ | — | — | — | Yes ↓ | — | — | — |
| Self-transfer | transfer | — | — | Leg A ↓ | Leg B ↑ | — | — | — | — | — |
| Loan disbursement | loan_disbursement | — | — | — | Yes | — | Yes ↑ | — | — | — |
| Loan EMI | emi_payment | — | Interest/fees only | Yes | — | — | Principal ↓ | — | — | — |
| Udhari given | udhari_given | — | — | Yes | — | — | — | Yes ↑ | — | — |
| Udhari collect | udhari_collect | — | — | — | Yes | — | — | Yes ↓ | — | — |
| Investment buy | investment_contribution | — | — | Yes | — | Yes ↑ | — | — | — | — |
| Goal contribution | savings_contribution | — | — | Yes | — | Goal ↑ | — | — | — | — |
| Salary | income | Yes | — | — | Yes | — | — | — | — | — |
| Bad debt write-off | udhari_write_off | — | Yes | — | — | — | — | Yes ↓ | — | — |

**Legend:** Yes = increases that view; ↓ = decreases; Contra = reverses prior expense; Leg = one leg of transfer.

Implementation source: [`src/services/financeEventBuilder.ts`](../../src/services/financeEventBuilder.ts)
