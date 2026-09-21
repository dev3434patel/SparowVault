# Indian Bank Statement Ingestion

## Executive Assessment

SparowVault should accept statements through a review-first pipeline, not promise that every PDF becomes correct accounting automatically. Four distinct questions must remain separate: can the document be opened, can its transaction table be extracted, do the extracted values reconcile, and what accounting purpose does each transaction represent? A successful result at one layer does not establish correctness at the others. A password-protected scan, for example, needs both decryption and OCR; neither operation identifies whether a credit is salary, a loan, a refund or a friend's contribution.

The strongest available project-specific evidence is one independently checked Kotak annual statement. The supplied 36-page document produced 1,240 transactions in the earlier validation, with seven fields per row compared against a second extraction implementation. This establishes a useful regression case, not universal Kotak support. HDFC, SBI, Axis and IndusInd have synthetic layout tests; they still need representative real statements from each relevant export channel. The current implementation status and fresh test results belong in `EXPANSION-IMPLEMENTATION-STATUS.md`, separately from this research assessment.

Official bank sources establish download channels, available formats and sometimes password conventions. They generally do not publish a stable, versioned transaction-table specification. Accordingly, this report does not infer exact column positions from a help article or equate a bank selector entry with a certified parser. Recommendations below are engineering judgments informed by the cited material, not bank endorsements or a guarantee of accuracy.

## Coverage Universe

An India-wide program must distinguish public-sector banks, private-sector banks, small-finance banks, payments banks, regional rural banks, foreign banks operating in India and cooperative institutions. It must also distinguish account products: savings/current deposit accounts, overdrafts, loans, credit cards, wallets and consolidated relationship statements. The RBI directories provide the institutional starting point, not a PDF schema catalogue.[^1]

Directory freshness matters. Historical RRB lists are particularly misleading after amalgamation. The Department of Financial Services publishes a newer list of 28 RRBs, updated in January 2026; its April 2025 notification describes amalgamations effective in May 2025. Old and new bank names may therefore both be legitimate in historical statements. A parser registry needs an effective date and legacy aliases, not just a current brand name.[^2]

The 28-bank RRB list covers Andhra Pradesh Grameena, Arunachal Pradesh Rural, Assam Gramin, Bihar Gramin, Chhattisgarh Gramin, Gujarat Gramin, Haryana Gramin, Himachal Pradesh Gramin, Jammu and Kashmir Grameen, Jharkhand Gramin, Karnataka Grameena, Kerala Grameena, Madhya Pradesh Gramin, Maharashtra Gramin, Manipur Rural, Meghalaya Rural, Mizoram Rural, Nagaland Rural, Odisha Grameen, Puducherry Grama, Punjab Gramin, Rajasthan Gramin, Tamil Nadu Grama, Telangana Grameena, Tripura Gramin, Uttar Pradesh Gramin, Uttarakhand Gramin and West Bengal Gramin. These names identify future sampling work, not validated layouts.[^2]

This report provides a substantial domestic-bank channel inventory below. It does **not** establish exhaustive, current per-bank PDF structures for every foreign bank, cooperative bank, payments bank or RRB. No personal statements should be harvested from search results to fill that gap. Use consenting owners' redacted documents or bank-provided samples, retaining layout and transaction consistency without retaining unnecessary identifiers.

## Bank Evidence Matrix

“Channel evidence” means an official page supports the stated capability. “Layout pending” means real document geometry and field-level correctness remain unverified in this project. Corporate-channel evidence must not be promoted to a retail-format claim.

