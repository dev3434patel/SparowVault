# SparowVault / SparowFinanceOS Current Full Audit

**Audit date:** 11 September 2026, Asia/Kolkata. **Verdict: NOT READY FOR PRODUCTION OR RELIABLE CA SHARING.**

This is a fresh audit of the current SparowVault working tree against the user-approved SparowFinanceOS brief. It is a software/financial-logic assessment, not a chartered-accountant sign-off, legal opinion, independent penetration-test certificate or assurance that every possible input works.

## 1. Executive Summary

The project has materially improved: typecheck, lint, 410 unit tests, isolated write-integrity/security/statement tests, a production build and production-artifact checks pass. The supplied 36-page Kotak statement now extracts **1,240 transactions**, with **8,680 field comparisons and zero mismatches** against an independent extraction oracle. Clean and encrypted scanned-PDF fixtures work through local OCR. The ordinary contribution path correctly treats INR 400 paid and INR 200 returned as **INR 200 net expense, not INR 200 income**.

Those successes do not establish end-to-end correctness of the whole product. Fresh audit tests found broken loan creation, incomplete backups, partial restore, a failing profile wipe, unvalidated non-transaction records, optional-version lost updates, payment webhook retry poisoning and multiple incorrect CA/report calculations. Most importantly for the requested contribution feature, the **CA workbook still labels account credits as income**, so a contribution that is correct in the main calculation engine can be wrong in the exported monthly income sheet.

### Current Finding Counts

| Severity | Distinct findings | Meaning in this report |
|---|---:|---|
| Critical / P0 | 0 confirmed | No demonstrated critical privilege takeover or automatic irreversible production-data loss in the executed scope. This is not proof of absence. |
| High / P1 | 15 | Broken major workflows, data-integrity failures, incorrect financial outputs or payment processing failure. |
| Medium / P2 | 10 | Security/report usability gaps, accessibility/navigation defects and release-engineering weaknesses. |
| Low / P3 | 2 | Misleading labels and metadata-related tooling noise. |
| Total | **27** | Root-cause findings F01-F27 below. Repeated assertions and missing agency modules are not counted again. |

The old 10 September report's 39-finding totals are historical. Several old critical integrity/session issues now pass fresh regressions. Do not combine the historical and current totals, and do not treat documents with "certified" in their filenames as current release evidence.

### Deliverables

- [Current endpoint and data audit](API-AUDIT-2026-09-11.md): every one of the 41 PHP endpoint files, methods, access controls, inputs and verification limits.
- [Static source catalog](FULL-AUDIT-CATALOG-2026-09-11.md): all 37 declared collection contracts, 269 JSX action definitions, 401 field/control definitions and 844 named TypeScript function definitions with source locations.
- [Evidence index](audit-evidence/2026-09-11-full/README.md): machine-readable checks, screenshots, coverage, command logs and provenance.
- [Test matrix](audit-evidence/2026-09-11-full/TEST-MATRIX.md): individually recorded assertions, including failures and overlapping suites.

## 2. Identity and Change Boundary

| Item | Current observation |
|---|---|
| Product | SparowVault, Personal Finance OS, package version 0.1.0. |
| Requested broader product | SparowFinanceOS for SparowTech Solution LLP. Agency modules are separate scope gaps, not equivalent to existing personal-finance pages. |
| Repository | `https://github.com/dev3434patel/SparowVault.git` |
| Workspace | `/Volumes/ssd12/SparowVault/230826 SparowVault` |
| Branch / HEAD | `master` / `54eec068a37cceb9cccc2a63dca824e1e092f52e` plus extensive pre-existing uncommitted changes. |
| Preview | Frontend `http://127.0.0.1:5178/`; API `http://127.0.0.1:8088`. This is local HTTP, not a public production deployment. |
| Local review login | `review_demo`, PIN `583921`. Synthetic preview credentials only; never provision these in production. |
| Observed runtimes | Node 20.20.2, PHP 8.5.4, XAMPP MariaDB 10.4.28. |
| Frontend dependencies | React 19.2.4, TypeScript, Vite 7.3.6, Tailwind 4, Zustand, Dexie, Radix, Lucide, Recharts, Vitest 4.1.11, Playwright. |
| Statement/export libraries | PDF.js 5.4.624, Tesseract.js 7.0.0, self-hosted English OCR model; SheetJS 0.20.3. |
| Audit changes | Test harnesses, audit scripts, generated evidence, reports and regenerated build output only. No application-source remediation, commit, push or deployment in this audit turn. |

Destructive tests used uniquely named, disposable databases owned by their harness, private local ports and synthetic accounts. Their own servers and databases were cleaned up. Existing preview data and unrelated running services were not reset. The supplied private PDF was read locally, remained unchanged, and had **zero import requests**. Its financial amounts, account-holder details, raw rows and password were not copied into this report.

Final provenance check compared 277 application/config files with the green core-verification baseline: none changed. The local frontend still returns HTTP 200 and API/database health is healthy. See `commands/report-qa.json` in the evidence package.

## 3. Architecture and Inventory

### Current Design

The React application maps navigation keys to statically imported pages in `src/components/layout/AppShell.tsx`. Zustand controls authentication, navigation, cloud capabilities, UI and loaded collections. Repository APIs mediate cloud writes; IndexedDB persists browser data and the durable mutation outbox. The SQL-backed PHP controller layer is the server source of truth.

The backend is not the JSON/Blob-only architecture presumed in the original agency brief. `cloud_collection_rows` stores owner-scoped collection JSON plus indexed fields. Separate SQL tables hold users, hashed session identifiers, billing records, webhook processing, mutation receipts, audits and financial events/effects. Tested finance mutations commit their entity, receipt, ledger and server audit together. Domain operations implemented as several independent repository calls are not automatically one atomic business transaction.

PDF text extraction and OCR run in the browser with locally hosted assets. Import sends reviewed structured data and provenance, not a raw document/password to a cloud AI provider. Classification is rule-based suggestion plus explicit user review. The suggestions/coach surfaces are rule-driven finance advice, not evidence of a deployed LLM service. Alerts/reminders are application features; SMTP/SMS/WhatsApp/push delivery was not demonstrated.

Exports are mainly client-generated XLSX/CSV/JSON. The full-profile UI backup differs from the server privacy-export endpoint and the operator SQL backup. Treating those three as interchangeable would miss the confirmed backup defect.

### Measured Static Inventory

| Measure | Count / limitation |
|---|---|
| Files inventoried in src/php/api/scripts/tests | 421 at catalog generation; includes audit tooling, excludes AppleDouble metadata. |
| Page components | 31, including embedded InvestmentsPage; 30 navigation keys. |
| Endpoint files | 41; alias and multi-method caveats apply. |
| Server collection allowlist | 37; all received three-way collection-list ownership probes. |
| Component TSX files | 73. |
| Service/library TS files, excluding their tests | 64. |
| Unit-test source files | 52; executed test cases 410. |
| Top-level test MJS scripts | 26; includes helper/audit scripts, not 26 independent E2E suites. |
| Named TS functions / methods / function variables | 844; anonymous callbacks and PHP functions are outside this count. |
| JSX onClick/onSubmit definitions | 269; one definition can render many buttons. |
| Field/control definitions | 401; Field wrappers and their Input can describe the same visible field. |
| TODO/FIXME/HACK lines in current src/php/api scan | 0. No TODO markers does not imply no missing functionality. |

