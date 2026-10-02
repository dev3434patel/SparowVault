# Remaining work — 2026-09-30

Personal money stays in IndexedDB. Company money stays in posted PHP vouchers.

## Wired to PHP

Profile update, ledger create/rename/archive, hashed one-use invites, last-owner role changes, documents, invoice drafts, recurring drafts, GST validate/export, payroll preview, cheque match, reimbursement links, and a local company-subscription fixture have API entry points. The workbench page at `/company/app/modules` calls the document, GST, payroll, bridge, billing, and recurring endpoints. Receipt and payment screens can send a cost-centre split that must equal the voucher amount. The split is stored on the line and is not added again to the voucher total.

`php src/company/auth/__tests__/phaseSvPure.php` printed `phase-sv-pure ok`. That checks the invoice, stock, payroll, GST, cheque, backup, and invite-token rules.

Apply `sql/migrations/20260930_company_phase_sv.sql` before issuing invites or storing bridge status. That migration creates the hashed invite table and the bridge status column. Apply `sql/migrations/20260930_company_branch_url.sql` for the branch URL column. The first branch save also adds that column when it is missing.

## BLOCKED_EXTERNAL

- Live Account Aggregator.
- Live Razorpay delivery. The company billing row is a local fixture, not a provider webhook from Razorpay.
- GST or PF filing. Export writes a JSON document and does not create an IRN.
- Real-bank cheque feeds. Matching a posted cheque does not post cash again. A fee still needs its own voucher.
- A production host with a configured database. Project-local Apache served the rebuilt extracted bundle (`docs/local-finalization/20260930-sv30/LOCAL_PACKAGE_APACHE_REPORT.md`). `index.html` was `text/html`, the PDF worker was `text/javascript`, and WASM was `application/wasm`. SQL and env paths returned 403. SPA routes `/bills`, `/household`, `/company/login`, `/company/app`, and `/company/app/parties` returned that same shell. PHP health returned 500 (`ENV_VALIDATION_FAILED`, missing `CLOUD_JWT_SECRET`). That is BLOCKED, not a hosted pass. The first zip locked `assets/index-Bs1y_WwO.js`; a retry wrote `release/hosting-bundle.zip`. The earlier `api/public/config.php` lock did not return. Restore into a new company was not exercised against MySQL.

## Browser evidence on the Vite session

A signed-in session on `http://localhost:5174/` switched Settings to Gujarati. The page title, command palette, More sheet, and account dialog labels followed that catalog. The account dialog was closed without saving. The card dialog then saved “Local Card” (last four 4242, limit 50000). Shared limit “Household cards” stored `totalLimitPaise` 8000000 on `creditLimitGroups` and linked that id on the card. The shared limit did not post a purchase.

Company “Local Books” was created for that session. Stock buy 10 at 100 and sell 4 at 150 reported quantity 6, value 600, and COGS 400. The sales document page drafted base 10000 plus hypothetical tax 1800, posted server number SAL-20260930-00000001, and opened Money Received as a separate screen. After reload the day book shows that sale at ₹11,800.00, the payroll accrual at ₹31,800.00, and the payroll payment at ₹26,000.00.

GST validate then export reported state exported, not filed, and no IRN. Cheque match used a posted voucher and reported that cash was not posted again. Document save and download, the billing fixture, reimbursement record and retry, and the recurring draft each returned a success message. A card statement for 2 Aug 2026 to 1 Sep 2026 stored a closing balance of 250000 paise. A later card purchase of ₹3,000 on Local Card wrote one expense of 300000 paise and left cash unchanged. Paying the bill with ₹1,000 from Cash wrote one `cc_payment` of 100000 paise, so the purchase stays ₹3,000 of spending and the remaining card debt is ₹2,000. Converting that purchase saved one EMI plan and three installments. Allocating the ₹1,000 payment wrote one `cardPaymentAllocations` row of 100000 paise. Linked transactions stayed at two: the purchase and the bill payment.

A later signed-in session on `http://localhost:5174/` saved two card EMI obligations and did not post another expense. A household viewer could not use Share, Add member, or Create invite. A failed company cash load showed “Could not load Cash & Bank” instead of a verified zero. The parties list was empty, so no party statement line was on screen. The posted sale lines showed ₹11,800.00, ₹10,000.00, and ₹1,800.00. Sell was not clicked. Vitest on the amount, dashboard, and permission tests had already passed (10). `phase-sv-pure ok` and `role-endpoint ok` had already printed. The hosting bundle was rebuilt after those source edits. Health on the throwaway extract is still 500.

Live Account Aggregator, live Razorpay, GST or PF filing, a real-bank feed, and a production database restore stay outside this run.

## Still thin

- Settings switches the personal catalog between English and Gujarati. Page titles and the account, card, loan, and goal dialog labels follow that choice.
- A live subscription payload still does not send numeric `max_accounts`, `max_cards`, `max_loans`, or `max_goals`. The forms enforce a cap only when that number, or an explicit false flag, is present.
- Group totals are calculated when the groups endpoint is called. There is no statutory consolidation.