| Bank | Official channel evidence | Engineering consequence / verification status |
| --- | --- | --- |
| Kotak Mahindra | Netbanking sitemap includes account and annual statement functions.[^3] | One supplied numbered annual export validated locally; logo may be an image, continuation pages may omit table headers. Other channels pending. |
| HDFC | Account FAQs describe PDF, Excel and other downloads; a June 2026 article describes a Customer ID password for its named netbanking flow.[^4] | Keep password user-entered and channel-specific. Synthetic column tests only; current retail/email/business layouts pending. |
| SBI | OnlineSBI exposes date-range account statements and Excel/PDF outputs.[^5] | Test transaction date separately from value date, wrapped references and running balance. Synthetic layout only. |
| IndusInd | IndusNet material describes account history and Excel/PDF statements.[^6] | Separate mobile and web samples. Synthetic layout only. |
| Axis | NEO corporate documentation lists PDF, Excel, CSV, TXT and MT940.[^7] | These are corporate capabilities, not proof of retail PDF geometry. Synthetic deposit layout only. |
| ICICI | Account-statement service describes historical statements; online-services material includes PDF/CSV.[^8] | Sample retail, business and emailed variants separately; layout pending. |
| IDFC FIRST | Customer support describes selecting statement periods/formats and download/email delivery.[^9] | Do not invent a universal password formula; layout pending. |
| Bank of Baroda | Official guidance describes Excel/PDF/TXT for netbanking and protected PDFs through bob World/email.[^10] | At least two channel profiles needed; layout pending. |
| Bank of India | Omni Neo material lists statement facilities and multiple downloadable formats.[^11] | Distinguish “Bank of India” from State/Central/Union Bank of India in headings. Layout pending. |
| Bank of Maharashtra | Internet-banking page describes statement services.[^12] | Exact column ordering/password format not certified; layout pending. |
| Canara | Corporate ai1 material describes account-statement access.[^13] | Corporate evidence alone cannot establish retail PDF structure; layout pending. |
| Central Bank of India | No sufficiently specific current statement-format source established in this assessment. | Bank-name recognition only; obtain direct bank help and samples. |
| Indian Bank | IndSMART and internet-banking pages describe statement access.[^14] | Distinguish South Indian Bank; layout pending. |
| Indian Overseas Bank | Mobile-banking services describe statement export formats including PDF and spreadsheet/text variants.[^15] | Test channel and date-range differences; layout pending. |
| Punjab National Bank | Official WhatsApp document describes password-protected statements and a bounded date window.[^16] | Channel/date limits are not PDF geometry; layout pending. |
| Punjab & Sind Bank | Customer-service pages describe issuance of account statements.[^17] | Exact export/password/layout evidence remains incomplete. |
| UCO | mBanking Plus describes a digital passbook.[^18] | A passbook facility does not establish downloadable statement geometry; layout pending. |
| Union Bank of India | Accessibility manual documents downloading statements; some period limits are product-specific.[^19] | Do not transfer loan-account limits to savings accounts; layout pending. |
| Bandhan | FAQ describes protected CASA statements; very large histories may require branch assistance.[^20] | Long histories and protected documents need separate fixtures; layout pending. |
| CSB | Digital-banking guide documents statement download and a DOB-based password for that channel.[^21] | Ask for the password in the app, not for DOB in chat; layout pending. |
| City Union Bank | Netbanking documentation describes detailed/mini statement and delivery facilities.[^22] | Exact downloadable table format remains unverified. |
| DCB | No sufficiently specific official PDF-layout source established here. | Bank selector is not certification; sample required. |
| Dhanlaxmi | Account-details guide illustrates mini-statement export.[^23] | Mini statements are not proof of complete-period opening/closing balances. Full statement pending. |
| Federal | Official guide describes account downloads; FedOne documents corporate format choices.[^24] | Retail and corporate profiles must remain separate; layout pending. |
| Jammu & Kashmir | No sufficiently specific official PDF-layout source established here. | Bank-name recognition only; sample required. |
| Karnataka | Historical official app guidance indicates statement facilities, but does not establish current PDF geometry. | Treat historical app guidance as weak evidence; current samples pending. |
| Karur Vysya | KVB eBook and DLite support material describe statement facilities.[^25] | Mobile eBook, emailed and netbanking PDFs may differ; layout pending. |
| Nainital | Official internet-banking statement download guide is available.[^26] | Channel workflow known; actual current transaction geometry pending. |
| RBL | BizBank guide documents statement download formats.[^27] | Business product evidence only; retail formats pending. |
| South Indian | No sufficiently specific current PDF-layout source established here. | Distinguish brand from Indian Bank; sample required. |
| Tamilnad Mercantile | Mobile-banking page describes download/email statement facilities.[^28] | Exact date/narration/amount table pending. |
| YES | Internet-banking FAQ describes CSV/PDF and handling larger transaction histories.[^29] | Large-report and ordinary-download paths need separate validation; layout pending. |
| IDBI | Official help and mPassbook material describe statement downloads, including PDF.[^30] | Bilingual content needs dedicated testing; English OCR is not Hindi OCR. |
| AU Small Finance | AU 0101 FAQs describe PDF/XLS/CSV download.[^31] | Do not treat available CSV as already implemented statement-CSV ingestion; layout pending. |
| Jana Small Finance | Mobile-banking page describes PDF/Excel statement access.[^32] | Layout pending. |
| Equitas / Ujjivan | Registered as selectable bank names in this stage, without real-layout validation. | No format certification or password convention claimed. |

