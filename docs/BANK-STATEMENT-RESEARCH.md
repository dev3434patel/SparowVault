# Bank Statement Import and Analysis

## Recommendation

Build statement analysis as an evidence-backed review and reconciliation workflow, not an unrestricted PDF-to-ledger converter. Keep four decisions separate: what the source printed, whether its movements reconcile, what each movement means economically, and whether it should create a new record. A confident category suggestion must never compensate for an uncertain amount, missing row or ambiguous account.

The implemented first release uses local PDF extraction, exact integer-paise arithmetic, mandatory review and atomic posting. It offers Kotak, HDFC, SBI, IndusInd and Axis bank selection, but its current evidence is synthetic. It has not established accuracy on authentic statements from those banks. A bank selector is a routing hint, not a certification of every product, statement channel or historical format.

The appropriate release state is **local evaluation, not unattended financial processing**. Scanned statements, unsupported layouts and inconsistent balances are blocked. Personal/business purpose remains an explicit decision. Broader security, backup and reporting blockers in [the implementation register](IMPLEMENTATION-STATUS.md) also prevent a production-readiness claim.

## Bank Evidence

Bank documentation confirms statement delivery capabilities, not a universal PDF table specification. Different products and channels must be treated as separate parser populations. Password conventions found for a credit-card product must not be reused as an account-statement rule.