Keyword evidence captures demo seeding, placeholders, localStorage and temporary-PIN text. Most placeholders are ordinary form examples, not hardcoded financial data. Demo reseeding remains an explicit settings action. Browser session metadata, theme and outbox migration references remain in localStorage; current cookie-token handling must not be misreported as the old persistent-token design. No whole-program dead-code proof was performed. See `inventory/keyword-hits.json` and the source hashes.

## 4. Verification Results

| Run | Result | Interpretation |
|---|---|---|
| `npm run typecheck` | PASS | Repeated after audit-tool additions. |
| `npm run lint` | PASS | Repeated after audit-tool additions. |
| `npm test` | **410/410**, 52 files | Existing regression tests pass; important scenarios below were missing. |
| Development integrity/statement/browser suite | **63/63** | Atomicity, sessions, backup restore drill, contributions, local PDF/OCR and durable browser queue. |
| `npm run build` | PASS | Production assets generated; large-chunk warnings remain. |
| Production-artifact suite | **54/54** | Built assets exercised, including applicable statement/security paths; overlaps with development suite. |
| PHP syntax | **81/81 files** in api/php | Syntax only, not full PHP branch coverage. Backup script also executes in the restore drill. |
| Extended current audit | **184 pass / 34 nonpassing / 218 recorded checks** | Deliberately stronger desired-contract checks expose defects. One wipe-after-failed-restore probe is blocked by its rejected outbox item; clean wipe is independently reproduced below. |
| Module workflow suite | **43 pass / 2 fail / 45 checks** | Includes 27 repeated integrity/durability checks; 16 new successful workflow/responsive checks, plus loan creation and clean wipe failures. |
| Additional finance contracts | **6 pass / 10 fail / 16 checks** | Production calculation/export functions with synthetic independent expected results. |
| Actual Kotak statement | **1,240 rows, 8,680 comparisons, zero mismatches** | One supplied document/layout, not a bank-wide accuracy certificate. |
| `npm audit --json` | **0 reported vulnerabilities** | Current registry advisory snapshot across installed dependency graph; not a security guarantee. |
| Exact CI unit command `npm test -- --reporter=basic` | **FAIL before tests start** | Installed Vitest no longer supports this reporter. |
| Six isolated legacy API scripts | **1 passes, 5 fail** | Primarily obsolete fixtures/contracts; not five new application bugs. |
| SQL dry-run script in static-only mode | PASS with warnings | Not a historical migration certification. |

Counts overlap. Do not add 63, 54, 218 and 45 and call that many independently covered features. The machine-readable test matrix preserves suite names and scenarios. Earlier audit-development runs with wrong selectors, insufficient login waits or disabled fixture entitlements are explicitly superseded in the evidence index.

### Coverage

V8 coverage is restricted by the repository configuration to `src/services/**/*.ts` and `src/lib/**/*.ts`: **60.98% statements, 54.57% branches, 62.88% functions, 64.64% lines**. Lines are 2,474 of 3,827. These are not whole-project, React-component, repository/store or PHP coverage percentages. Browser OCR integration tests cover behavior outside this unit coverage view. Coverage also warned about `._*` metadata, recorded as F26; retain that caveat rather than presenting a clean 100% measure.

### Browser Scope

Chromium checked 24 user route visits at widths **1440, 768, 390 and 360**, and six admin route visits at **1440 and 390**: **108 captured route/viewport states**. No document-level horizontal overflow or uncaught errors arose during these final route-load checks. Six populated module screenshots at 390px and statement/review screenshots add workflow evidence.

Important limitation: subscription billing is disabled in the local test configuration. `/subscription` renders the user dashboard, and `/admin/subscriptions` renders the admin dashboard. Those six screenshots are fallback states, **not successful checkout/subscription-management tests**. This leaves 102 non-fallback module/viewport checks in the route matrix. Screen-size checks are not exhaustive visual, keyboard, color-contrast or every-control accessibility certification. Safari, Firefox, real Android/iOS, screen readers, 200% zoom and the other widths in the original brief were not all tested in this fresh run.

## 5. Module-Wise Audit

All existing user pages operate on the authenticated owner's data, with applicable plan/household restrictions. Admin pages require the separate admin context. Standard CRUD generally uses the collection endpoints, not a unique endpoint per page. A successful create/reload checks persistence, not complete CRUD/lifecycle coverage. Full field/action definitions are in the catalog; the table below records meaningful runtime coverage and remaining work.