Other small-finance and payments institutions, foreign-bank branches, cooperative banks and RRBs require a maintained coverage register with owner, source date, channel, specimen hash and test status. Adding names without specimens should remain explicitly “unvalidated.” Generic extraction may successfully read an unfamiliar bank's table, but that result still passes the same reconciliation and review gates. Brand overlap must be resolved by matching spans, not suppressing every occurrence of a shorter name across the whole document; otherwise a combined two-bank PDF can be mistaken for one bank.

## Document Pipeline

### Opening And Privacy

Validate file size and PDF signature before parsing. Open the selected bytes locally with PDF.js and prompt only when the library reports that a password is needed or incorrect. Passwords should not enter analytics, error logs, local storage, filenames, URLs or import requests. Forgetting a password is not an invitation to brute-force it: obtain the correct bank-provided password or download an accessible copy.

Encryption and scanning are independent axes. Test ordinary text PDFs, encrypted text PDFs, ordinary image PDFs, encrypted image PDFs, and hybrid documents. PDF.js should render decrypted pages for OCR in memory. OCRmyPDF is a useful server-side alternative, but its documentation explains that encrypted PDFs must first be decrypted; it is not a replacement for password handling.[^33]

This stage uses local browser processing, avoiding third-party statement uploads. That reduces disclosure but is not a complete malware, browser-memory or device-security guarantee. PDF size, page count, raster dimensions, parsing time and worker lifetime all need limits. OWASP recommends layered file validation and containment; no single extension or MIME check is sufficient.[^34]

### Extraction And Geometry

Text PDFs should use positional tokens, preserving page, coordinates, dates, references, narration and separate monetary columns. Reading-order text alone can swap debit and credit or merge wrapped rows. Profiles should describe header aliases, column anchors, date grammar, page continuation and summary rules. A profile identifier needs bank, product, channel and layout version; “HDFC parser” is too coarse.

The existing Kotak numbered export illustrates why metadata and table rows require different handling. A statement period can sit near an image logo, numbered transactions can continue on a page without headers, and opening/closing balances can be repeated in a later summary. The parser must corroborate these structures, reject conflicting balances and avoid reading legal/footer text as transactions. Bank names in narration are not document branding.

For scans, Tesseract.js supplies OCR and positional block/line/word output; worker code, WebAssembly and language data can be hosted with the application. The deployed implementation must pin and package these assets together, rather than depending on an unrelated public CDN at runtime.[^35] Tesseract's quality guidance emphasizes image resolution, skew and segmentation; it also notes table-recognition limitations. OCR is a character-recognition component, not a financial table or accounting engine.[^36]

The current bounded OCR design uses English recognition, an approximately 300-DPI render constrained by a pixel budget, sequential pages, cancellation and timeouts. Automatic mode considers pages with very little usable text; forced mode covers image tables with a text header. This does not establish support for handwritten entries, arbitrary rotation/skew, multilingual scripts, severely compressed photographs, torn pages or every hybrid structure. These should fail visibly or enter a correction workflow, never manufacture amounts to make balances fit.

The TabSniper paper studies bank-statement table detection and structure recognition, including layout variability. Its findings motivate a separate layout-recognition layer when rule profiles cease to scale; they do not provide a ready-made, universally accurate bank importer for this application.[^37]

