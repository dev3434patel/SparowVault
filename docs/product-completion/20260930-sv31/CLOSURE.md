# Closure matrix — 83 surfaces — 2026-09-30

Personal money stays in IndexedDB `sparowvault_v1`. Company money stays in posted PHP vouchers. This matrix does not score the product at 100%. Live Account Aggregator, live Razorpay, GST or PF filing, a real-bank feed, and a production host with a configured database stay outside this run.

Labels:

- **local-complete** — a person can reach the action, and a test or PHP rule check covers the money effect.
- **partial** — the screen or rule exists, and a playbook step is still missing.
- **blocked-external** — the live provider or filing step is not claimed.

The morning inventory in `docs/current-product-inventory/2026-09-30/status-matrix.md` is the parent list. Statuses below are this run's evidence, not that morning score.

## Personal OS — 47

| # | Surface | This run | Evidence |
|---:|---|---|---|
| 1 | App shell and history routing | local-complete | Existing history router. Production `index.html` returned 200. |
| 2 | Desktop sidebar | local-complete | Envelopes is in the Planning group. |
| 3 | Mobile bar | local-complete | More sheet reaches cards, loans, bills, household, import, settings, and audit. |
| 4 | Command palette | local-complete | Categories, profile, audit, and subscription are in the palette. |
| 5 | Personal language pack | local-complete | Settings switches English or Gujarati for this device. Page titles, navigation, and the account, card, loan, and goal dialog labels read that catalog. The company catalog stays separate. |
| 6 | Month snapshot, charts, recent activity | local-complete | Existing dashboard. |
| 7 | Modes basic, normal, premium | local-complete | Settings and the dashboard share the selector. |
| 8 | Modes essential, family, wealth | local-complete | Essential shows bills and bank cash. Family shows the household card. Wealth shows the savings card. Settings uses the same six modes. |
| 9 | Payday cashflow panel | local-complete | Existing panel. |
| 10 | Transactions | local-complete | Existing ledger. |
| 11 | Income and expense pages | local-complete | Existing pages. |
| 12 | Tags on a transaction | local-complete | Existing tags. |
| 13 | Categories | local-complete | Parent totals count each transaction once. `wavePersonalMath` tests. |
| 14 | Transfers | local-complete | A new transfer writes `transferLinks` for that same transaction. |
| 15 | Budgets | local-complete | Existing budgets. |
| 16 | Goals | local-complete | An explicit off flag blocks a new goal and leaves history. |
| 17 | Envelope budgeting | local-complete | `/envelopes`. Bank ₹10,000 with ₹3,000 reserved stays ₹10,000 cash. |
| 18 | Sinking funds | local-complete | Envelope rows use `sinkingFunds`. The Wealth sinking-fund investment type stays an investment. |
| 19 | Recurring rules | local-complete | Weekly, quarterly, and yearly dates project in local calendar days. |
| 20 | Bill calendar | local-complete | Saving a due writes `obligations` and does not post an expense. Card, EMI, udhari, and insurance dues are included when they fall in the window. On the signed-in book, Save due dates wrote two card EMI rows and a second save did not add rows. Transactions stayed at one expense and one card payment. Udhari and insurance stores were empty. |
| 21 | Reminders | local-complete | Create, snooze, and complete stay in the app. No push delivery is claimed. |
| 22 | Accounts | local-complete | A recorded account cap blocks a new account with a limit message. A missing numeric cap does not invent a zero. |
| 23 | Credit and debit cards | local-complete | The card form blocks a new card when the plan cap is used up. |
| 24 | Card EMI | local-complete | Saving a plan writes `cardEmiPlans` and installments and does not post the purchase again. |
| 25 | Card statements and payment allocations | local-complete | The cards panel saves a cycle, a payment allocation, and a shared limit on the selected card. None of those writes posts the purchase again. |
| 26 | Loans and EMI | local-complete | The loan form blocks a new loan when the plan cap is used up. Materialised dues are obligations, not expenses. |
| 27 | Udhari and advances | local-complete | Existing page. An explicit off flag blocks a new row. |
| 28 | Investments | local-complete | Existing page. An explicit off flag blocks a new row. |
| 29 | FD, RD, insurance, valuations | local-complete | Existing wealth stores. They are on the sync allowlist. |
| 30 | Household page | local-complete | The page uses the selected household. An owner can issue an invite code. Accepting the code names the member and leaves them as a viewer. |
| 31 | Household permissions | local-complete | A viewer cannot add a member, issue an invite, or mark a row shared. On the signed-in household page those three controls were disabled for a viewer. Shared totals use opted-in rows. |
| 32 | Reports | local-complete | Parent category totals are used. |
| 33 | Suggestions and persona | local-complete | Existing suggestions. |
| 34 | Alerts | local-complete | Each of the six switches hides only its family. Preference off does not skip posting checks. |
| 35 | Reconciliation | local-complete | Confirm, reject, and unmatch write `reconciliationMatches`. |
| 36 | CSV and spreadsheet import | local-complete | Existing import. An explicit off flag blocks a new import. |
| 37 | PDF bank and card statements | local-complete | Existing PDF path is still present. |
| 38 | JSON backup and repair | local-complete | Personal backup includes the newer stores. Company rows are not in that file. |
| 39 | Account Aggregator | blocked-external | The import page labels a local simulator. `AA_LIVE` is not claimed. |
| 40 | Attachments and snapshots | local-complete | The audit page stores attachment metadata and a small local blob. A snapshot is a period record and does not add cash. Export backup includes both stores. |
| 41 | Settings | local-complete | Mode selector matches the dashboard. |
| 42 | Profile, PIN, lock | local-complete | Existing profile. A PIN is reauthentication. |
| 43 | Cloud sync | local-complete | Allowlisted collections enqueue in the same Dexie transaction as the local write. Replay runs after that transaction. Badge labels come from the sync registry. A missing label stays the collection key. |
| 44 | Audit log | local-complete | The audit page links to Export backup. |
| 45 | Subscription | local-complete | With Razorpay off, `/subscription` shows plan status and does not send the person to the dashboard. |
| 46 | Plan feature gates | local-complete | Account, card, loan, and goal creates show a limit message when that cap is used up. An explicit false flag blocks a new create. A live payload without a numeric cap stays unlimited. |
| 47 | Admin portal | local-complete | Admin shell lists every personal route key, including envelopes. |

