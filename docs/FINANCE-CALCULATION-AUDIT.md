# Finance Calculation Audit

## Update - 11 September 2026

See the [fresh calculation results](FULL-PROJECT-AUDIT-2026-09-11.md#7-finance-calculation-audit): core contribution semantics pass, but CA exports still misclassify cash credits and have other confirmed financial defects. Earlier sections below are historical and must not be treated as current certification.

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## Scope and accounting boundary

This is a software-consistency audit, not tax, investment or accounting signoff. The brief expects agency accrual/GST/partner accounting; SparowVault mainly implements personal cash/debt/goal accounting. Currency is predominantly INR with paise integer normalization, alongside legacy rupee fields. Never equate a transfer, loan disbursement, card payment or capital contribution with revenue/expense without the intended ledger classification.

| # | Required agency calculation | Status | Source / test conclusion |
| --- | --- | --- | --- |
| 1 | Project GST calculation | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 2 | No GST mode | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 3 | Including GST mode | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 4 | Excluding GST mode | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 5 | CGST/SGST calculation | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 6 | IGST calculation | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 7 | Invoice line-item GST | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 8 | Invoice discount | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 9 | Invoice round-off | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 10 | Invoice grand total | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 11 | Amount in words | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 12 | Quotation pricing | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 13 | Package pricing | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 14 | Payment received | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 15 | Verified paid amount | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 16 | Pending payment | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 17 | Remaining amount | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 18 | Approved expenses | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 19 | Paid expenses | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 20 | Admin charges | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 21 | Admin usage | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 22 | Net profit | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 23 | Distributable profit | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 24 | Retained reserve | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 25 | Cash profit | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 26 | Cash eligible payout | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 27 | Blocked payout | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 28 | Partner payable | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 29 | Partner paid | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 30 | Partner pending | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 31 | Partner allocation snapshot | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 32 | Partner payout validation | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 33 | Company balance | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 34 | Free available balance | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 35 | GST collected | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 36 | GST paid | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 37 | GST pending | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 38 | Input GST if any | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 39 | Receivable aging | Udhari analogue exists; canonical field test fails (B17). | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 40 | Subscription due status | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 41 | Budget actual | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 42 | Budget variance | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 43 | Vendor ledger totals | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 44 | CA export totals | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 45 | Report totals | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 46 | Dashboard KPI totals | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |

## Actual calculation engines

| Domain | Source | Intended rule / inputs | Verification and risk |
| --- | --- | --- | --- |
| Money conversion | [src/utils/money.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/money.ts>) | Rupees <-> integer paise, deterministic decimal parsing and rounding | F01/F02 and money unit tests pass for tested cases; safe-integer boundaries and every imported legacy representation need explicit coverage. |
| Account balance | [src/services/accountBalanceEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/accountBalanceEngine.ts>) | Opening paise plus signed cash/account effects | Engine tests exist; CA net-worth helper ignores opening balance (F04), so engine correctness does not establish end-to-end report correctness. |
| Ledger classification | [src/services/financeEventBuilder.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financeEventBuilder.ts>) | Transaction intent generates events and effects for cash, debt, income, expense and assets | Golden, scenario, fuzz and invariant tests exist; SQL/TS implementation parity and atomic persistence remain blockers. |
| Canonical KPIs | [src/services/financeKpiEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financeKpiEngine.ts>) | Separates true income/consumption/cashflow/debt effects | Unit tests pass; dashboard uses fallback context when no events; cross-period/report/export parity needs strengthening. |
| Legacy aggregates | [src/services/calculations.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/calculations.ts>) | sumIncome/sumExpense, cash/balance/card/loan helper aggregations | Raw expense aggregate fails net-refund expectation in annual export (F15); call-site definitions are inconsistent. |
| Business/personal allocation | [src/services/businessPersonalSplit.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/businessPersonalSplit.ts>) | Allocation components should be nonnegative and sum exactly to transaction total | 14443 percentage cases conserve; explicit oversized personal split fails (F07). Workbook duplicates allocation logic and fails F16. |
| Loan EMI | [src/services/loanEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/loanEngine.ts>) | Installment calculation, principal/interest allocation and schedule | Zero APR EMI example passes F03. Existing tests cover additional scenarios; issuer-specific fees, prepayment policy and all rate/tenure limits are not certified. |
| Loan/payment coupling | [src/services/loanPaymentSync.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/loanPaymentSync.ts>) | Reconciles EMI/loan payment representations | Requires atomic lifecycle tests with repository and server, not only arithmetic helper tests. |
| Credit card debt | [src/services/cardEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardEngine.ts>) | Card-specific outstanding and statement/payment relationships | Four-card isolation and refund/EMI matrices exist and pass within unit scope. Actual issuer statement reconciliation not performed. |
| Card statements | [src/services/cardStatementEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardStatementEngine.ts>) | Statement windows, billed/unbilled and due calculations | Timezone, statement-day 28-31, leap day and imported authoritative statements need end-to-end cases. |
| Card payment allocation | [src/services/cardPaymentAllocator.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardPaymentAllocator.ts>) | Allocates payment to card obligations | Existing debt tests are useful; concurrency, overpayment, reversals and duplicate payment persistence need API parity. |
| Card EMI | [src/services/cardEmiEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardEmiEngine.ts>) | Plan/installment principal, interest, tax, fee and lifecycle | T126/precision/refund unit suites exist; not a certification of bank contractual calculations. |
| Issuer schedule precedence | [src/services/issuerSchedulePrecedence.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/issuerSchedulePrecedence.ts>) | Chooses imported/issuer schedules over generated estimates where available | Unit tests exist; imported schedule round-trip and provenance UI require tests. |
| Udhari | [src/services/udhariEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/udhariEngine.ts>) | Amount less settlements; receivable/payable lifecycle | Core tests pass; CA helper uses different fields and fails F05. Separate invoice ageing is absent. |
| Goals | [src/services/goalEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/goalEngine.ts>) | Progress/funding recommendations from target/contributions/time | Unit tests exist; durable linked cash movements, edits and deletion after contribution need integrated proof. |
| Obligations | [src/services/obligationEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/obligationEngine.ts>) | Upcoming bill/obligation projections | Unit tests exist; no verified scheduling/delivery/autopay service. |
| Sinking fund | [src/services/sinkingFundEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/sinkingFundEngine.ts>) | Funding requirements for upcoming liabilities | Pure helper coverage only; contribution allocation and cross-collection writes need end-to-end tests. |
| Budget intelligence | [src/services/smartBudgetEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/smartBudgetEngine.ts>) | Personal category actuals, limits and recommendation allocation | Unit tests present; agency project/vendor budget and approvals absent. |
| Cashflow survival | [src/services/cashflowSurvivalEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cashflowSurvivalEngine.ts>) | Cash available through next-income horizon and scheduled obligations | Personal forecast, not company distributable cash or GST reserve. Forecast assumptions need user-visible provenance. |
| Emergency fund | [src/services/emergencyFundEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/emergencyFundEngine.ts>) | Liquidity/resilience recommendations | Not verified financial advice; scope is software consistency. User risk preferences and forecast uncertainty remain inputs. |
| Report summaries | [src/services/caReports.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/caReports.ts>) | Transaction/category/account/card reports, debt, ageing, cost and reconciliation | F04-F06/F14 fail; 90.93 percent measured line coverage does not catch these semantic defects. |
| Workbook aggregation | [src/exports/xlsxExporter.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/exports/xlsxExporter.ts>) | Maps rows and composes multiple financial sheets | F09-F12/F15-F16 fail; period context, duplicate names, text money and allocation/reversal semantics need fixes. |
| Reconciliation matching | [src/services/reconciliationEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/reconciliationEngine.ts>) | Imported sources and matching logic | Matching helpers exist; independent statement evidence and trusted final status are incomplete (F14). |
| Financial checksum | [src/services/financialChecksum.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financialChecksum.ts>) | Consistency/checksum support | A checksum can detect differences only for included canonical data; incomplete backups or mutable audit cannot be certified by labeling. |
| Suggestions/personas | [src/services/suggestionEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/suggestionEngine.ts>) | Deterministic thresholds and prioritized recommendations | Unit tests exist. No autonomous transfers, tax filing or partner payout approval should be inferred. |

## Reproducible arithmetic/export probes

All probes call existing source functions with synthetic data. Money amounts below are paise unless the probe explicitly examines workbook rupee values. Four assertions pass and twelve fail; the 14443 percentage-allocation cases are one property-test assertion, not 14443 additional unit tests.

| ID | Check | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| F01 | exact rupee rounding half up | 101 | 101 | PASS |
| F02 | negative rounded amount when expressly allowed | -101 | -101 | PASS |
| F03 | zero rate EMI | 10000 | 10000 | PASS |
| F04 | net worth includes account opening balance | 100000 | 0 | FAIL |
| F05 | ageing reads canonical amount/date/direction | {"outstandingPaise":40000,"direction":"received","ageDays":252} | {"outstandingPaise":0,"direction":"given","ageDays":0} | FAIL |
| F06 | reversed financing cost nets to zero | 0 | 20000 | FAIL |
| F07 | invalid oversized personal split cannot create negative business amount | true | false | FAIL |
| F08 | percentage split conservation across 14443 cases | 0 | 0 | PASS |
| F09 | CA workbook monthly summary respects transaction date filter | ["2026-09"] | ["2026-08","2026-09"] | FAIL |
| F10 | Excel master monetary cells are numeric | "n" | "s" | FAIL |
| F11 | two loans with same lender export successfully | null | "Worksheet with name \|Amort_Same_Bank\| already exists!" | FAIL |
| F12 | CSV formula-like description neutralized | false | true | FAIL |
| F13 | full backup retains current card EMI and household collections | true | false | FAIL |
| F14 | no external statement balance is not certified matched | false | true | FAIL |
| F15 | annual expense is net of refund | 60 | 100 | FAIL |
| F16 | workbook allocates mixed expense to business and personal | {"Business":60,"Personal":40} | {"Business":0,"Personal":0} | FAIL |

Detailed fixture: [finance-probes.json](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>). Generated workbook: [finance-period-fixture.xlsx](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-period-fixture.xlsx>). Browser-downloaded workbook: [browser-ca-export.xlsx](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-ca-export.xlsx>). The first finance attempt used an incorrect long-sheet-name lookup; it is retained separately and is not a product failure.

## Performance observation

| Synthetic transactions | Pure ledger-building wall time | Results |
| --- | --- | --- |
| 1000 | 16 ms | 1000 |
| 10000 | 150 ms | 10000 |
| 25000 | 508 ms | 25000 |

These are one-machine pure-function timings (1000/10000/25000 records), not database throughput, API latency, browser rendering, peak memory or SLA/load certification. Export generation, large-table filtering, concurrent SQL writes, network latency and low-end devices still require measurement.

## Invariants required before finance release

1. Persist each logical mutation exactly once across retries; entity, linked effects and audit commit together.
2. Every amount is a bounded integer paise value; conversion happens only at display/import boundaries.
3. Signed effects conserve the intended movement; pure transfers do not increase total wealth or become expense.
4. Refunds/reversals reduce the correct original category/debt/tax/fee components without touching another card/account.
5. Opening + movement = closing for each account and period; an absent external statement never becomes matched.
6. All report entry points use the same period, timezone, lifecycle status and canonical definitions.
7. Business + personal + explicitly unallocated = total, with no negative components unless a documented reversal carries the sign.
8. A full backup/restore round-trip preserves every supported collection and linked identifier.
9. Cross-user or nonexistent financial references are rejected, while valid historical references remain explainable.
10. Agency invoices/GST/partner distributions require new canonical specifications and independent accountant-approved golden cases before implementation can be certified.

## Requested edge-case matrix

This inventory does not claim these combinations were all executed. It preserves every calculation-combination request from the brief. Agency cases without an implemented model are blocked by feature absence, not passed. Personal analogues must still be exercised through API/UI/persistence rather than inferred from one helper.

| Case | Current execution status | Required proof |
| --- | --- | --- |
| No GST | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Including GST 18% | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Excluding GST 18% | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| 0% GST | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Decimal GST amount | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Inter-state IGST | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Intra-state CGST/SGST | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Client without GSTIN | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Seller without GSTIN | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Mixed GST line items | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Discount before GST | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Discount after GST if supported | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Round-off positive | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Round-off negative | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| No payment | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Partial payment | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Multiple payments | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Full payment | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Overpayment | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Cancelled payment | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Reversed payment | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Pending payment | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Verified payment | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Payment after month close | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Payment linked to invoice | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Payment without proof | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Draft expense | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Submitted expense | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Approved expense | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Rejected expense | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Paid expense | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Reversed expense | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| High-value expense | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Expense with GST | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Expense without GST | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Expense in closed month | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Expense linked to vendor | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Expense linked to cost center | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| 50/50 split | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| 60/40 split | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| 3 partners | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Share total below 100% | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Share total above 100% | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Partner inactive | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Share change after approved project | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Payout more than pending | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Payout more than cash eligible | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Payout after month close | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Payout without proof | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| No data | Fresh-user UI sampled; formula assertions still case-specific | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Only income | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Only expenses | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Negative free cash | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| High GST pending | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Large pending receivable | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Paid partner payout | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Pending partner payout | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Subscription due | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Closed month | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Date range with data | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Date range without data | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Financial year | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Month | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Quarter | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Client filter | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Project filter | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Partner filter | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| GST filter | Agency path absent / not executable | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Export all | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
| Export selected sections | Not individually demonstrated by this audit; some personal helper analogues covered by unit suites | Versioned fixture, expected ledger/journal and tax components, UI/report/export equality, durable API state and authorization. |