### Normalization And Reconciliation

Normalize amounts to integer paise with explicit accepted number grammars. Reject ambiguous characters such as the letter O in a numeric amount; do not silently substitute digits because a balance would then work. Validate actual calendar dates, preserve transaction date versus value date, and retain the statement's original row order. Resolve Indian/international comma grouping deliberately; monetary signs and CR/DR suffixes belong to field semantics, not generic string cleanup.

For every row in chronological order, require `previous balance + credit - debit = current balance`. Independently compare opening balance, closing balance, aggregate debit/credit and any printed totals/counts available. Excluded import rows still participate in whole-document balance checks. An excluded transfer cannot disappear from the reconciliation arithmetic just because it will not be posted.

Reconciliation is necessary but insufficient. Two omitted transactions can net to zero, a wrong date can leave amounts unchanged, and paired OCR errors can still balance. A professional evidence record should report row-count agreement, date/reference agreement, money agreement and provenance separately. A confidence number is not a calibrated probability of statement accuracy. The current OCR confidence threshold is a conservative review gate, not an accuracy percentage.

For unknown layouts, a future correction screen should expose source crops beside each field, original extraction, corrected value, actor, time and reason. Recompute every invariant after an edit. Keep confirmed corrections distinct from the extracted source and bind the final import receipt to the corrected review version. The present stage has source viewing and review gates, but not a complete arbitrary-field OCR correction editor.

## Accounting Semantics

Bank direction and accounting purpose must be separate fields. Credit means money arrived in that account; it does not imply earned income. Own-account transfers, loan proceeds, purchase refunds, employer reimbursement, customer advances and expense contributions are all examples requiring additional context. Similarly, a credit-card bill payment is cash outflow and liability reduction, not a second purchase expense.

For the shared-meal example, record the original INR 400 payment as an expense. Record the friend's INR 200 payment as a **contribution return**, linked to that expense and received into the correct cash/bank account. Under the personal cash-basis policy implemented here, it is a contra-expense: original gross expense INR 400, recovered contribution INR 200, net expense INR 200, earned income INR 0. Bank cashflow still displays the INR 400 debit and INR 200 credit. Do not rewrite or erase the original bank payment.

Multiple friends can return separate amounts against one expense. Merchant refunds and friend returns share the unrecovered-amount ceiling so their combined total cannot exceed the original expense. The server must lock the owner's write path when validating this ceiling, because two individually valid concurrent returns can otherwise over-recover. Editing the original amount, category or type must revalidate existing recoveries; deleting the original must not leave orphan credits. Owner checks remain mandatory even when two users happen to have identical entity IDs.

The new intent is `expense_contribution`, stored on the existing canonical `refund` transaction type. Reusing that ledger behavior preserves account-increase and expense-decrease effects. It is not a migration that labels all incoming UPI payments as contributions. Existing unrelated refunds retain their purpose. Employer receivables and mixed personal/business allocations remain separate workflows; this stage blocks contributions on those originals instead of silently applying an incorrect allocation. Contributions against an expense not yet imported in the same PDF currently require importing the expense first.

Cross-month returns are recognized on their actual receipt date in this cash-basis treatment. That can create a negative net category expense in a later month; lifetime net cost and monthly cashflow answer different questions. Accrual accounting, tax deductions, GST/ITC treatment and business cost-sharing policy require an accountant-approved specification before business reporting can be certified. This product design is not tax advice.

## Classification And Patent Review

Classification should propose a purpose and category with a reason, never change the bank's debit/credit values. Merchant matches can suggest Food & Dining; they cannot prove that a restaurant charge was personal rather than a client meeting. Generic person-to-person UPI narration is particularly weak evidence. Require explicit confirmation of personal/business scope and contribution links. User-specific rules should be reversible, scoped to that owner and versioned, with a preview of their effects before bulk application.

Google Patents publication US20220358296A1 describes NLP-based categorization of text sequences, including transaction-document use cases. Its disclosure separates document conversion from downstream categorization and discusses preprocessing and vector/model-based classification. This is useful architectural context, not an off-the-shelf model, benchmark or implementation licence. Google Patents itself qualifies its displayed legal-status information; the linked grant and jurisdictional family require professional claim analysis before making freedom-to-operate assertions.[^38]

