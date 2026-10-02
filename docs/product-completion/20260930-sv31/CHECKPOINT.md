# Closure checkpoint — 2026-09-30

Personal money stays in IndexedDB. Company money stays in posted PHP vouchers. This note does not call the product 100% complete.

| Area | What a person can do now | Evidence |
| --- | --- | --- |
| Permissions | Missing, loading, or empty permissions deny. Reopen and opening balances are separate from a PIN. Party, dimension, allocation, and modules writes stay behind their keys. Payroll approval, accrual, and payment require `create_journal`. | `companyCan` tests, `roleEndpoint.php`, `phaseSvPure.php` |
| Routes and flags | Subscription stays on its page when Razorpay is off. Mobile More and the command palette reach the extra personal routes. An explicit off flag blocks new goal, investment, udhari, import, and recurring creates. | `modulePolicy` tests |
| Categories, transfers, reconciliation | Parent totals count a transaction once. A new transfer also writes `transferLinks` for that same transaction. Confirm, reject, and unmatch write `reconciliationMatches`. | `wavePersonalMath` tests |
| Alerts | Each of the six switches affects only its family. | `wavePersonalMath` and `alertPreferences` tests |
| Reservations and bills | Envelopes are their own screen. Reserved money does not change bank cash. Weekly, quarterly, and yearly rules project as dues. Card, EMI, udhari, and insurance dues save as obligations and do not post expenses. Reminders can be created, snoozed, and completed in the app. | `reservationMath`, `obligationEngine` tests (19 with household) |
| Cards and household | EMI save writes a plan and installments and does not post a purchase. A signed-in Cards pass saved “Local Card”, shared limit “Household cards” at 8000000 paise, a ₹3,000 purchase, a ₹1,000 bill payment, an EMI plan, and a 100000-paise allocation. The purchase was not posted again. Household selection replaces a hard-coded first row. A viewer cannot add members or mark a row shared. Family totals use tagged rows only. | Cards page in the browser, EMI dialog, Household page |
| Language and AA | Personal Gujarati is a separate catalog from company books. The import page labels the Account Aggregator block as not live. | `personalCatalog` test |
| Company workbenches | `/company/app/modules` shows GST draft/validated/exported, invoice-then-receipt, stock, payroll, bridge, and a matched group total. Exported is not filed. | `playbookGoldens` and `workbench` tests |

The 83-surface matrix, finance goldens, and permission results are in `CLOSURE.md`. `REMAINING_WORK.md` keeps the external blocks. Inventory, GST, payroll, and groups stay listed. The package record is `docs/local-finalization/20260930-sv30/LOCAL_PACKAGE_APACHE_REPORT.md`. Static MIME and SPA routes passed. PHP health on the throwaway extract returned 500, so the package is **BLOCKED**, not a hosted pass.

On `http://localhost:5174/` the existing session saved two card EMI dues from the bill calendar and did not add a third transaction. A household viewer could not use Share. Company Cash & Bank showed “Could not load Cash & Bank” when that request failed, and the posted sale lines were ₹11,800.00, ₹10,000.00, and ₹1,800.00. The parties list was empty, so no party statement line was on screen. Sell was not clicked.