| Module / route / source under src/components/pages | Main data and actions | Fresh verification | Status / remaining gap |
|---|---|---|---|
| Dashboard `/`, `DashboardPage.tsx` | Transactions, balances, debts, budgets, goals, charts, date/mode controls, reports/export shortcuts, quick add | Four-width load; sample debit affects expense and cash correctly; base calculation tests | API-backed, partially verified. All KPI drilldowns/date modes and large-data browser performance not certified. |
| Transactions `/transactions`, `TransactionsPage.tsx` | Search/date/type/account/category filters, add/edit/delete, ledger explanations, contribution action | Four widths; real original-expense contribution workflow; API ownership/version/rollback tests | Core path working. Every transaction intent, filter combination and offline edit is not individually browser-tested. |
| Income `/income`, `IncomePage.tsx` | Income rows, summaries, transaction forms | Four widths; income/transfer/contribution engine tests | Partial. CA income export diverges, F27. |
| Expenses `/expenses`, `ExpensesPage.tsx` | Expense rows, categories, filters, add/edit; linked contribution | Four widths; INR 400/200 net-cost browser/API/pure tests | Core contribution works; all mixed/reimbursable/card contribution variants are not supported. |
| Categories `/categories`, `CategoriesPage.tsx` | Create/edit/archive, parent/type/icon/color; cleanup/merge surface | Actual create/save/reload plus four-width route checks | Creation works. Full merge/reparent/concurrency not certified; mobile discoverability F20; server schema F06 family. |
| Budgets `/budgets`, `BudgetsPage.tsx` | Monthly/annual period, year/month, category, amount, mode; actual usage | INR 3,000.25 with Test category survives reload | Basic workflow passes. Carry-forward, annual boundaries, category deletion and concurrent duplicate budgets remain open. |
| Goals `/goals`, `GoalsPage.tsx` | Title/type/target/date/priority, contributions, progress | Create INR 10,000 target; INR 200.50 contribution retained in goal and contribution row | Happy path passes. Injected failure between repository writes and linked-account cash semantics require deeper domain-operation tests. |
| Accounts `/accounts`, `AccountsPage.tsx` | Name/type/institution/opening amount/icon/color; edit/inactivate/delete | Create INR 1,234.56, verify 123,456 paise after reload, edit/reload pass | Working save/edit. Accessibility F19; versionless overwrite F05; invalid raw API payload F06. |
| Cards `/cards`, `CardsPage.tsx` | Card details/limits/cycle dates, payments, EMI simulation, statements | INR 50,000 limit with statement day 10/due day 25 survives reload; card bill payment engine/import tests | Basic card workflow passes. Statement-cycle/timezone/rate/fees/refund/EMI lifecycle matrix not fully browser-tested. |
| Loans `/loans`, `LoansPage.tsx` | Lender, principal/disbursement, dates, tenure/rate, lifecycle, EMI schedule/prepayment | Fresh INR 12,000/12-month/12% loan cannot save; screenshot retained | **Broken creation**, F01. Schedule engine tests can pass while the form is unusable. |
| Udhari `/udhari`, `UdhariPage.tsx` | Receivable/payable, person/date/amount, cash settlement, write-off, history | Create INR 400 receivable; collect INR 200 to account; amountSettled and settlement row persist | Happy path passes. Write-off, concurrency, over-settlement and failure between three writes remain open. CA canonical mapping F10. |
| Wealth `/savings`, `WealthHubPage.tsx` | FD/RD, insurance, valuations, embedded investment/contribution pages | FD INR 25,000; policy INR 1,000 premium/100,000 cover; valuation INR 30,000 saved without creating income; mobile check | Basic forms pass. Maturity accrual, invalid dates, policy renewals and linked bank movements not fully verified. |
| Investments embedded, `InvestmentsPage.tsx` | Investment create/edit/status/contribution | Source and existing unit coverage; containing route loads | Not counted as a separate route. Complete SIP/RD contribution lifecycle not newly executed. |
| Reports `/reports`, `ReportsPage.tsx` | Filters, personal/business/tax/GST views, chart/table summaries | Four widths and targeted production function checks | **Financial correctness partial**, F09-F13/F27. Tax flags are not GST returns or certified company accounts. |
| Suggestions `/suggestions`, `SuggestionsPage.tsx` | Coach mode, rule-based suggestions, actions/preferences | Four-width rendering, existing rule tests | Not a verified LLM/agent service; no autonomous classification certainty. All preferences and action persistence unverified. |
| Export `/export`, `ExportPage.tsx` | Date/format filters; XLSX, CSV, JSON, CA workbook, PIN-confirmed backup, history | Actual workbook download parsed: 21 sheets with expected source row; backup downloaded and inspected | **Not reliable for CA sharing**, F02/F09-F13/F16/F17/F25/F27. CSV injection F15. |
| Import `/import`, `ImportPage.tsx` | Spreadsheet mapping/preview, backup restore, import history/source controls | Linked JSON restore reproduced partial commit; statement header workflow tested separately | **Restore broken**, F03. Arbitrary CSV formats, duplicate mappings and large spreadsheet boundary cases not certified. |
| Statement dialog, header action | Bank/account selection, normal/password/scanned PDF, dates/months, categories/scope, review/import | Deep browser/API tests; actual Kotak read-only comparison | Working verified subset. Other real-bank layouts and universal OCR accuracy remain unverified. |
| Bill calendar `/bills`, `BillCalendarPage.tsx` | Obligations, due-date calendar, funding/sinking-fund context | Four widths; existing obligation engine tests | Partial. Actual recurring scheduler/delivery, paid/reversed/overdue transitions not all newly exercised. |
| Reconciliation `/reconciliation`, `ReconciliationPage.tsx` | Ledger diagnostics, import provenance, reconciliation candidates | Four widths; independent balance probe fails | **Not a certified external reconciliation**, F12. Auto-matching cannot replace an independently supplied closing balance. |
| Household `/household`, `HouseholdDashboardPage.tsx` | Household name, partner/viewer-style members and permissions | Household plus named partner persist; two membership rows; backend viewer restrictions tested | Local owner-scoped model, not full multi-user agency RBAC/invitations or partner profit accounting. |
| Alerts `/alerts`, `AlertsPage.tsx` | Alert list/filter/dismiss actions and shared drawer | Four widths; application engine tests | Partial. End-to-end notification delivery and every dismiss/regenerate transition remain unverified. |
| Settings `/settings`, `SettingsPage.tsx` | Theme/date/FY/threshold/preferences, save, demo reseed, profile wipe | Save/reload passes; clean referenced profile wipe returns 409 | **Wipe broken**, F04. Demo reseed not used on the live profile. All setting combinations and dark theme not exhaustively tested. |
| Profile `/profile`, `ProfilePage.tsx` | Personal fields, PIN/security recovery, account/privacy operations | Four widths plus credential/recovery/privacy API tests | Security improvements verified; full browser account deletion/profile editing not certified. |
| Audit `/audit`, `AuditPage.tsx` | Search/filter client-visible audit history/export | Four widths; direct forge/delete probe succeeds | **Not authoritative immutable audit**, F14. Mobile entry absent, F20. |
| Subscription `/subscription`, `SubscriptionPage.tsx` | Plans, checkout, renewal/cancel | Local disabled fallback only; synthetic billing API tests | External checkout and real provider operations unverified. |
| Admin dashboard `/admin`, `admin/AdminDashboardPage.tsx` | Users/subscriptions/revenue counters | Admin GET and desktop/mobile render pass | Correctness against real reconciled provider revenue not verified; unauthorized status F18. |
| Admin users `/admin/users`, `admin/UserManagementPage.tsx` | Search/filter, active toggle, reset PIN, plan assignment | Read/render pass; non-admin mutation denial checked | Full successful destructive/admin workflows not executed. |
| Admin plans `/admin/plans`, `admin/PlanManagementPage.tsx` | Plan details, price, interval, trial, features | Read and desktop/mobile actual form rendering pass | Save/delete/migrate-existing-subscriber combinations unverified. |
| Admin subscriptions `/admin/subscriptions`, `admin/SubscriptionManagementPage.tsx` | Lifecycle actions/list | Local disabled fallback; GET success | Do not count fallback as lifecycle workflow success. |
| Admin flags `/admin/flags`, `admin/FeatureFlagsPage.tsx` | Global feature toggles | Authorized GET and both widths pass | Full toggle propagation/entitlement transition testing remains open. |
| Admin branding `/admin/branding`, `admin/BrandingSettingsPage.tsx` | Title/logo/favicon/support/policy URLs | Read and both widths pass | Malicious URL, cache/CSP and every save state not fully tested. |

## 6. Button, Form, State and Accessibility Audit

The catalog identifies every current JSX click/submit definition and form/control declaration, with handler and disabled-state expressions. This is a complete **static definition inventory**, not a claim that every dynamic button and all its role/feature/error states were clicked. Runtime coverage is explicitly narrower and is listed in the test matrix.

Actual UI actions exercised include sign-in, account create/edit, category create, budget create, goal contribution, card create, failed loan save, Udhari settlement, FD/policy/valuation saves, household/member creation, settings save, statement password prompts, analysis/review/import, original-expense contribution, backup PIN/download, CA workbook download, JSON restore, profile-wipe confirmation and durable-sync review/download/resolution. Destructive actions were confined to synthetic test users.

Empty pages and populated pages render at tested widths; this does not validate every empty-to-error/loading transition. Durable sync tests deliberately inject a 503 and validation rejection and verify a visible recovery path. Statement tests deliberately use bad passwords, malformed content, unsupported scan and server-invalid review decisions. Generic account labels are not programmatically connected: five controls have no accessible names and two icon controls are unnamed in the account dialog. Escape closes the dialog, but focus does not return to the opener.

Mobile bottom navigation exposes a subset of desktop modules. Categories and Audit are absent from both the visible mobile navigation path and the command palette's navigation items; direct URLs work. This is discoverability loss, not a route permission failure. Keep a complete More menu or equivalent reachable navigation and verify keyboard focus/scroll restoration. The header statement-upload action remains reachable in the tested 390px layout.