No proprietary patent algorithm has been copied as a promised accuracy solution. Recommended implementation order is deterministic purpose rules with explanations, owner-confirmed merchant memory, an explicit unknown bucket, and only then an optional evaluated statistical classifier. Financial values, imports and journal effects remain behind deterministic validation and user approval regardless of any future model confidence.

## Security And Operations

Revocation must be enforced server-side. A new database-backed session record binds a random session identifier to the credential state; logout removes that session, and PIN changes make earlier credential-bound sessions invalid. Forced PIN changes must block financial endpoints as well as route the frontend to a change screen. Recovery answers need independent salts, otherwise a PIN-salt rotation can accidentally invalidate recovery. Recovery changes require the current PIN and rate limits. These controls follow the session and authentication principles described by OWASP.[^39]

Cookie-authenticated mutations need CSRF protection. Reissuing a CSRF token on every read introduces multi-tab races; a valid existing token should remain stable on `me` reads, and clients should prefer the current shared cookie over stale tab storage when available. Proxy-supplied IP headers are trustworthy only from explicitly configured proxies. Rate-limit storage failure should fail closed rather than silently remove the control.

Dependency maintenance is another gate, not a certification stamp. The old npm `xlsx` package is not the current SheetJS distribution. SheetJS documents an authoritative 0.20.3 tarball and explains that the public npm package is outdated; the project now uses the pinned official tarball with lockfile integrity.[^40] Vite/Vitest upgrades also require rebuild and browser regression tests rather than accepting a clean dependency scan alone. Local Node support and the production runtime lifecycle must be checked independently.[^41]

Database backup, full-profile JSON backup, application restore and profile wipe are different operations. A production recovery test must create a real backup artifact, restore it into a newly created isolated database and compare schema, all collection contents, foreign relationships, ledger effects and audit records. Copying tables and comparing only row counts is not equivalent. Encryption, off-site retention, least-privilege backup access, recovery-point/recovery-time targets and alert delivery remain deployment requirements. No real-data reset or live wipe should be performed as a shortcut to verification.

## Acceptance Program

For each bank/channel/layout, obtain permitted specimens covering: zero transactions, one page, multi-page continuation, year boundary, negative balance/overdraft where relevant, same-day repeated amounts, wrapped narration, UPI/NEFT/IMPS references, debit/credit totals and protected PDF. Scan coverage should add clean image-only, protected image-only, hybrid, skewed, rotated, low contrast, multilingual, missing page and deliberately unreadable cases. Product types without applicable running balances need a different profile and explicit validation policy.

Record specimen hashes and non-PII metadata, not plaintext customer statements in Git. Build the expected rows through an independent reader plus visual verification; never use the parser under test to generate its own expected answer. Compare each field exactly, including dates and references, not only grand totals. For a finite certified corpus, require every expected field to match or the document to be explicitly blocked with the expected reason. Publish that corpus coverage; do not turn it into a claim that unseen PDFs are 100% accurate.

API acceptance must prove atomicity, ownership, CSRF, duplicate import suppression, payload-bound idempotency, invalid-reference rejection, concurrent contribution limits and no partial ledger/audit writes. UI acceptance must prove password retry, cancellation, progress, source viewing, mobile containment, monthly filtering, contribution creation/editing and review-only analysis without automatic posting. The actual release artifact must repeat these checks with locally hosted OCR assets and its deployed CSP. Production TLS/proxy/CSP, real-device memory and full restore drills require additional environment-specific evidence.

## Implementation Work Orders

