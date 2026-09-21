# UI, UX and Mobile Audit

## Update - 11 September 2026

Current [UI/browser findings](FULL-PROJECT-AUDIT-2026-09-11.md#6-button-form-state-and-accessibility-audit) and [screenshots/evidence](audit-evidence/2026-09-11-full/README.md) supersede historical pass/fail assumptions below. New route checks cover 108 viewport states, including six explicitly identified disabled-billing fallback states, not every dynamic control or browser.

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## What actually ran

Chromium Playwright visited 30 authenticated route entries at ten widths each: 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375 and 360 pixels. Desktop/tablet height was 900; mobile user-page height was 844, admin height 900. This is **300 route/viewport observations**, not 300 independent business-flow tests. The investment child page is included under Wealth, not a separate route.

All sampled root-overflow readings were 0px, with no pageerror events in the completed custom run. Reports was an upgrade-gated view for the fresh account; subscription routes used disabled fallbacks. Heavy populated charts/tables, all modals, zoom, rotation, dark theme, real touch devices, Safari and Firefox remain untested in this pass.

| Route | Rendered heading | Widths | Max root overflow | Unnamed candidates at 390 | State |
| --- | --- | --- | --- | --- | --- |
| / | Good afternoon, Audit. | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /transactions | All Transactions | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 1 | Fresh-user / seeded admin view |
| /income | Income | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 1 | Fresh-user / seeded admin view |
| /expenses | Expenses | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 1 | Fresh-user / seeded admin view |
| /budgets | Budget Planner | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /goals | Goals & Planned Purchases | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /accounts | Accounts | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 12 | Fresh-user / seeded admin view |
| /cards | Cards | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /loans | Loans & EMI | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /udhari | Udhari & Advances | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /savings | Wealth & assets | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /categories | Categories | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 222 | Fresh-user / seeded admin view |
| /reports | Reports & Analytics | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Upgrade-gated view only |
| /suggestions | Suggestion center; Top 3 actions today; Urgent; Dismissed & history | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /export | Export Center | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 2 | Fresh-user / seeded admin view |
| /import | Import Center | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /bills | Bill calendar | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /reconciliation | Reconciliation | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /household | Household dashboard | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 1 | Fresh-user / seeded admin view |
| /alerts | Alerts Center | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Fresh-user / seeded admin view |
| /settings | Settings | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 9 | Fresh-user / seeded admin view |
| /profile | Profile & Security | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 20 | Fresh-user / seeded admin view |
| /audit | Audit & Backup | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 1 | Fresh-user / seeded admin view |
| /subscription | Good afternoon, Audit. | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | 0 | Feature-disabled fallback |
| /admin | Admin Dashboard | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | not scanned for admin | Fresh-user / seeded admin view |
| /admin/users | User Management | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | not scanned for admin | Fresh-user / seeded admin view |
| /admin/plans | Plan Management | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | not scanned for admin | Fresh-user / seeded admin view |
| /admin/subscriptions | Admin Dashboard | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | not scanned for admin | Feature-disabled fallback |
| /admin/flags | Feature Flags | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | not scanned for admin | Fresh-user / seeded admin view |
| /admin/branding | Branding Settings | 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375, 360 | 0 | not scanned for admin | Fresh-user / seeded admin view |

## Actual interaction checks

| Check | Result | Observed value |
| --- | --- | --- |
| Registration reaches authenticated shell | PASS | true |
| Create account persists visibly | PASS | "Accounts\n\nAll your money containers — cash, bank, UPI, wallets.\n\nNew Account\n\nTotal balance\n\n₹0.00\n\nAccounts\n\n7\n\nActive\n\n7\n\nTransactions\n\n0\nAudit UI Account\nBank Account\n₹0.00\nOpening: ₹0\nSavings Bank\nSavings Account • HDFC Bank\n₹0.00\nOpening: ₹0\nUPI Wallet\nUPI Wallet\n₹0.00\nOpening: ₹0\nUPI Wallet\nUPI Wallet\n₹0.00\nOpening: ₹0\nCash\nCash\n₹0.00\nOpening: ₹0\nCash\nCash\n₹0.00\nOpening: ₹0\nSavings Bank\nSavings Account • HDFC Bank\n₹0.00\nOpening: ₹0" |
| CA download is a parseable XLSX | PASS | ["Transactions_Master","Income_Summary_Monthly","Expense_Summary_Monthly","Expense_By_Category","Expense_By_Subcategory","Expense_By_Payment_Mode","Loan_EMI_Register","Credit_Card_Register","Udhari_Register","Savings_Investments_Register","Goal_Contribution_Register","Annual_Personal_Financial_Summa","Tax_Flagged_Transactions","GST_Bill_Entries","Account_Ledger","Account_Reconciliation","Interest_Paid_Report","Business_Personal_Split","Bills_Missing_Report","Export_Footer","CA_Notes"] |
| Mobile command palette exposes Categories | FAIL | ["Go to Dashboard","Go to Transactions","Go to Income","Go to Expenses","Go to Budgets","Go to Goals","Go to Accounts","Go to Cards","Go to Loans & EMI","Go to Udhari & Advances","Go to Savings & Investments","Go to Bills & Calendar","Go to Household","Go to Reconciliation","Go to Reports","Go to Suggestions","Go to Export Center","Go to Import Center","Go to Alerts","Go to Settings","Add incomeQuick add","Add expenseQuick add","Add transfer"] |
| Mobile command palette exposes Audit | FAIL | ["Go to Dashboard","Go to Transactions","Go to Income","Go to Expenses","Go to Budgets","Go to Goals","Go to Accounts","Go to Cards","Go to Loans & EMI","Go to Udhari & Advances","Go to Savings & Investments","Go to Bills & Calendar","Go to Household","Go to Reconciliation","Go to Reports","Go to Suggestions","Go to Export Center","Go to Import Center","Go to Alerts","Go to Settings","Add incomeQuick add","Add expenseQuick add","Add transfer"] |
| Quick add dialog visible on mobile | PASS | {"x":16,"y":287,"width":358,"height":270} |
| Escape closes quick add dialog | PASS | 0 |
| Cloud refresh preserves unsynced local account | FAIL | {"before":true,"after":false,"pending":true} |

## Visual review

Inspected saved images for mobile Dashboard, Profile, Export and admin Branding and desktop Reports. The layouts fit the viewport with readable wrapping in those captured states. Mobile Export and Profile become long single-column forms; fixed bottom navigation requires scroll testing for lower controls. Admin uses a horizontally scrollable navigation strip; a partially visible item is not by itself a page-overflow defect. Desktop Reports visibly showed only the plan-gate message, so its charts are not visually certified.

[Dashboard mobile screenshot](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/screenshots/dashboard-390.png>); [Profile mobile screenshot](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/screenshots/profile-390.png>); [Export mobile screenshot](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/screenshots/export-390.png>); [Reports desktop screenshot](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/screenshots/reports-1440.png>); [Admin mobile screenshot](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/screenshots/admin-mobile.png>).

## Accessibility and action findings

- B29: Field labels are not programmatically associated with input controls; errors/hints are not connected with aria-describedby. Raw unnamed-control candidates are in browser-audit.json. The heuristic is only screening and may need manual classification.
- B30: Categories and Audit are missing from mobile navigation/palette. A direct route URL is not a substitute for discoverable navigation.
- B34: Fresh registration produced duplicate default accounts/categories. This is a real data-initialization symptom visible in the UI, not just visual duplication.
- B20: CA export does not recover reliably after a workbook exception because it lacks try/finally.
- B35: Export copy says 16 sheets but downloaded baseline workbook contains 21.
- B01: A success-looking local save is not reliable confirmation of durable storage. Error states must distinguish saved locally, syncing, rejected and safely persisted.

## Button-wise inventory and limitations

[ACTION-INVENTORY.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/ACTION-INVENTORY.md>) contains all 313 AST-extracted action definitions with source, label, handler, disabled expression and visibility context. MODULE-WISE-AUDIT.md adds page-level fields, persistence calls and role/PIN/audit assessment. Dynamic repeated row controls count as one definition. Imported child dialogs are in the global inventory. No claim is made that every definition was clicked.

For each destructive or financial action, the missing release test must assert: visible authorized state; keyboard activation; cancel unchanged; invalid fields rejected; missing/wrong PIN rejected when required; correct request; ownership; durable record/effect/audit equality; reload; double-submit; timeout/retry; disabled state recovery and accessible feedback. Present inventories expose these untested branches instead of silently calling them covered.

## Layout and usability backlog

Add a canonical mobile More menu, proper field/error naming and explicit sync status first. Then measure long-form keyboard scrolling, 200/400 percent zoom, large monetary values and long entity names. Validate meaningful loading skeletons, disabled tooltips, toast persistence and focus return. Consider reducing repeated explanatory copy and nested card density on operational views after correctness fixes. Do not redesign the product during this audit.

## Harness corrections

The first custom attempt mistook the auth shell main element for the authenticated shell; it is retained as attempt1-browser-audit.json and is excluded from coverage. The second attempt reached 24 pages but used an incorrect Add selector; retained as attempt2-browser-audit.json. The final corrected run reached the authenticated aside, all 30 routes, 8 interaction assertions and zero fatal/page errors. Five assertions passed and three exposed product failures. A zero script exit code alone is not the pass criterion; assertion contents were inspected.