## Company books — 36

| # | Surface | This run | Evidence |
|---:|---|---|---|
| 48 | Login, select, create company | local-complete | Existing access flow. |
| 49 | Invite by user id | local-complete | Invite list stays viewer, data entry, accountant, manager, and auditor. |
| 50 | Invite-token accept | local-complete | `/company/invite/accept` redeems a token. Only the hash is stored. Redeem is one-use in `phaseSvPure.php`. Apply `sql/migrations/20260930_company_phase_sv.sql` before the write succeeds on MySQL. |
| 51 | Roles | local-complete | `roleEndpoint.php` covers owner, viewer, and empty permissions. Last owner cannot be removed. |
| 52 | English and Gujarati | local-complete | Company catalogs stay separate from the personal catalogs. |
| 53 | Company dashboard | local-complete | A failed cash, payables, money-out, expense, profit, ageing, approval, or recent-voucher load shows the error. It does not show a verified zero. On Local Books, a failed cash load showed “Could not load Cash & Bank” and “Some figures failed to load. They are not a verified zero.” After the request succeeded, cash showed ₹26,000.00. |
| 54 | Money received and money paid | local-complete | Purpose posting remains the money path. |
| 55 | Transfer and journal | local-complete | Transfer uses `create_contra`. Journal uses `create_journal`. |
| 56 | Purpose catalogue | local-complete | Existing purpose rules. |
| 57 | Voucher list and detail | local-complete | Existing list. `partyId` stays on the voucher request. |
| 58 | Purchase and sale as their own screens | local-complete | `/company/app/invoices` drafts a sale or purchase with a base amount and optional hypothetical tax, then posts it for a server number. The receipt or payment is a separate screen. |
| 59 | Dimensions on vouchers | local-complete | Receipt, payment, journal, and transfer can send a split. `dimensionSplit` rejects a split that does not equal the line. A 6000 and 4000 split stays 10000. |
| 60 | Parties | local-complete | Kind is person or organization. |
| 61 | Party detail | local-complete | The detail screen shows the kind and tags. Statement lines use debit paise, then credit paise. A failed statement is an error, not a zero balance. The signed-in Local Books party list was empty and the posted sale has no party, so no statement line was on screen. That sale’s voucher lines showed ₹11,800.00, ₹10,000.00, and ₹1,800.00. The voucher link keeps `partyId`, `from`, and `to` in the URL. |
| 62 | Receivables and payables | local-complete | Existing books. |
| 63 | Party categories | local-complete | Existing masters. |
| 64 | Ledgers and opening balance | local-complete | Create, rename, and archive. Opening balance requires `manage_opening_balances`. A difference is not posted to capital. |
| 65 | Cash and bank | local-complete | Existing books. |
| 66 | Bank reconciliation and statements | local-complete | The workbench can match a posted cheque through PHP. Matching does not post cash again. A live bank feed stays blocked. |
| 67 | Business units, areas, projects, cost centres | local-complete | Masters can be renamed and archived. A branch can store an http or https URL. `sql/migrations/20260930_company_branch_url.sql` adds the column, and the first branch save adds it when it is missing. |
| 68 | Live reports | local-complete | A report error is not a zero balance. |
| 69 | Formerly disabled report keys | local-complete | Receipts and payments, project, business, area, category, and user activity have handlers and are enabled. |
| 70 | Export files | local-complete | Backup is one company, `serverDump` is false, and secret fields are stripped. Restore preview targets a different company id, refuses another tenant, and does not write the source. |
| 71 | Search | local-complete | A 404 is an error, not an empty book. |
| 72 | Approvals | local-complete | Existing approvals. A PIN is not the permission. |
| 73 | Audit | local-complete | Existing company audit. A 404 is an error. |
| 74 | Settings and period lock | local-complete | Profile and GSTIN save under `manage_company`. Reopen requires `reopen_period`. Changing the financial year or books start after posted vouchers returns `BOOKS_IMPACT` until the person confirms. Posted vouchers are not rewritten. |
| 75 | Permission gates on pages | local-complete | Empty or loading permissions deny. Mutating pages use `companyAllows`. |
| 76 | GST returns | local-complete | Draft, validated, and exported stay on the hypothetical regime. An unsupported regime is rejected. Exported is not filed and `irn` stays null. Filing stays blocked. |
| 77 | Inventory | local-complete | Items are stock, non-stock, or service. Costing is weighted average and `STOCK` stays the control ledger. Buy 10 at 100 and sell 4 at 150 leaves quantity 6, value 600, COGS 400. A collection does not change COGS or revenue. |
| 78 | Payroll | local-complete | Synthetic gross 30,000 only. Expense 31,800 becomes 3,180,000 paise. Accrual and payment are two journals. Approval, accrual, and payment require `create_journal`. Payment is refused until the accrual exists, and it does not debit salary again. Rates stay unverified and the run is not labelled compliant. |
| 79 | Documents | local-complete | Small files are written under `storage/company-documents`, outside the public API root, and an authenticated download returns the file. Files over 256KB keep metadata only. |
| 80 | Recurring company rules | local-complete | Templates are drafts. The local runner is idempotent and skips a locked period. A due date is not a bank payment. |
| 81 | Personal to company bridge | local-complete | States are proposed, company posted, personal applied, completed, or retry. The workbench shows the state and can retry. ₹1,000 reimbursement is one company payable and one personal receivable. IndexedDB and MySQL are not one transaction. |
| 82 | Company billing | local-complete | The workbench saves a fixture with subject `company_org_subscriptions` and source `local-fixture`. Live Razorpay delivery is untested. |
| 83 | Company groups | local-complete | The groups list is management totals only. Elimination runs when the pair is matched. Statutory consolidation stays false. |