1. **Bank corpus expansion:** Add one bank/channel at a time. Read its official source, obtain a permitted redacted sample, identify geometry, create an independent expected-row oracle and document coverage. Do not widen a regex merely to make a grand total pass. Acceptance: exact row/field comparisons and explicit unsupported-layout behavior.
2. **OCR correction workflow:** Add source crops and editable extracted fields with immutable before/after provenance. Revalidate the whole statement after every correction. Support typed failure reasons for unreadable, rotated, multilingual and oversized documents. Acceptance: no guessed amount posts, keyboard/mobile editing works, aborted workers terminate, and all imported corrections are auditable.
3. **Contribution completion:** Preserve gross cost, recoveries and net cost; add participant/allocation records only after policy is agreed. Extend to mixed scope and same-batch linking through explicit allocation logic. Acceptance: partial/multiple returns, merchant refund combinations, deletion, edits, cross-month reporting and concurrent limits match golden cases.
4. **Backup and restore:** Replace incomplete profile round trips with a contract-driven manifest covering every owned collection and required relationships. Restore in an isolated target transaction and compare content hashes and ledger checksums. Acceptance: interruption/failure rollback, malformed backup rejection and an actual encrypted backup restoration drill.
5. **Reports:** Consolidate period, currency, reversal and allocation handling into one immutable report context. Validate workbook sheets after writing and compare all screen/export totals. Acceptance: shared-meal examples, reimbursements, refunds, transfers, card payments and year-boundary cases agree across views.
6. **Production hardening:** Validate the session migration against a backup, deploy the exact tested artifact to staging, enforce TLS and trusted proxies, verify source/secret denial, expire stale sessions, test alerts and recovery, and confirm supported runtimes. Acceptance: dated evidence for every gate with remaining exceptions visible. No universal-completion label until these environment and product requirements are actually demonstrated.

## Sources

All online sources below were accessed for this assessment on 11 September 2026. Undated or historical guidance is not represented as a current PDF specification. Source links are placed beside the associated claims through numbered references.

