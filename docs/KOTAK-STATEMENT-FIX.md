# Kotak Statement Parsing Fix

Verified 11 September 2026. Parser version: `statement-text-v2`.

## Root Cause

The PDF opened successfully. The zero-row result was a parser limitation, not an invalid upload or a password problem. The previous synthetic bank-labeled fixtures did not represent this actual Kotak export layout closely enough.

The supplied format has a numbered `#` column, `Withdrawal (Dr.)` and `Deposit (Cr.)` headings, a table-cell opening balance and an independent account-summary table near the end. A continuation page does not repeat the transaction header. The bank logo is an image, while bank identity also appears in legal/footer text. The earlier parser missed these structural details and consequently returned no transactions or dates.

## Changes

- Recognize numbered transaction tables and the Dr/Cr header aliases, keeping debit and credit distinct.
- Read the printed account-statement period, including month-name dates.
- Recognize this Kotak layout using its table shape and bank-specific legal/footer evidence, without treating a narration that names another bank as the issuer.
- Allow a headerless continuation only with verified page numbering, matching page width, known column positions and valid numbered/date rows.
- Require continuous source transaction numbering and consistent printed page X-of-Y markers for this numbered Kotak layout.
- Read the opening balance from its table cell and cross-check the independent opening/closing account summary. Reject missing, invalid, conflicting or multiple account-summary rows.
- Retain wrapped narration and separate a reader-joined date/narration text item only when its position and strict date prefix establish those fields.
- Display `Unavailable` instead of monetary zero when no rows were extracted, and stop describing an empty result as reviewed.
- Advance parser provenance to v2; the API accepts v1 for compatibility and v2 for new reviewed imports.

## Verification

The supplied source was processed locally through the actual header upload dialog. A separate `pdfplumber` reader, with independent column extraction and Python Decimal arithmetic, was compared with the browser's PDF.js output. Narration/reference whitespace was normalized for comparison; financial values and dates required exact equality.

| Check | Result |
| --- | --- |
| Source pages | 36 |
| Source transactions | 1,240 |
| Fields compared per row | 7: page, date, description, reference, debit, credit, running balance |
| Field comparisons | 8,680; zero mismatches |
| Source numbering | Continuous from first through last transaction |
| Every running balance | Matched |
| Independent opening and closing summary | Matched |
| Month filters | All 12 exercised in the browser |
| Pagination | Exercised on the real 1,240-row result |
| Mobile | 390px page-overflow check passed |
| Original PDF | Unchanged, verified by before/after hash comparison |
| Financial import requests | Zero; validation did not post this source's transactions |

The independent reader is [check-kotak-source.py](../tests/fixtures/statements/check-kotak-source.py); the read-only browser validator is [validate-local-kotak.mjs](../tests/validate-local-kotak.mjs). They require an explicitly supplied local file; the private source is not a repository fixture. The browser validator is restricted to localhost and blocks import requests. It deletes its temporary downloaded review and reports counts/pass-fail rather than financial values. [Source-validation evidence](statement-evidence/2026-09-11-kotak/local-source-validation.json).

A new, entirely synthetic four-page PDF represents the numbered columns, wrapped narration, headerless continuation, separate account summary and trailing informational page. It is produced by [generate-kotak-numbered.py](../tests/fixtures/statements/generate-kotak-numbered.py). Its values and narrations are fabricated test data, not copied customer transactions. Native rendering was visually inspected; its real PDF.js browser extraction and month filter are covered by the integration suite.

The new synthetic PDF exposed an additional case where the reader joins a date and adjacent narration into one text item. The initial integration run failed; that case was fixed and added to unit coverage before the complete suite was rerun. The final evidence below is from the passing source state.

| Repository gate | Final result |
| --- | --- |
| TypeScript and lint | PASS |
| Unit suite | 388 tests in 51 files; 57 statement-specific tests |
| API/browser suite | 48 scenarios passed |
| Production-build rerun | 39 scenarios passed against built assets, not additional unique cases |
| PHP syntax | 79 files passed |
| Production build | PASS with existing bundle-size warnings |

[Command evidence](statement-evidence/2026-09-11-kotak/verification.json), [API/browser scenarios](statement-evidence/2026-09-11-kotak/atomic-writes.json), [built-asset scenarios](statement-evidence/2026-09-11-kotak/production-artifact.json), [tested-source hashes](statement-evidence/2026-09-11-kotak/source-hashes.json). The verification collector accepts `STATEMENT_EVIDENCE_DIRECTORY` so this follow-up preserves the earlier evidence instead of overwriting it.

## Using the Fix

Refresh [the running preview](http://127.0.0.1:5178/), open the header upload action and select the PDF again. An already-open zero-row review does not automatically reanalyze its source. Choose the appropriate destination bank account, verify the source balances, and review purpose/category/scope before import.

The preview was restarted without resetting its existing data. The synthetic login remains `review_demo` / PIN `583921`. The real statement was inspected against that isolated preview without importing it into either the demo or original financial profile. No commit, push or hosted deployment was performed.

## Limits

This establishes exact extraction on the supplied file and the stated synthetic regression cases. It does not certify every Kotak product/channel, every other bank layout, scanned PDFs, statement authenticity or category/personal-business correctness. Semantic suggestions still require review; credits are not automatically all income and debits are not automatically all expenses.

The numbered-layout page/sequence/account-summary checks are a targeted completeness improvement. Broader account binding, fuzzy duplicate matching, OCR, durable review drafts and the existing security/dependency/backup/reporting release blockers remain in [the implementation register](BANK-STATEMENT-IMPLEMENTATION.md). Production remains NO-GO; this is a verified parser repair, not a full application certification.