## Finance goldens

`src/company/finance/__tests__/playbookGoldens.test.ts` and `php/scripts` pure checks (`phase-sv-pure ok`) cover:

- Invoice 10000 plus hypothetical tax 1800 books a receivable of 11800. A receipt of 5000 leaves 6800. Revenue stays 10000.
- Dimension parts 6000 and 4000 total 10000. They are not added again.
- Stock buy and sell as in row 77. Collection does not change COGS or revenue.
- Payroll figures as in row 78. Rates stay unverified.
- Cheque match sets cash posted again to 0. A fee is its own voucher.

Personal reservation and category tests cover the ₹10,000 cash case and the single-count parent total.

## Permissions

`php src/company/auth/__tests__/roleEndpoint.php` printed `role-endpoint ok`. Owner holds the keys. Viewer can read and cannot create a receipt, payment, journal, contra, opening balance, or reopen. Empty permissions deny. The invite dropdown does not offer owner or super-admin.

## Package

See `docs/local-finalization/20260930-sv30/LOCAL_PACKAGE_APACHE_REPORT.md`. The bundle was rebuilt after the dashboard and party-amount edits. `/`, `/bills`, `/household`, `/company/login`, `/company/app`, and `/company/app/parties` returned the SPA shell as `text/html`. The PDF worker was `text/javascript` and WASM was `application/wasm`. SQL and env paths returned 403. PHP health returned 500 (`ENV_VALIDATION_FAILED`, missing `CLOUD_JWT_SECRET` on the empty template). That is BLOCKED, not a hosted pass. The first zip locked `assets/index-Bs1y_WwO.js`. A retry wrote `release/hosting-bundle.zip`. The earlier `api/public/config.php` lock did not return. Restore into a new company was not exercised against MySQL.