Visual inspection confirmed the failed loan error is visible but not actionable: "Too small: expected number to be >0" does not identify the hidden field. Dashboard and Export Center are nonblank and contained, but heavily rounded/nested cards, dense help copy and broad whitespace deserve a separate design cleanup after correctness fixes. No universal contrast or WCAG claim is made from these screenshots.

## 7. Finance Calculation Audit

### Correctness Principles and Passing Cases

Use integer paise internally; round at documented boundaries and retain numeric spreadsheet cells with an INR number format. Separate **cash movement**, **true income**, **consumption expense**, **assets/liabilities** and **transfers/refunds**. A credit is not necessarily income; a debit is not necessarily consumption expense.

| Scenario | Expected | Fresh result |
|---|---|---|
| 10,000 rupee/paise round trips | Recover the original integer paise | PASS. |
| 10,000 mixed split inputs, including out-of-range percentages | Nonnegative allocations preserving total | PASS for split helper; does not validate raw API acceptance policy. |
| INR 400 dinner, INR 200 linked contribution | Income 0; expense 200; opening bank 10,000 closes 9,800; category expense 200 | PASS in core production functions, API and contribution UI path. |
| Deleted original and return | No income/expense effect | PASS. |
| Transfer between two own accounts | Consolidated bank value and income/expense unchanged | PASS in core functions. |
| Card bill payment | Reduce bank and card liability, no second consumption expense | PASS in statement/API regression. |
| Concurrent contributions exceeding original cost | Total recovery capped, no over-credit or partial commit | PASS in dedicated contribution API regression. |
| 50,000 actual calculation-engine transactions | Equal independent integer oracle totals | PASS; income 1,244,327,500 paise, expense 1,244,320,000 paise. This is not a browser/database throughput benchmark. |

### Confirmed Divergences

| Scenario / function | Expected | Observed | Finding |
|---|---|---|---|
| Opening account 10,000, no transactions; `reportNetWorth` | Assets 10,000 | Assets 0 | F10 |
| Canonical receivable 1,000, settled 200 | Receivable asset 800 | Asset 0 | F10 |
| Same receivable given 1 August, report 11 September | Outstanding 800, age 41 days | Zero outstanding and current-date fallback | F10 |
| No independently reported closing balance; `reportAccountReconciliation` | Unverified/needs external balance | `matched`, calculated balance copied into reported balance | F12 |
| Reversed event with retained effect | Excluded from posted cashflow | 400 outflow counted | F11 |
| September-filtered workbook supplied all ledger context | No August row in selected-period flow | August 400 expense still included | F09 |
| Mixed 400 expense, 70% business | Business 280, personal 120 | Business 0, personal 0, Mixed 400 | F13 |
| Contribution 200 bank credit in CA Income_Summary_Monthly | Income 0 | Income 200 | F27 |
| Own-account transfer credit 400 in CA income | Income 0 | Income 400 | F27 |
| Credit-card purchase 400, no bank bill payment yet | Consumption expense 400 | CA monthly expense sheet has no corresponding expense | F27 |
| Two active loans from Same Bank | Two unique amortization sheets | Duplicate worksheet name throws | F17 |
| Transaction master amount | Excel numeric cell | Formatted string | F16 |

The reversed-event probe deliberately supplies retained historical effects. Current delete tests successfully void/remove their effects; F11 does not mean every current delete is wrong. It means report functions do not protect themselves against event status and can misreport imported/historical/reversed contexts. Both defensive filtering and a verified ledger migration policy are needed.

Loan reducing-balance EMI should follow `P*r*(1+r)^n / ((1+r)^n - 1)` with a zero-rate branch, paise rounding and a final-installment residual adjustment. Existing loan-engine tests exercise schedule behavior, but a passing schedule helper does not rescue F01. Imported ongoing loans, fees, tax, penalty, flat/interest-only/manual modes and prepayment need explicit independently expected schedules before full lender comparison.

Tax/GST flags and missing-bill reports are metadata-oriented. The repo does not implement the agency brief's complete CGST/SGST/IGST invoice, credit-note, input-credit, partner distribution or filing calculations. No tax filing should be prepared solely from these unchecked exports.

## 8. PDF, OCR and Contribution Audit

### What Was Actually Verified

The native Kotak document was checked against a separate pdfplumber/Decimal-based oracle: row page, date, narration, reference, debit, credit and balance, plus opening/closing balances. All 1,240 rows matched across 36 pages. Twelve month filters, 25-row pagination and mobile containment passed. Extraction took about 927ms in the saved final local run, excluding setup/oracle work. The original document's hash remained unchanged and no real transactions were imported.

Synthetic browser tests verify normal and encrypted PDFs; wrong-password rejection followed by a correct password; five major-bank headings; multi-page layout; numbered Kotak continuation/header and summary handling; clean and password-protected scans through OCR; required OCR source confirmation; unsupported scanned content blocked; malformed non-PDF rejection. Server tests independently reject inconsistent opening/closing arithmetic, missing review, wrong dates/categories/owners, wrong debit/credit direction, selected bank/account inconsistencies and import replay.

### Limits and Bank Coverage

| Capability | Current bound / confidence |
|---|---|
| Named bank registry | 37 named entries plus one generic entry. These are labels/detection patterns, not 37 validated bank adapters. |
| Real-bank statement certified against an independent sample | Only the supplied Kotak document/layout in this audit. |
| HDFC, SBI, IndusInd, Axis | Synthetic heading/layout coverage; no representative real native/encrypted/scanned corpus supplied here. |
| Other named entries | ICICI, IDFC FIRST, BOB, BOI, Bank of Maharashtra, Canara, Central, Indian, IOB, PNB, Punjab & Sind, UCO, Union, Bandhan, CSB, City Union, DCB, Dhanlaxmi, Federal, J&K, Karnataka, Karur Vysya, Nainital, RBL, South Indian, Tamilnad Mercantile, YES, IDBI, AU, Jana, Equitas, Ujjivan: detection inventory only, not accuracy certification. |
| India-wide coverage | Not every cooperative, regional rural, payments, small-finance or foreign bank/channel/version is covered by the registry. |
| Upload limits | 20 MB, 60 PDF pages, 2,000 extracted rows; limits intentionally reject oversized input. |
| OCR | At most 12 OCR pages, English model, bounded rendering around 300 DPI and nine million pixels/page; timeouts/resource limits. |
| Confidence | Page OCR confidence below 80 blocks import; confidence is not a calibrated financial-accuracy percentage. |
| Unsupported cases | Poor scans, rotated/problematic layout, handwriting, language/model mismatch, novel tables or missing reliable balances may be blocked. |
| Passwords | Known password entered locally by the user; no password cracking/recovery or unattended unlock. |
| Categorization/personal-business | Suggestions require review. Bank narration alone cannot establish the purpose of a personal transfer or reimbursed expense. |

The correct promise is **reviewable, fail-closed extraction for validated layouts**, not "any PDF with 100% accuracy". Arithmetic consistency is necessary but cannot prove every narration/date/category was recognized correctly. Representative fixtures should be versioned by bank, account type, channel, statement vintage, page layout, language and encryption/scan status, with independent expected rows and known-negative cases. Keep private customer samples outside the repository; retain consented redacted fixtures or synthetic layout equivalents.