| Bank | Primary evidence | Engineering consequence | Validation still required |
| --- | --- | --- | --- |
| HDFC | Official NetBanking instructions describe date-range statement downloads and password-protected files. [1](https://www.hdfc.bank.in/blogs/digital-banking/download-account-statement-via-netbanking) | Ask for the known PDF password locally; retain date-range provenance. | Savings/current, emailed/downloaded, new/old layouts, debit/credit alignment and wrapped narration. |
| Kotak | The customer-service charter describes password-encrypted emailed statements; NetBanking documentation lists account statement services and CSV availability. [2](https://www.kotak.bank.in/content/dam/Kotak/Customer-Service/Important-Customer-Information/Mandatory-Notices-Displayed-at-Branches/Other-Notifications/citizen-charter-for-customer-service.pdf), [3](https://www.kotak.bank.in/en/digital-banking/ways-to-bank/net-banking/services-offered.html) | Prefer a structured export when available and separately validated. Do not guess a password from personal identifiers. | Export-channel variants, narration continuation, account type and masked account identity. |
| SBI | OnlineSBI documentation includes account-statement date ranges and Excel/PDF output. [4](https://retail.onlinesbi.sbi/npersonal/) | Preserve transaction date and value date separately when both are present. | Channel-specific header and balance formats, page breaks, reverse ordering and reference fields. |
| IndusInd | Its statement request form takes an account, period and statement type; official FAQs describe Excel/PDF account statements. [5](https://www.indusind.com/in/en/personal/forms/get-statement.html), [6](https://bank.indusind.bank.in/in/en/personal/faq.html) | Confirm the selected destination account; do not equate a detected bank name with verified account ownership. | Download/email variants, encryption, account-currency metadata and all transaction columns. |
| Axis | NEO corporate documentation lists PDF and structured statement formats and password-protected statement email. This is corporate-channel evidence, not a retail-layout contract. [7](https://www.axis.bank.in/corporate/neo-by-axis-bank/neo-for-corporates) | Keep product/channel in the future adapter key; retain a structured-export alternative. | Separate retail/current/corporate layouts and password variants. |

For all five banks, the present test fixtures establish that the software recognizes selected header aliases and bank branding in controlled PDFs. They do not establish real-bank coverage. Authentic test material should preserve layout, page breaks, fonts, dates, references and amount columns while removing unnecessary account-holder details. Redaction must actually remove underlying PDF text, not merely cover it visually. Passwords belong only in the application's password field, not in issues, fixtures containing real data, logs or chat.

## Extraction Architecture

### Native Text First

PDF.js exposes password handling, text content and geometry, allowing extraction and a source preview within the browser. Geometry matters because plain text order is not necessarily a transaction table's reading order. The library supplies PDF decoding primitives; financial row interpretation remains application logic. [8](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html), [9](https://mozilla.github.io/pdf.js/examples/)

The current implementation groups positioned text into lines, locates recognized headers, assigns cells to columns, preserves same-page wrapped narration and extracts strict dates and amounts. It recognizes either separate debit/credit columns or an amount with an explicit Dr/Cr field. Repeated page headers and ascending/descending statements are handled in the tested layouts. It keeps value date separate from transaction date and labels an inferred period differently from a printed statement period.

Numbers are parsed into paise without floating-point parsing or arbitrary removal of punctuation. Valid Indian and Western comma grouping is supported. A missing monetary cell is distinguishable from an invalid token. Dates use explicit supported formats, including Indian day/month ordering; a date such as 02/03 is not globally unambiguous. Future adapters must declare their date convention rather than infer it from a single row.

PDF text can be split into separate words, move between pages or use a nonstandard font mapping. The current generic header recognizer is therefore a baseline, not a replacement for versioned bank adapters. The next adapter contract should include bank, account product, delivery channel, observed layout version, parser version and known limitations. Golden outputs must retain source-page and field locations so an extraction can be checked against the actual document.

### OCR and Layout Models

OCR should be a separate, explicitly reviewed path. Tesseract's official guidance identifies resolution, skew, borders and segmentation as factors affecting recognition. Recognized text is evidence to inspect, not a reliable financial amount simply because an OCR engine returned it. [10](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)

The original TabSniper bank-statement research treats table detection, table categorization and structure recognition as distinct problems. This supports separating document layout reconstruction from downstream classification. Its findings do not establish this repository's accuracy or coverage of the five requested banks. [11](https://arxiv.org/abs/2412.12827), [12](https://arxiv.org/html/2412.12827v1)

A proposed OCR release should render at a tested resolution, detect text and cells, retain image coordinates and expose uncertain fields for correction. Never silently change O to 0, invent a decimal point or infer a missing debit from a desired closing balance. Mixed native-text/scanned documents need page-level routing. A single unreadable financial page must block completion even if other pages parse correctly.

OCR is **not implemented** in this release. Image-only pages fail closed. Rotated documents, unsupported layouts, non-INR and detected credit-card statements are also rejected or require a different workflow. This deliberately sacrifices automatic coverage until evidence supports expansion.

### Vendor and Structured-Data Alternatives

| Approach | Evidence and benefit | Principal tradeoff | Recommendation |
| --- | --- | --- | --- |
| Local PDF.js | Native text/geometry/password APIs and local source rendering. [8](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html) | Requires maintained bank-layout logic; no inherent OCR or financial semantics. | Current default. |
| Local OCR with layout extraction | OCR quality controls and bank-table research provide components. [10](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html), [11](https://arxiv.org/abs/2412.12827) | More compute, recognition errors and human correction work. | Add only behind explicit review and fixture gates. |
| Google Document AI | Official processor documentation includes a Bank Statement Parser with version-specific fields and limits. [13](https://docs.cloud.google.com/document-ai/docs/processors-list) | Hosted document processing introduces data-transfer, retention, region, cost and contract decisions. Published capability is not an Indian-bank benchmark. | Run a consented, redacted comparative pilot before procurement. |
| AWS Textract lending flow | Documentation exposes document classes, detected fields, geometry and confidence information for lending documents including bank statements. [14](https://docs.aws.amazon.com/textract/latest/dg/lending-response-objects.html) | Confidence must be evaluated per field; text extraction does not determine household/business purpose. | Compare only on the same independently labeled sample set. |
| Bank CSV/Excel/MT940 export | Several bank sources above document structured formats for specific channels. | Formats still change; sign conventions, duplicates and column semantics need validation. The repository's existing spreadsheet dependency has open advisories. | Useful separate connector after parser/dependency remediation. |
| Account Aggregator integration | Government documentation describes a consent-based financial-data sharing framework. [15](https://www.financialservices.gov.in/account-aggregator-framework) | Participation, provider coverage, consent lifecycle and integration eligibility require verification. Not a drop-in unrestricted bank API. | Explore longer term with an appropriate provider and compliance review. |

The recommended architecture keeps acquisition interchangeable while preserving the same normalized rows, review decisions, reconciliation rules and posting boundary. Do not introduce a hosted OCR/LLM fallback that silently uploads documents when local parsing fails. No such upload is present in the implemented feature.

## Reconciliation and Completeness

The proposed financial contract is exact integer equality:

```text
For every chronological row:
previous balance + credit - debit = current balance

For the complete statement:
opening balance + sum(credits) - sum(debits) = closing balance
```

Both checks are required. Matching only the final total can conceal a missing debit and credit of the same amount. The implementation validates skipped rows as well as selected ones, checks date ordering, and requires independently supplied or extracted opening and closing balances. It does not create an opening balance by subtracting the first transaction from its running balance and then call that independent verification.

Arithmetic agreement is necessary but insufficient. A forged statement can be internally consistent. Two omitted offsetting movements can leave surrounding balances consistent if they disappear together. A wrong destination account can also contain a mathematically valid statement. The interface therefore says **Arithmetic matched**, not bank verified, complete, authentic or 100% accurate.

Remaining completeness gates include printed debit/credit summary totals, transaction counts, page X-of-Y continuity, duplicated pages, account identifiers and currency metadata tied to the header. The current feature does not certify those properties. An operator can enter source balances, but the software cannot prove they were faithfully transcribed. Independent validation should compare the printed document with a separately prepared expected ledger, not merely another output from the same parser.

## Meaning and Classification

The application's proposed interpretation rules distinguish cash movement from economic purpose:

| Statement movement | Candidate treatment | Additional evidence needed |
| --- | --- | --- |
| Employer credit | Income / salary | Identified payer and confirmation that it is earned income. |
| Credit from another owned account | Transfer | Owned counterpart and matching movement. |
| Loan disbursement credit | Loan liability workflow | Loan record and repayment terms; not automatic income. |
| Merchant debit | Expense suggestion | Actual purchase purpose and matching category. |
| Credit-card bill debit | Card payment | Linked credit card; do not record the purchase a second time. |
| Merchant refund credit | Reduction of original expense | Original expense, category, chronology and remaining refundable amount. |
| ATM debit | Bank-to-cash transfer candidate | Confirmation that cash remains an owned asset; later purchases are separate. |
| EMI, investment or mandate | Dedicated workflow / review | Principal/interest, asset or other domain details. |
| Personal name in UPI narration | Unknown | It could be an expense, reimbursement, gift, transfer or business transaction. |

These are product-design rules, not tax determinations. Narration rarely establishes business purpose, GST eligibility or deductibility. A restaurant purchase may be personal or business; a personal-name payer may be a client. The current importer leaves scope blank and requires an explicit personal/business selection, including a bulk selection for reviewed rows.

The implemented category suggestions are small deterministic rules that map only to existing active categories. Every suggestion includes a reason and remains unreviewed. Unknown movements can remain unclassified or excluded; a rule does not invent a category, counterparty or amount. There is no model confidence percentage and no claim of machine-learning accuracy.

A future learned classifier should receive a separate normalized narration while preserving original evidence. Customer corrections should be opt-in, user-scoped and reversible. Evaluate purpose, category and personal/business classification separately. A suggestion may be useful at high precision with low coverage; forced classification of every row is not a quality target. An LLM should never be allowed to alter date, amount, direction or balances to make a statement reconcile.

## Duplicates and Posting

Duplicate detection needs multiple levels. The current implementation uses a SHA-256 document identifier, a deterministic account/date/amount/balance/narration/reference fingerprint, user-bound request idempotency and a soft match against existing transactions. Possible matches are excluded initially for review. Identical financial rows from a re-exported PDF can therefore be recognized even when the document hash changes.

This is not complete entity resolution. Changed narration, shifted booking dates, repeated genuine purchases and matching both sides of an owned-account transfer need richer reconciliation. A document-account check currently uses stored transaction provenance; it is not a standalone registry of every reviewed file. A duplicate-only re-export does not register a new document hash, and first-time wrong-account selection is not independently detectable. These limitations must remain visible in release decisions.

The posting boundary revalidates all rows on the server, verifies owned active links, requires confirmed purpose/scope and uses the existing atomic source/effects/audit transaction. Exact retries return a stored result. Validation errors or excessive linked refunds roll back the batch. Included transfers create the appropriate two account effects; card payments reduce cash and card liability; refunds reduce the original expense category rather than becoming income.

These checks protect this import path. They do not repair all historical rows or guarantee that every existing report treats those effects correctly. Cross-view financial reports remain a separate release gate.

## Privacy and Operational Safety

PDF bytes and the password remain in the browser for this feature. The reviewed transaction payload, source hash and limited provenance are sent to SparowVault's own API only after confirmation. The original PDF and password are not stored in the database, localStorage or IndexedDB by the importer. A downloaded review JSON contains financial information and must be treated as sensitive.

Local processing does not make browser memory immune to extensions, compromised scripts or device access. HTTPS, restrictive script policy, dependency maintenance, session security and secure hosting remain essential. The 2024 PDF.js advisory illustrates why a document parser must be kept patched; it identifies affected versions and the `isEvalSupported: false` mitigation. The implementation uses a later pinned version and disables evaluation, but this is not a comprehensive security certification. [16](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq)

Current resource limits are 20 MB, 60 pages, 200,000 text items, 2,000 rows and a 1 MiB reviewed API payload. Loading/extraction has a timeout and cancellation; the password wait pauses that timer. Source rendering omits interactive annotations. The PDF worker is served locally, with a same-origin worker policy and JavaScript MIME configuration for its module file.

Before hosted staging, verify these controls on the actual Apache/PHP configuration, test malicious or resource-intensive PDFs, confirm logs exclude sensitive payloads, and measure worker/canvas memory on low-memory devices. The current browser tests are Chromium checks, not Safari/Firefox certification or a hostile-file penetration test.

Build-runtime support also matters: Node's official release table lists Node 20 as EOL and Node 22/24 as LTS at the review date. The local compatibility test on Node 20 is therefore not a recommendation to retain that toolchain for production. A supported LTS upgrade and dependency revalidation belong in the release gate. [22](https://nodejs.org/en/about/previous-releases)

## Google Patents

The publications below provide technical context, not benchmark results or implementation permission. Google Patents explicitly warns that its legal-status and assignee information is not a legal conclusion. A publication, grant or apparent expiration does not by itself establish freedom to operate. Any commercial clearance should be performed by qualified patent counsel for the relevant claims, families and jurisdictions. [17](https://patents.google.com/patent/US20220358296A1/en)

| Publication | Technical subject reviewed | Design relevance | Boundary |
| --- | --- | --- | --- |
| US20220358296A1; granted counterpart US12340182B2 | Text preprocessing, vectorization and a trained deep model for sequence categorization; discussion includes matching internal-transfer evidence. Published 10 November 2022; counterpart granted 24 June 2025 per the record. [17](https://patents.google.com/patent/US20220358296A1/en), [18](https://patents.google.com/patent/US12340182B2/en) | Separate source extraction from semantic classification and inspect related-account evidence. | This implementation uses deterministic rules, not that described model pipeline. No claim of non-infringement is made. |
| US5842185A | Electronic transaction tracking, payee/category association and user acceptance of transaction information. [19](https://patents.google.com/patent/US5842185A/en) | Category suggestions and a review-before-posting interaction have a long technical history. | Does not prove the quality of narration-only classification. |
| US8170932B1 | Financial transaction categorization using merchant classification and transaction-type information. [20](https://patents.google.com/patent/US8170932B1/en) | Multiple signals are preferable to a merchant-name substring alone; uncategorized review remains useful. | Merchant-class data may not be present in an uploaded PDF. |
| AU2022301115A1 | Automated assessment of vouching evidence using extraction and comparison across financial documents. [21](https://patents.google.com/patent/AU2022301115A1/en) | Treat evidence acquisition, field extraction and record matching as separate stages. | Audit-evidence matching is not statement authenticity certification or an accounting opinion. |

The engineering recommendation is an independently implemented, testable pipeline with explicit evidence and review. A patent-inspired feature should not be described as patented technology belonging to SparowVault. The reviewed documents also do not substantiate a universal 100% bank-statement accuracy claim.

## Evaluation and Release Gates

Define a corpus by bank, product, export channel, layout version, date range, page count and encryption type. Include native text, encrypted files, scans, mixed pages, overdrafts, reversals, same-day repeated amounts, wrapped narration, missing pages and zero-activity statements. Keep development examples separate from a holdout set; otherwise adapting a parser and testing it on the same few PDFs overstates generalization.

For each authorized sample, independently label every transaction and its exact date, debit, credit, balance and source location. Record unknown semantics as unknown. Category labels should be supplied or approved by the account owner; business/tax treatment may require a qualified reviewer. Retain consent and deletion requirements for genuine financial samples, and use synthetic fixtures for public CI.

| Metric | Definition | Proposed acceptance use |
| --- | --- | --- |
| Row recall | Expected source rows represented / all expected source rows | No missing rows on the declared supported holdout corpus. Count blocked files separately. |
| Field exactness | Exact date, direction and integer-paise match against independent labels | No tolerated monetary discrepancy in any accepted import. |
| Statement completion | All declared pages/rows and independent summaries accounted for | Required before unattended processing is considered. Not yet implemented fully. |
| Category precision | Correct suggestions / all suggestions at the chosen threshold | Report per category and bank, alongside coverage and abstentions. |
| Scope agreement | Owner-approved personal/business decisions matched | Measure separately; do not borrow category accuracy. |
| Duplicate performance | True repeats suppressed and genuine repeats preserved | Evaluate both false merges and missed duplicates, including transfers. |
| Posting integrity | Exactly intended source, ledger effects and audit after retries/failures | Zero duplicate or partial posting in the tested failure matrix. |
| Operational safety | Limits, cancellation, privacy, authorization and cleanup behave as specified | Required on actual hosted staging, not inferred from a local build. |

These are proposed acceptance gates, not measured real-bank results. Even a zero-error finite holdout cannot justify a perpetual guarantee on unseen statements. Publish the corpus size, bank/product coverage, parser version, failure counts and confidence intervals where statistically appropriate. A release can truthfully claim exact results on a named corpus and explicit rejection outside that scope.

The next implementation packages and their acceptance tests are in [the statement implementation and solution prompts](BANK-STATEMENT-IMPLEMENTATION.md). Real representative statements are the immediate prerequisite for bank-specific tuning. OCR, account binding, complete-document checks and richer duplicate matching should remain disabled or review-only until their own evidence gates pass.

## Sources

Sources were checked on 10 September 2026. Bank and living technical pages are undated unless noted; capabilities remain channel/version specific.

1. HDFC Bank. [Download Account Statement via NetBanking](https://www.hdfc.bank.in/blogs/digital-banking/download-account-statement-via-netbanking). Bank instructions.
2. Kotak Mahindra Bank. [Citizen Charter for Customer Service](https://www.kotak.bank.in/content/dam/Kotak/Customer-Service/Important-Customer-Information/Mandatory-Notices-Displayed-at-Branches/Other-Notifications/citizen-charter-for-customer-service.pdf). Statement delivery.
3. Kotak Mahindra Bank. [NetBanking Services Offered](https://www.kotak.bank.in/en/digital-banking/ways-to-bank/net-banking/services-offered.html). Export availability.
4. State Bank of India. [OnlineSBI Personal Banking](https://retail.onlinesbi.sbi/npersonal/). Account-statement services.
5. IndusInd Bank. [Get Statement](https://www.indusind.com/in/en/personal/forms/get-statement.html). Statement request fields.
6. IndusInd Bank. [Personal Banking FAQs](https://bank.indusind.bank.in/in/en/personal/faq.html). Statement formats.
7. Axis Bank. [NEO for Corporates](https://www.axis.bank.in/corporate/neo-by-axis-bank/neo-for-corporates). Corporate statement channels.
8. Mozilla PDF.js. [API Documentation](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html). Document loading, passwords and extraction.
9. Mozilla PDF.js. [Examples](https://mozilla.github.io/pdf.js/examples/). Rendering and integration.
10. Tesseract OCR. [Improving the Quality of the Output](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html). OCR limitations and preprocessing.
11. Abhishek Trivedi, Sourajit Mukherjee, Rajat Kumar Singh, Vani Agarwal, Sriranjani Ramakrishnan and Himanshu S. Bhatt. [TabSniper: Towards Accurate Table Detection & Structure Recognition for Bank Statements](https://arxiv.org/abs/2412.12827). arXiv:2412.12827, submitted 17 December 2024.
12. Trivedi et al. [TabSniper, Full Paper, Version 1](https://arxiv.org/html/2412.12827v1). Bank-statement table extraction research, December 2024.
13. Google Cloud. [Document AI Processor List](https://docs.cloud.google.com/document-ai/docs/processors-list). Bank Statement Parser capabilities and version limits.
14. Amazon Web Services. [Textract Lending Response Objects](https://docs.aws.amazon.com/textract/latest/dg/lending-response-objects.html). Extraction outputs and document classification.
15. Department of Financial Services, Government of India. [Account Aggregator Framework](https://www.financialservices.gov.in/account-aggregator-framework). Consent-based sharing overview; not a complete legal eligibility analysis.
16. Mozilla. [PDF.js Security Advisory GHSA-wgrm-67xf-hhpq](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq). CVE-2024-4367, May 2024.
17. American Express India Private Ltd, as listed. [US20220358296A1: Natural Language Processing for Categorizing Sequences of Text Data](https://patents.google.com/patent/US20220358296A1/en). 10 November 2022.
18. American Express India Private Ltd, as listed. [US12340182B2](https://patents.google.com/patent/US12340182B2/en). Granted counterpart, 24 June 2025 per the record.
19. [US5842185A: Method and System for Electronically Tracking Financial Transactions](https://patents.google.com/patent/US5842185A/en). Patent publication, 1998.
20. [US8170932B1: System and Method for Data Management and Financial Transaction Categorization](https://patents.google.com/patent/US8170932B1/en). Patent publication, 2012.
21. [AU2022301115A1: AI-Augmented Auditing Platform Including Techniques for Automated Assessment of Vouching Evidence](https://patents.google.com/patent/AU2022301115A1/en). Patent application publication.
22. Node.js / OpenJS Foundation. [Node.js Releases](https://nodejs.org/en/about/previous-releases). Runtime lifecycle table, checked 10 September 2026.