[^1]: Reserve Bank of India, [Banks in India / directory categories](https://www.rbi.org.in/Scripts/certainconcepts.aspx). Institutional scope only; directory snapshots may lag mergers.
[^2]: Department of Financial Services, [RRBs functioning in the country](https://financialservices.gov.in/list-rrbs-functioning-country), updated January 2026; [RRB amalgamation notification](https://www.financialservices.gov.in/beta/sites/default/files/RRBs-Amalgamation-Notification.pdf), April 2025.
[^3]: Kotak Mahindra Bank, [Netbanking sitemap](https://www.kotak.com/content/dam/Kotak/sitemap-nb-2.pdf). Local specimen evidence: `KOTAK-STATEMENT-FIX.md`; customer PDF intentionally not redistributed.
[^4]: HDFC Bank, [Accounts FAQs](https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/need-help/net-banking-faqs/accounts-faqs.pdf); [Download account statement via netbanking](https://www.hdfc.bank.in/blogs/digital-banking/download-account-statement-via-netbanking), June 2026.
[^5]: SBI, [OnlineSBI personal banking](https://retail.onlinesbi.sbi/npersonal/).
[^6]: IndusInd Bank, [Personal banking FAQ](https://bank.indusind.bank.in/in/en/personal/faq.html); [IndusNet](https://www.indusind.bank.in/in/en/personal/online-banking/indus-net.html).
[^7]: Axis Bank, [NEO for Corporates](https://www.axis.bank.in/corporate/neo-by-axis-bank/neo-for-corporates).
[^8]: ICICI Bank, [Statements](https://www.icici.bank.in/personal-banking/accounts/savings-account/statements); [Online services](https://www.icici.bank.in/personal-banking/ways-to-bank/net-banking/online-services).
[^9]: IDFC FIRST Bank, [Statement of account request](https://www.idfcfirst.bank.in/customer-care-sr/categories/accounts/statement-of-account-request).
[^10]: Bank of Baroda, [How to get a bank statement online](https://bankofbaroda.bank.in/banking-mantra/digital/articles/how-to-get-a-bank-statement-online).
[^11]: Bank of India, [Omni Neo app](https://bankofindia.bank.in/boi-mobile-omni-neo-bank-app).
[^12]: Bank of Maharashtra, [Internet banking](https://bankofmaharashtra.bank.in/internet-banking).
[^13]: Canara Bank, [Corporate ai1 mobile app](https://www.canarabank.bank.in/corporate-ai1-mobile-app).
[^14]: Indian Bank, [IndSMART](https://indianbank.bank.in/en/indsmart); [Internet banking](https://indianbank.bank.in/en/internet-banking).
[^15]: Indian Overseas Bank, [Mobile banking services](https://iob.bank.in/en/web/guest/Application-Services-Offered-Mobile-Banking).
[^16]: Punjab National Bank, [WhatsApp statement guidance](https://www.pnb.bank.in/downloadprocess.aspx?fid=sQayUZYu36kMvVkdgrXrFg%3D%3D), August 2024.
[^17]: Punjab & Sind Bank, [Passbook and statement issuance](https://www.punjabandsind.bank.in/content/issuance-passbook-statement).
[^18]: UCO Bank, [mBanking Plus](https://www.ucobank.com/mbanking-plus).
[^19]: Union Bank of India, [Accessible internet-banking manual](https://www.unionbankofindia.bank.in/pdf/user-manual-for-accessing-union-bank-of-india-internet-banking-portal-with-keyboard-and-screen-reader.pdf).
[^20]: Bandhan Bank, [FAQ](https://www.bandhan.bank.in/faq).
[^21]: CSB Bank, [Digital banking guide](https://csb.bank.in/digitalbankingguide/).
[^22]: City Union Bank, [Netbanking](https://www.cityunionbank.com/cub-net-banking-cub-online-banking).
[^23]: Dhanlaxmi Bank, [Account details guide](https://www.dhanbank.com/pdf/Account-Details.pdf).
[^24]: Federal Bank, [Account statement download guide](https://www.federal.bank.in/how-to-download-federal-bank-account-statement); [FedOne](https://www.federal.bank.in/fedone).
[^25]: Karur Vysya Bank, [KVB eBook](https://www.kvb.bank.in/ways-to-bank/kvb-ebook/); [DLite FAQ](https://www.kvb.bank.in/faqs/faqs-on-dlite-mobile-application/).
[^26]: Nainital Bank, [Statement download guide](https://www.nainitalbank.bank.in/pdf/Account%20Statement%20Download%20through%20net%20banking.pdf).
[^27]: RBL Bank, [BizBank user guide](https://webassets.rblbank.com/document/bizbank/bizbank-user-guide.pdf).
[^28]: Tamilnad Mercantile Bank, [Mobile banking](https://tmb.bank.in/personal/services/mobile-banking).
[^29]: YES Bank, [Internet-banking FAQ](https://www.yesbank.in/content/published/api/v1.1/assets/CONT35A4540254CF4E1889D241AF77E1E322/native/internetbanking_faq_pdf.pdf?channelToken=21f7ccfa2fc3401091938f541a6f8f2a&download=false).
[^30]: IDBI Bank, [How do I](https://www.idbibank.in/how-do-i.aspx); [mPassbook](https://www.idbi.bank.in/mpassbook.aspx).
[^31]: AU Small Finance Bank, [AU 0101 netbanking FAQs](https://www.au.bank.in/personal-banking/digital-banking/au-0101/au-0101-netbanking/faqs).
[^32]: Jana Small Finance Bank, [Mobile banking](https://www.janabank.com/online-banking/mobile-banking/).
[^33]: OCRmyPDF, [Advanced features](https://ocrmypdf.readthedocs.io/en/stable/advanced.html), encrypted-document handling.
[^34]: OWASP, [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
[^35]: Tesseract.js project, [API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md) and [Local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md).
[^36]: Tesseract OCR project, [Improving image quality](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html).
[^37]: [TabSniper: Towards Accurate Table Detection & Structure Recognition for Bank Statements](https://arxiv.org/abs/2412.12827), arXiv, December 2024.
[^38]: American Express India, [US20220358296A1: Natural language processing for categorizing sequences of text data](https://patents.google.com/patent/US20220358296A1/en), published November 2022. Patent disclosure, not legal clearance.
[^39]: OWASP, [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
[^40]: SheetJS, [NodeJS installation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).
[^41]: Vite, [Migration from v6](https://v7.vite.dev/guide/migration.html) and [Release policy](https://vite.dev/releases).