### Contribution Semantics

The original expense is retained. The friend's return is a linked refund/contribution with provenance, not a new income transaction. The server checks original ownership, date, amount, scope/category compatibility and remaining recoverable expense, including concurrent returns. Mixed/reimbursable/card-funded originals and same-import-batch original linking have restrictions; group participant splitting, multiple payer balances, unequal shares and settlement suggestions are not a complete implemented split-expense product. These are supported-scope limits, not grounds to silently guess an income category. F27 must be fixed so every exported view respects the same semantics.

## 9. Backup, Restore, Wipe and Audit Trail

There are three distinct export/backup mechanisms:

1. **Browser Full Backup:** PIN-confirmed but includes only 16 of 37 synced collection keys. It omits 21 keys, including FD/insurance/valuations, card statements/EMI plans, households, obligations, reconciliation, transfer links, source/history and audit collections. The UI's "every collection" claim is incorrect. Private attachments need an explicit binary inclusion/exclusion policy beyond metadata.
2. **Server privacy data export:** tested current PIN and own-user scope without credential fields. It is a portability endpoint, not evidence that UI restore handles all its contents.
3. **Operator SQL backup:** current private consistent dump passed a genuine restore into another disposable database with full table-content comparisons. This is a real improvement over filename/existence checks. At-rest encryption, offsite storage, retention, key recovery, monitoring and agreed RPO/RTO are not thereby implemented or verified.

The browser restore recreates parents with fresh IDs but leaves child foreign references at old IDs; the child is then rejected. Two parents remain after a three-record fixture, so the operation is not atomic. A rejected restore write also remains recoverable in the durable outbox. The wipe correctly refuses to proceed with unresolved outbox changes, but its rejection currently reaches an uncaught page error. An independently clean profile wipe still fails with 409 because it deletes referenced accounts before transactions. A domain-level atomic owner wipe is needed, not simply suppressing either safety check.

The visible Audit page reads mutable `auditLogs` collection data. Fresh API tests successfully fabricate a row and hard-delete it. The independent server `user_audit_logs` remains intact in the tested transaction path. Expose authenticated server audit read APIs, prohibit client mutation of authoritative history, define redaction/retention and preserve before/after/version/request provenance. Hash chaining/offsite anchoring may strengthen audit evidence but do not substitute for correct authorization and database backup.

## 10. Security and Roles

### Verified Improvements

- Logout invalidates a captured token for that session while preserving another session.
- PIN changes revoke old sessions, and competing changes cannot both overwrite the credential.
- Recovery configuration requires the current PIN; recovery hashing survives later PIN replacement.
- Temporary-PIN users cannot access finance until they change the credential.
- Cookie mutation requires CSRF; GET identity does not rotate a valid CSRF token.
- Unknown/opaque origins do not receive credentialed CORS; spoofed forwarded IP headers do not bypass the tested login limit.
- Development-server probes deny source/config/backup/dependency paths. Production-artifact checks exercise their applicable protections.
- Owner checks hold across all collection lists and tested item/write operations. SQL metacharacters remain data in the executed probe.

### Actual Role Matrix

| Role / principal | Personal finance | SaaS admin | Exports / sensitive actions | Status |
|---|---|---|---|---|
| Anonymous | None | None | Login/register/public policy/config only | Finance read denied; admin denial uses wrong 500 status. |
| Ordinary user | Own data; valid financial/household constraints apply | None | Plan gating on export UI; fresh PIN for privacy/full-backup and credential operations | Tested owner isolation, key sensitive flows. Not a nine-role agency permission system. |
| Admin | Admin console; no assumed universal cloud-row owner bypass | Users/plans/flags/branding/subscriptions | Privileged target actions; full destructive UI matrix not executed | Authorized read/render works; negative-role status defect. |
| Household owner/partner/viewer metadata | Local owner-scoped household policy | None | Tested viewer restriction on batch/sync/hard-delete | Not proven multi-login collaboration or agency employee/partner segregation. |
| Super Admin / Finance Manager / Accountant / Auditor / Project Manager / Employee / Viewer as agency roles | Not implemented as distinct company roles | Not implemented as a full role hierarchy | No company-wide permission/approval matrix | Scope gap; cannot mark these role workflows passed. |

Do not confuse a hidden frontend control with server authorization. Current account transactions have strong server checks, but invalid non-transaction records and the mutable visible audit remain. A finite local test cannot prove the absence of XSS, SSRF, all SQL injection variants, session fixation, timing/enumeration issues or insider abuse. Real TLS, cookie Secure behavior behind the deployed proxy, CSP enforcement, upload abuse at scale and rate-limit storage failure need staging tests.

