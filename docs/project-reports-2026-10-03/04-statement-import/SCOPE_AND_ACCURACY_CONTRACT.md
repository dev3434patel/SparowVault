# Scope and accuracy contract

| Field | Value |
|-------|--------|
| Version | 1 |
| Date | 2026-09-21 |

## Certification unit

`bankId + product + channel + layoutVersion + language + currency + mode`

A bank dropdown entry is **not** a certified layout.

## Status meanings

| Status | Meaning |
|--------|---------|
| registered | Bank/layout known; no independent extraction evidence |
| synthetic-tested | Passes synthetic fixtures only |
| real-corpus-tested | Evaluated on authorized real PDFs (not release-ready alone) |
| verified-for-scope | Holdout critical fields + monthly counts exact for named scope |
| disabled | Auto-posting blocked for this layout |

## Non-negotiable rules

1. Bank credit is not automatically income; bank debit is not automatically expense.
2. Net balance match does not prove every row was extracted.
3. Full-source reconciliation runs before duplicate/exclusion filters.
4. A bank EMI debit alone does not prove principal/interest split.
5. PDF/password stay on-device by default.

## MVP document class

INR deposit-account digital PDFs. Credit-card PDFs, scans, non-INR, and loan statements are separate capability flags.
