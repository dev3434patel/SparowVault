# Classification guardrail report

Parent: LF-20260922-013706 · Child: LF-20260922-013706-DELTA-020111

## Finding

Direction defaults previously **pre-filled `kind`/`categoryId`/`scope`**, so bulk **Confirm selected** could approve unexplained UPI debits/credits as expense/income without an explicit purpose choice.

## Repair

| Cue | Behavior now |
|-----|----------------|
| Direction only (unknown narration) | `kind=""`, `suggestedKind` set, `proposalStrength=weak`, `reviewed=false` |
| Keyword / special-case (salary, Zomato, ATM, CC, loan, ONE97…) | May set `kind` as **strong suggestion**, still `reviewed=false` |
| Bulk confirm | Blocked for weak proposals via `canBulkConfirmDecision` |
| Economic reports | Bank debit/credit totals unchanged; income/expense only after reviewed+kind |
| API payload | `suggestedKind` / `proposalStrength` stripped before POST |

## Verified cases (unit)

- Unknown debit → weak expense candidate, not approved
- Unknown credit → weak income candidate, not approved  
- Loan disbursal → excluded, not income
- ATM → transfer suggestion
- Salary/Zomato → strong suggestion, unreviewed
- `reportEconomicMonth`: unresolved paise, zero income/expense until review

## Residual

User can still explicitly choose Income/Expense and mark Reviewed — that is intentional. Server still requires reviewed+kind+scope+category for include rows.