Current local Node 20 and MariaDB 10.4 are beyond upstream community maintenance. MariaDB's table lists 10.4 community maintenance ending 18 June 2024; Node lists 20 as EOL. Choose a supported runtime/database and repeat compatibility tests; XAMPP's root/no-password local convenience must not become production configuration. Sources: [Node lifecycle](https://nodejs.org/en/about/eol), [MariaDB maintenance policy](https://mariadb.org/about/).

## 11. Confirmed Finding Register

Each ID counts once. "Acceptance" is the test required after remediation, not a claim that a fix was made in this audit.

### High / P1

**F01 - Fresh loan creation is blocked by hidden validation.** Source: `src/components/pages/LoansPage.tsx:646` and `:706`; `src/services/validators.ts:294`. Reproduce: New Loan, lender, principal/disbursement 12,000, tenure 12, interest 12, Save. Actual: dialog stays open with a generic >0 error; `emiAmountOverride` defaults to 0 but schema accepts only positive or absent. Normalize unused optional fields before validation and associate errors with visible controls. Acceptance: new/edited/imported loans with absent, positive and invalid overrides persist correctly; fresh loan schedule/principal verified after reload. Evidence: module workflow failure screenshot and dialog text.

**F02 - Full Backup silently omits 21 collection keys.** Source: `src/services/exportSafety.ts:27`; `src/components/pages/ExportPage.tsx:174`. Reproduce: PIN-confirmed Download Backup and compare keys to server contract registry. Actual: 16/37. Generate the export from a versioned canonical collection registry with owner filtering and manifest/checksums. Acceptance: seed every collection, export, verify complete keys/values and explicit attachment policy; restore into a fresh owner without credential leakage.

**F03 - JSON restore loses links and partially commits.** Source: `src/components/pages/ImportPage.tsx:483`. Reproduce: import one account, one category and one transaction referencing their old IDs. Actual: two regenerated parents persist; referenced transaction rejected. Implement full validation, owner remapping, ID preservation/remapping and transactional restore/rollback, including dependencies and schema version. Acceptance: all 37 collections, collisions, cross-owner input, restart, corruption and induced mid-restore failure leave either complete valid data or no change.

**F04 - Profile wipe fails on references and leaks rejected operations as page errors.** Source: `src/components/pages/SettingsPage.tsx:147`. Reproduce on a clean synthetic user with a cash settlement transaction: confirm wipe. Actual: account deletion attempted before transaction removal, 409, profile remains. After a failed restore, unresolved outbox protection blocks it even earlier. Implement one server-side atomic owner-scoped operation with pending-change safeguards, explicit confirmation, defined retention and actionable error UI. Acceptance: populated all-collection wipe, foreign-owner preservation, replay, injected failure and pending-outbox refusal; no uncaught page error. Evidence: `modules-final-verified/module-workflows.json`.

**F05 - Stale versionless updates overwrite newer data.** Source: `php/helpers/cloud_write.php:96`; `php/controllers/cloud_data.php:149`. Reproduce: edit a row to a newer version, then PATCH stale data without expected version. Actual: 200 and version 3, not conflict. Require version preconditions for existing entities, including delete/batch/sync; provide a constrained legacy migration path. Acceptance: concurrent versioned and versionless writers cannot silently lose edits.

**F06 - Non-transaction payload schemas are not enforced server-side.** Source: `php/helpers/cloud_payload.php:435`; `php/helpers/money_paise.php:110`. Invalid account and loan domain payloads persist with 201. Add typed collection validators for required fields, enums, finite/integer money, date ranges and domain bounds; UI validation alone is insufficient. Acceptance: valid/invalid boundary suites for all 37 collections through create, update, batch, sync and import, asserting no partial entity/receipt/audit changes.

**F07 - Non-transaction parent relationships allow orphan records.** Source: `php/helpers/cloud_write.php:116`. Orphan `goalContribs` and `emis` rows persist with 201. Expand same-owner relationship validation and deletion/reassignment rules beyond transactions. Acceptance: nonexistent/deleted/foreign parents rejected across all write paths; final graph validation accepts correctly ordered or unordered valid batches.

**F08 - Invalid webhook delivery can poison later authentic retry.** Source: `php/controllers/payments.php:52`. Reproduce: send invalid signature under an event ID, then the correctly signed raw body under the same ID. Actual: first 401, second 200/idempotent, payment remains `created`, event remains failed/signature-invalid. Validate before accepting the event identity as processed; model pending/processing/failed/committed state and atomic replay transitions. Acceptance: invalid-first/valid-later, transient-failure retry, concurrent replay, out-of-order, wrong owner/currency/amount and repeated captured event. See [Razorpay's validation guidance](https://razorpay.com/docs/webhooks/validate-test/) and `audit/webhook-retry.json`.

**F09 - Date-filtered CA exports retain out-of-period ledger effects.** Source: `src/components/pages/ExportPage.tsx:104`; `src/exports/xlsxExporter.ts:128`. Transactions are filtered but all events/effects are passed. A September workbook includes August cashflow. Define one report context/period policy, filter posted events and dependent effects consistently, and treat opening balances separately. Acceptance: day/month/FY/empty/reversed contexts reconcile master, summaries and footer.

**F10 - CA net-worth and Udhari ageing use inconsistent field semantics.** Source: `src/services/caReports.ts:331` and `:443`. Opening cash omitted; canonical receivable/payable fields ignored; ageing uses fallback aliases rather than `givenDate` and settled amounts. Use shared canonical account/Udhari/card/loan adapters and explicit valuation policy. Acceptance: 10,000 opening cash, 1,000 less 200 receivable, payable cases, deleted/settled records, 41-day ageing and card/loan liabilities agree across UI, bundle and Excel.

**F11 - CA flow calculations do not exclude reversed source effects.** Source: `src/services/caReports.ts:172`, `:205`, `:235`. Reversed/historical retained effects still affect reports. Restrict effects through a posted, owner/period-valid event map and explicitly define reversal representation. Acceptance: posted/reversed/deleted/orphan/migrated events cannot double-count; tie to server ledger invariants. Current delete-path rollback tests remain passing and are not contradicted by this narrower report defect.

**F12 - Reconciliation can report matched without independent evidence.** Source: `src/services/caReports.ts:587`. Missing `currentBalancePaise` falls back to the calculated balance itself, creating a zero mismatch and matched footer. Add an unverified/missing-source state, source date/account/amount provenance and proper period opening/closing checks. Acceptance: absent/stale/wrong-account balance cannot produce matched; a real independent closing balance can.

**F13 - Workbook mixed allocation ignores the split percentages.** Source: `src/exports/xlsxExporter.ts:391`. Mixed 400 at 70% business appears as Business 0, Personal 0, Mixed 400. Use the shared allocation helper and show gross mixed separately only if clearly labeled. Acceptance: 0/100/70/decimal splits, refund/contribution and paise residual cases reconcile exactly.

**F17 - Duplicate lender names break CA workbook generation.** Source: `src/exports/xlsxExporter.ts:357`; `src/components/pages/ExportPage.tsx:98`. Two active Same Bank loans attempt the same `Amort_Same_Bank` sheet. Use sanitized, length-bounded, uniquely suffixed names derived from stable IDs; add try/catch/finally to release UI loading state. Acceptance: same/long/invalid-character lender names, 100 loans and generation errors still yield valid unique sheets or an actionable non-stuck failure.

**F27 - CA monthly income/expense sheets confuse cashflow with consumption.** Source: `src/exports/xlsxExporter.ts:146`. `reportMonthlyCashflow` inflows/outflows are labeled Income/Expense. Contribution 200 becomes income 200; own transfer 400 becomes income 400; card purchase lacks expense until bank movement. Build true income/expense summaries from canonical intents, retain distinct gross cashflow sheets and reconcile linked refund effects. Acceptance: the user's 400/200 example yields income 0 and expense 200 in every UI/report/CSV/XLSX view; transfers, loan proceeds, repayments, card purchases/payments and Udhari movements retain their correct separate meanings.

### Medium / P2

**F14 - Visible audit history is forgeable/deletable.** Source: `src/components/pages/AuditPage.tsx:52` and generic `auditLogs` writes. Fresh create 201 and delete 200 succeed. Expose server-authored history, make authoritative audit append-only to clients and distinguish user notes from audit. Acceptance: owner cannot fabricate/update/delete server audit; admin access/redaction is permissioned and logged. Separate SQL audit retention currently passes.

**F15 - Formula-like values remain active in CSV serialization.** Source: `src/exports/xlsxExporter.ts:465`. Synthetic descriptions `=1+1` and `+1+1` are exported unchanged. Treat untrusted spreadsheet text safely, with explicit target-application tests; quoting alone is not a universal solution. Acceptance: formula prefixes, leading whitespace/control characters, delimiters and newlines remain inert text while legitimate numeric values stay numeric. See [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection). No malicious workbook was executed on the user's machine.

**F16 - Spreadsheet master amounts are text, not numbers.** Source: `src/exports/xlsxExporter.ts:66`. `mapTransactionRow` returns a formatted string. Export typed numeric INR values with number formats and exact paise/amount columns where needed. Acceptance: numeric cells sum/filter correctly and equal independent totals; INR punctuation does not become string data.

**F18 - Admin denials return 500 and wrappers expose exception messages.** Source: e.g. `api/admin/dashboard.php:10`, shared pattern across admin wrappers. All 18 negative-role probes deny access with 500. Map auth exceptions to 401/403 and unexpected failures to a sanitized 500/request ID. Acceptance: all nine endpoint/method negative cases deny without side effects and reveal no SQL/internal details.

**F19 - Form labels and dialog focus are inaccessible.** Source: `src/components/ui/Label.tsx:21` and account form usages. Five unnamed account inputs, unnamed icon controls, no opener-focus restoration after Escape. Wire stable id/htmlFor/aria-describedby, label tools, preserve focus, and associate errors. Acceptance: role/name selectors work, keyboard-only sequence and screen reader narration verified, no ambiguous focus after close.

**F20 - Mobile Categories and Audit navigation is missing.** Source: `src/components/layout/Sidebar.tsx`, `CommandPalette.tsx` navigation definitions. Direct URLs work but mobile controls cannot reach them. Provide complete accessible mobile navigation. Acceptance: every permitted NavKey reachable at 360/390px without typing a URL; active item and back behavior correct.

**F21 - Main bundle is large and pages are statically imported.** Source: `src/components/layout/AppShell.tsx:5`; build log. Main JS is approximately 2,158 kB raw / 642 kB gzip. Use measured route/report/chart splitting and preserve preloading/worker behavior. Acceptance: agreed bundle and mobile web-vitals budgets, no blank lazy states and no worker/CSP regressions; do not use this audit's pure-engine benchmark as UI performance evidence.

**F22 - CI's acceptance gate is broken/incomplete.** Source: `.github/workflows/ci.yml:39`. Removed `basic` reporter fails startup; automatic branch filters list main/develop rather than the observed master; audit is nonblocking with `|| true`; strongest database/browser regressions are not a required PR gate. Update supported reporter, intended branch policy and isolated integration jobs. Acceptance: a real PR runs and blocks on seeded finance/security regressions. Official reporter change: [Vitest migration guide](https://vitest.dev/guide/migration.html).

**F23 - Observed local/toolchain database runtimes are unmaintained.** Node 20 and MariaDB 10.4 are EOL; CI requests Node 20. Upgrade to supported pinned versions with explicit PHP/database compatibility tests and least-privilege deployment credentials. Acceptance: supported-runtime CI and staging restore/migration/load tests. This does not allege a discovered remote exploit or establish the unseen production server's runtime.

**F24 - Legacy acceptance scripts no longer provide reliable green/red signals.** Five of six isolated legacy scripts fail from missing valid category/CSRF fixtures, overlong usernames or outdated idempotency expectations. Some rejection assertions could pass simply because CSRF rejected before domain validation. Repair setup contracts and add fixture-health assertions. Acceptance: positive controls first, then negative case with the intended exact error, isolated cleanup and no fixed real database resets.

### Low / P3

**F25 - Export descriptions overstate or misstate contents.** Source: `src/components/pages/ExportPage.tsx:279`, `:442`. UI says 16 sheets; actual ordinary workbook contains 21 plus conditional loan sheets. Full Backup says every collection although 21 are omitted, with the substantive data-loss risk counted in F02. Derive labels/counts from an export manifest. Acceptance: displayed sections/record counts/format match the downloaded artifact and selected period.

**F26 - AppleDouble metadata contaminates tooling inventory/coverage.** Source: `vitest.config.mts` coverage exclusions and workspace `._*` files. Coverage warns about parse failures on metadata. Exclude metadata consistently across coverage, packaging, source scans and test discovery without deleting unrelated user changes. Acceptance: metadata-present workspace produces clean deterministic results and no metadata in release artifacts.

## 12. Legacy Tests, Operations and Performance

| Legacy script | Fresh isolated outcome | Reason / interpretation |
|---|---|---|
| `api-e2e.mjs` | Fails | 55 PASS / 10 FAIL log lines; fixture transaction lacks valid category under stronger server references. |
| `account-endpoints-e2e.mjs` | Fails | Missing CSRF in setup/snapshot expectations; not a completed account-lifecycle verification. |
| `phase-04-validation-e2e.mjs` | Fails | Positive payload rejected by CSRF; negative cases cannot certify intended validation. |
| `api-vnext-collections-e2e.mjs` | Fails | Reusing a mutation key for a different payload now properly returns 409; old expectation obsolete. |
| `webhook-replay-e2e.mjs` | Fails | Generated username exceeds schema length before real replay assertions complete. |
| `webhook-ownership-e2e.mjs` | Passes | Ten ownership/HMAC/amount/replay checks pass; invalid-first poisoning required the new dedicated probe. |

The older load script uses a hand-written loop rather than importing the real finance engine. The new 50,000-row check invokes actual production functions and independently totals the inputs, but still does not exercise HTTP, SQL, DOM rendering, concurrent tenants or browser memory. The 1,240-row private statement test checks paginated review but is not a 50,000-row transaction-table performance test.

The build emits a roughly 454 kB statement chunk, 18 kB OCR integration chunk, 1,079 kB PDF worker and 63 kB CSS; OCR engine/model assets add their own downloads. Capture cold/warm mobile timing, memory and cancellation under a staged network profile. Prefer indexing/pre-aggregation and lazy pagination over claiming a local arithmetic loop is production load certification.

Operational concerns not counted as freshly reproduced application defects: legacy plaintext JSON backup under the project backup path; SQL dump encryption/offsite/retention not established; trusted reverse-proxy and Apache HTTPS/header behavior untested on deployment; historical migration replay incomplete; no demonstrated alerting/on-call runbooks/RPO/RTO rehearsal. Do not run old fixed-database reset/certification scripts against user data. A script titled "dry run" does not make SQL DDL transactionally reversible.

## 13. Agency Brief Gap Matrix

The user's brief names an IT-services finance ERP. The following is an explicit coverage decision, not an assumption that similarly named personal modules satisfy the brief.

| Requested agency module | Current repository status |
|---|---|
| Dashboard | Personal finance dashboard exists; project/client/GST/partner KPIs absent. |
| AI Insights | Rule-based personal finance suggestions; no verified agency LLM/RAG service. |
| Clients | No dedicated client master/statement/receivable workflow. |
| Quotations | No quotation maker, approval/status lifecycle, package comparison or project/invoice conversion. |
| Invoices | No invoice maker, FY numbering, line-item GST, credit/debit notes, approval or PDF/DOCX invoice workflow. |
| Receipts | Personal transaction rows are not numbered agency receipts linked to verified invoice payments. |
| Receivables | Udhari is informal debt, not customer invoice ageing/collection accounting. |
| Projects | No project margin/cost/approval/close lifecycle. |
| Payments | Personal finance movements and SaaS subscription provider payments exist; not client payment verification/proof/receipt operations. |
| Expenses | Personal/business categorization exists; no draft-submit-approve-pay company workflow. |
| Vendors | No vendor master, GST inputs or payable ageing workflow. |
| GST Register | Tax/GST flags and export sheets only; no full output/input/payment/adjustment filing register. |
| Partner Profit | No approved allocation snapshots or distributable/cash-eligible profit engine. |
| Partner Payouts | Household member metadata is not payout request/approval/payment/reversal. |
| Subscriptions | SaaS billing and personal recurring expenses, not a complete client AMC/retainer renewal system. |
| Other Income | General personal income, not separately audited agency income classification. |
| Adjustments | Transaction/ledger adjustment intent exists; no approved company journal/closed-period adjustment workflow. |
| Admin Usage | SaaS counters, not agency admin-charge allocation/accounting. |
| Budgets | Personal category budgets, not project/vendor/cost-center controlled budgets. |
| Reports | Personal finance reports, with the open correctness issues above. |
| CA Export Center | Client-side workbook exists; complete cover note/GST/invoice/proof/month-close ZIP pack absent. |
| Documents | Statement-local review and attachment metadata are not a private multi-module document-management system. |
| Month Close | No company-period lock/reopen and approval enforcement across finance APIs. |
| Approvals | No full reviewer queues, segregation of duties or maker-checker workflow. |
| Audit Logs | Client-visible history and separate SQL server audit; authoritative UI/retention gap. |
| Settings | Personal preferences and SaaS branding; not complete company GST/bank/FY/invoice-series configuration. |
| Users / Roles | User/admin plus owner-scoped household policies, not the nine agency roles in the brief. |
| Notification Center | In-app alerts exist; external scheduled delivery unverified. |
| Global Search | Command palette exists; mobile module coverage incomplete. |
| Hidden/internal modules | Sync review, ledger diagnostics, local statement review and admin pages cataloged; no basis to infer absent ERP functions from collection names. |

Invoice/quotation/GST/partner-payout combinations requested in the brief therefore have status **NOT IMPLEMENTED / NOT EXECUTABLE**, not pass. DOCX installed as a dependency does not establish a working invoice/document export. No private document proof index, approved CA ZIP export job, expiring role-scoped document download or month-close lock was demonstrated.

## 14. Remaining Test Matrix and Release Gates

The full executed assertion matrix is linked above. The following combinations still need explicit coverage before stronger claims:

| Test family | Required next cases | Release implication |
|---|---|---|
| All collection contracts | Valid/invalid required fields, enums, dates, money, owners and parent graphs for create/update/delete/batch/sync | Block production until server validation/reference gaps close. |
| Domain multi-writes | Failure between goal/Udhari/card/loan steps; double clicks; concurrent contributions/settlements; retries and rollback | Happy-path persistence alone is insufficient. |
| Reports | True income vs cashflow; all intents; refunds/reversals; date/FY/empty period; canonical legacy adapters; typed export totals | Block CA sharing and financial reliance. |
| Backup/restore/wipe | Every collection, binary policy, ID collisions, cross-user restoration, old schema, partial failure, repeated request, pending queue | Block use as a sole data store. |
| Banks/PDF | Real native/encrypted/scanned samples per layout/version; corrupt/oversized/rotated/multi-account/low-confidence negatives; OCR ground truth | Do not expand accuracy claim beyond the supplied Kotak sample and synthetic fixtures. |
| Browser/accessibility | Complete keyboard and screen-reader paths, 200% zoom, contrast, Safari/Firefox, real phones, all original requested widths | Current Chromium containment result is only partial acceptance. |
| Billing | Real provider test checkout, HMAC fail/retry ordering, expiration/cancel/renew/refund/dispute, feature transitions | Keep payment enablement gated. |
| Permissions | Authenticated user/admin mutation matrix, genuine multi-user household tests; future agency role/action matrix | No enterprise role claims until implemented and verified. |
| Deployment | HTTPS/CSP/cookie/proxy checks on intended server; least-privilege DB; supported runtimes; secret scanning/history; migrations | Local artifact test is not staging certification. |
| Reliability | Load/soak, disk-full/rate-store failure, restore after machine loss, offsite encryption/key recovery, incident alert drill | Define and measure production service objectives. |

## 15. Implementation Roadmap and Prompts

Implement in small independently verified changes. Keep the existing green atomic/session/PDF/contribution behavior intact. Do not refactor unrelated user edits, relax server checks to make a broken UI pass, or label skipped scenarios "passed".

### Stage 1: Recoverability and Core Workflows

Owner: backend/data lead with frontend support. Priority: P1. Effort: medium to large because all collections and failure paths are involved. Fix F01-F07 and F14. Introduce versioned schema/relationship validation and atomic owner-scoped restore/wipe APIs. Recover pending changes safely. Acceptance: populated all-collection round trips, owner isolation, expected-version conflicts and induced-failure rollback, plus normal loan creation after reload.

### Stage 2: Financial Reports and Exports

Owner: finance-domain engineer with accountant-reviewed expected fixtures. Priority: P1. Effort: medium to large. Fix F09-F13, F16/F17/F25/F27 and CSV F15. Use one posted/period/owner-scoped report context, distinguish cashflow from income/consumption, preserve opening balances, canonical debt data and split/refund intent. Acceptance: independent exact-paise examples match dashboard, report bundles and parsed files. Keep explicit unverified reconciliation until a source closing balance exists.

### Stage 3: Payment and Release Security

Owner: backend/security/DevOps. Priority: P1/P2. Effort: medium. Fix F08/F18/F22-F24. Require a supported-runtime CI matrix, current fixtures, realistic provider replay tests, private least-privilege staging and encrypted offsite backup restoration. Validate real deployment headers/CSP/cookies and rate-limit failures before payment enablement.

### Stage 4: Usability and Validation Expansion

Owner: frontend/QA. Priority: P2. Effort: medium. Fix labels/focus/mobile navigation, split large bundles, add cross-browser keyboard/zoom/contrast checks, bank-specific ground-truth fixtures and review-focused OCR correction. Add categories learned only from user-confirmed classifications; never convert confidence into a guaranteed income/personal-business decision.

### Stage 5: Separate Agency Product Scope

Owner: product/finance/architecture team. Priority: separate planned project scope after current data integrity stabilizes. Effort: large. Design clients/projects/invoices/quotations/receipts, approval states, company roles, GST/accounting policy, month close and document access together. Then build milestone/AMC/retainer billing, receivable/vendor ageing and cash-eligible partner payouts with independently reviewed domain tests. Add read-only AI explanation only after data provenance and report semantics are reliable.

### Recommended Next Implementation Prompt

> Read docs/FULL-PROJECT-AUDIT-2026-09-11.md and the current source. Work on the existing dirty SparowVault worktree without reverting unrelated changes. First fix F01-F07 and F14: usable fresh-loan validation, required version preconditions, server schemas and same-owner relationships for every synced collection, complete versioned backup, transactional ID-safe restore and atomic profile wipe with pending-outbox safeguards, and authoritative server audit reads. Add positive controls and independently expected failure/rollback tests in disposable databases. Preserve all passing statement, contribution, session, owner-isolation and durable-outbox regressions. Verify real UI save/reload, all-collection restore equivalence and absence of partial writes; run typecheck, lint, unit, API, browser and production-artifact checks. Report exact passes, failures and remaining release blockers. Do not claim production-ready, deploy or push until the explicitly agreed release gates pass.

## 16. Final Verdict

| Use | Decision |
|---|---|
| Local demo with synthetic data | Yes, with the documented broken workflows and disabled billing understood. |
| Internal acceptance testing | Yes; this is the appropriate current phase. |
| Testing the supplied Kotak statement | Yes for review/read-only validation; do not infer all-bank accuracy or auto-confirm categories. |
| Sole authoritative storage for real financial records | **No** until backup/restore/wipe/schema/reference/version gaps are closed. |
| Unreviewed CA/accountant export | **No** until financial period, classification, net-worth, reconciliation and workbook defects are fixed. |
| Public production/payment enablement | **No** until high defects and deployment/security/operational gates are verified. |
| Complete SparowFinanceOS agency ERP | **No**; major business modules and roles are not implemented in this repository. |

The practical next step is remediation with the reproducible tests added here, not another general claim of perfection. This report distinguishes verified working behavior, confirmed defects, source-level risks, missing features and unexecuted scenarios so those decisions can be made honestly.