The production preview at `http://127.0.0.1:4173/` rendered the personal sign-in form. `/subscription` stayed on the sign-in form because there was no session. `/company/login` rendered the organisation sign-in form. `/company/app/modules` sent an unsigned visitor back to `/company/login`. “Back to Personal Finance” returned to `/`. That preview had no local session.

A later signed-in session on the Vite dev server at `http://localhost:5174/` created company “Local Books” and used the modules page. Stock buy 10 at 100 and sell 4 at 150 reported quantity 6, value 600, and COGS 400. After a reload, buy and sell stay enabled for that saved stock item. Payroll payment succeeded after the receipt lookup used `mutation_id`. GST validate and group totals each returned a sent-to-books message. Reimbursement record and retry, the local billing fixture, document save and download, and the recurring draft each returned a success message. Cheque match used a posted voucher and reported that cash was not posted again. On Cards, “Local Card” was saved and shared limit “Household cards” stored 8000000 paise. A ₹3,000 card purchase and a separate ₹1,000 bill payment left one expense and one `cc_payment`. EMI conversion stored a plan and three installments. Allocating that payment stored 100000 paise and did not add another purchase.

A later signed-in session on `http://localhost:5174/` saved two card EMI obligations (103015 paise each) from the bill calendar. Saving again left two obligations. Transactions stayed at one expense of 300000 paise and one `cc_payment` of 100000 paise. Udhari and insurance stores were empty, and the open card statement was outside the next 30 days, so those dues were not in the save. A temporary household was switched to viewer: Share, Add member, and Create invite were disabled. That household was then marked deleted, and the expense and payment notes stayed empty. No second card purchase was created.

Company login with that session opened Local Books. A failed cash load showed “Could not load Cash & Bank” and “Some figures failed to load. They are not a verified zero.” Cash then showed ₹26,000.00 again. The parties list was empty and the posted sale has no party, so there was no party statement line. Sale `SAL-20260930-00000001` showed ₹11,800.00, ₹10,000.00, and ₹1,800.00. Sell on the stock item was not clicked.
