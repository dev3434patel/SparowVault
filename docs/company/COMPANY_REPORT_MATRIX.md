# Company Report Matrix

**Status:** Architecture (pre-implementation)

---

## 1. Universal filter engine

Every list/report supports combinable filters:

| Filter | Notes |
|--------|-------|
| Company | Implicit from session |
| Financial Year / Period presets | Today, Yesterday, This Week, This Month, Previous Month, This Quarter, This FY, Previous FY, Custom |
| Date range | Inclusive |
| Party / Category / Role / Tag | |
| Business / Branch / Area / Project / Cost Centre | |
| Voucher Type / Status | Posted default for books |
| Debit/Credit | Line side where relevant |
| Created By | User activity |
| Amount range | Paise |
| Reference / Voucher number | |
| Search text | narration, party name, mobile |

**Export fidelity:** Exports must apply the **exact same filter set** visible on screen (include filter summary in PDF header).

---

## 2. Core reports

| Key | Name | Grain | Primary columns / content | Books basis |
|-----|------|-------|---------------------------|-------------|
| `day-book` | Day Book | Voucher | Date, No, Type, Party, Narration, Amount, Dr/Cr totals | POSTED |
| `cash-book` | Cash Book | Line on cash ledgers | Date, Particulars, Dr, Cr, Balance | POSTED |
| `bank-book` | Bank Book | Per bank ledger | Same | POSTED |
| `party-ledger` | Party Ledger | Party | Opening, Dr, Cr, Closing, running | POSTED |
| `ledger-statement` | Ledger Statement | Any ledger | Same | POSTED |
| `group-summary` | Group Summary | Account group | Period movements + closing | POSTED |
| `receipts-payments` | Receipts & Payments | Cash/Bank flows | Receipts vs Payments categories | POSTED |
| `receivables` | Receivables | Party/Bill | Outstanding, due, overdue | Bills + POSTED |
| `payables` | Payables | Party/Bill | Same | Bills + POSTED |
| `outstanding-ageing` | Outstanding Ageing | Buckets | Not Due, 0–15, … 90+ | Bills |
| `trial-balance` | Trial Balance | Ledger | Op Dr/Cr, Period Dr/Cr, Cl Dr/Cr | POSTED |
| `profit-loss` | Profit & Loss | Income/Expense | Derived | POSTED |
| `balance-sheet` | Balance Sheet | A/L/E | Derived; never manual totals | POSTED |
| `cash-flow` | Cash Flow | Indirect/direct v1 simple | Money ledgers movement | POSTED |
| `project-report` | Project Report | Project | Invested, received, outstanding, P&amp;L slice | POSTED + dims |
| `business-report` | Business Report | Business unit | In/Out, AR/AP, Income/Expense, assets/liab slice | POSTED + dims |
| `area-report` | Area Report | Area | Parties, projects, movement, AR/AP, expense | POSTED + dims |
| `category-report` | Category Report | Party category | Party count, Dr/Cr, net, AR/AP, top parties, monthly | POSTED |
| `user-entry-report` | User Entry Report | Actor | Created/modified/reversed counts & amounts | Audit + vouchers |
| `audit-report` | Audit Report | Audit log | Who/what/when/before/after | Audit |

---

## 3. Report-specific invariants

### Trial Balance

Closing Debit total = Closing Credit total (within company, as-of date). Failure = defect, not “rounding”.

### Balance Sheet

Assets = Liabilities + Equity (as-of). Derived from natures; **no manual BS entry**.

### Profit & Loss

Only INCOME/EXPENSE natures. Pure loan receipt/payment must not appear as income/expense.

### Receipts & Payments

Cash/bank movement view; distinct from P&amp;L.

### Party statement fields

Date | Voucher No | Type | Description | Debit | Credit | Running Balance | Reference | Project | Business | Area

Plain-language footer: “You have to pay X” / “X has to pay you”.

---

## 4. Dashboard management pack export

Monthly pack sections:

1. Executive Summary  
2. Cash/Bank  
3. Receivables / Payables  
4. Top Parties  
5. Business-wise movement  
6. Project-wise movement  
7. Monthly trend  
8. Overdues  

Formats: PDF (branded) + XLSX workbook (one sheet per section).

---

## 5. Export formats

| Format | Use |
|--------|-----|
| **PDF** | Logo, company details, title, period, filters, timestamp, page numbers, totals, signatory area |
| **DOCX** | Editable party statement, business summary, management summary |
| **XLSX** | Full datasets for analysis |
| **CSV** | Raw rows |

Word/DOCX is an explicit product requirement; implement via server-side template engine (PHP library) with company branding.

---

## 6. Global search targets

Party name, mobile, voucher number, reference, amount (exact paise/rupee parse), note/narration, project, area.

Results grouped by entity type; click-through respects permissions (e.g. hide P&amp;L links for Data Entry).

---

## 7. Performance notes

- Precompute is optional; v1 indexed range scans on `company_id + voucher_date` sufficient for early tenants.
- Heavy exports = async job + download document row in `company_documents` (future if timeouts).
