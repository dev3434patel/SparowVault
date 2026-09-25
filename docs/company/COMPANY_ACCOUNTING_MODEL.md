# Company Accounting Model

**Status:** Architecture (pre-implementation)  
**Companion:** `COMPANY_VOUCHER_RULES.md`, `COMPANY_DATABASE_SCHEMA.md`

---

## 1. Core equations (always true)

### Balance sheet identity

```text
Assets = Liabilities + Equity
```

Derived from account natures of **POSTED** voucher lines only.

### Profit identity

```text
Profit = Income − Expenses
```

Cash movement alone does **not** create profit. Example: loan received increases Asset (Bank) and Liability (Loan Payable); P&L unchanged.

### Voucher identity

```text
SUM(line.amountPaise WHERE side = DEBIT)
  =
SUM(line.amountPaise WHERE side = CREDIT)
```

Exact integer equality in paise. Reject otherwise. No exceptions for drafts that are being posted.

---

## 2. Chart of accounts

### Hierarchy

```text
AccountGroup (nature + parent)
  └── Ledger (postable account)
        └── optional PartyRelationshipAccount (subledger link)
```

### Nature (top-level)

| Nature | Normal balance | Reports into |
|--------|----------------|--------------|
| `ASSET` | Debit | Balance Sheet |
| `LIABILITY` | Credit | Balance Sheet |
| `EQUITY` | Credit | Balance Sheet |
| `INCOME` | Credit | P&L |
| `EXPENSE` | Debit | P&L |

Groups may nest. Ledgers post only to leaf accounts (or explicitly marked postable groups — prefer leaf ledgers only).

### Baseline seed groups (customizable)

```text
ASSETS
  Cash
  Bank Accounts
  Accounts Receivable
  Loans & Advances Given
  Deposits
  Inventory
  Property / Fixed Assets
  Other Current Assets

LIABILITIES
  Accounts Payable
  Loans Borrowed
  Party Payables
  Taxes Payable
  Expenses Payable
  Other Liabilities

EQUITY
  Capital
  Partner Capital
  Drawings
  Retained Earnings

INCOME
  Sales
  Service Income
  Interest Income
  Farming Income
  Property Income
  Other Income

EXPENSE
  Purchase
  Farming Expense
  Property Expense
  Salary
  Utilities
  Transport
  Professional Fee
  Interest Expense
  Other Expense
```

Admins may add subgroups/ledgers. Seed is a template, not irreversible hard-code.

### Cash & Bank ledgers

Each cash/bank instrument is a ledger under Cash or Bank Accounts. Contra moves only between these (or equivalent asset money ledgers).

---

## 3. Party model (critical)

### One person / business = one Party

Do **not** create separate party rows for “Ramesh as Farmer” vs “Ramesh as Lender”.

```text
Party: Ramesh Patel
  roles: LENDER, FARMER, PROPERTY_PARTNER
  categories: Farmers, Lenders, Property People
  tags: VIP, Savli, Long-term
```

### Party fields (logical)

- Identity: `displayName`, `legalName?`, contact, address, area
- Tax: `gstin?`, `pan?`, `taxTreatment?` (GST optional)
- Credit policy: `defaultCreditDays?`, `creditLimitPaise?`
- Opening: `openingBalancePaise` + `openingBalanceSide` (migrated via OPENING_BALANCE voucher preferred)
- Flags: `active`, `notes`

### Party type vs roles

`partyType` is a **primary label** (PERSON, BUSINESS, …) for UI defaults.  
**Roles** are many-to-many and are the source of truth for relationship behaviour.

Suggested roles: `LENDER`, `BORROWER`, `VENDOR`, `CUSTOMER`, `FARMER`, `EMPLOYEE`, `CONTRACTOR`, `PARTNER`, `LAND_OWNER`, `PROPERTY_PARTY`, `OTHER`.

### Categories (user-defined)

Many-to-many membership. Used for group reports (Farmers outstanding), not for GL posting rules.

### Tags

Search/filter only. Never used as accounting SoT.

---

## 4. Party subledger / relationships

A party may have **multiple economic relationships**, each linked to a control ledger:

| Relationship | Typical control ledger | Balance meaning |
|--------------|------------------------|-----------------|
| Loan payable | Loans Borrowed | Company owes party |
| Vendor payable | Accounts Payable | Company owes for purchases |
| Customer receivable | Accounts Receivable | Party owes company |
| Advance to party | Loans & Advances Given | Recoverable asset |
| Partner capital | Partner Capital | Equity position |

### Two views (required)

1. **Party Net Position** — sum of all relationship balances (with clear disclaimer if mixed natures).
2. **Relationship-wise balance** — never collapse loan payable with advance receivable into one meaningless “net” without breakdown.

### Plain-language balances

Prefer:

- “You have to pay Ramesh: ₹2,40,000”
- “Ramesh has to pay you: ₹1,25,000”

Advanced toggle: Dr/Cr balance.

---

## 5. Business dimensions

A voucher (and optionally each line) may carry:

| Dimension | Examples | Notes |
|-----------|----------|-------|
| Business unit | Farming, Property, Lending | Segment P&amp;L / cash |
| Branch | Branch A | Optional |
| Area | Savli (hierarchical) | Parent/child areas |
| Project | Farm Plot 2026 | Investment tracking |
| Cost centre | Farm 1, Sales Team | Allocation % allowed |

### Cost-centre allocation rule

If a voucher/line is split across cost centres, allocation amounts (or %) must sum exactly to the allocated total in paise.

---

## 6. Voucher architecture

### Header + lines (mandatory)

Never store a single ambiguous “debit/credit transaction” row as the only record.

```text
CompanyVoucher
  └── CompanyVoucherLine[]  (each: ledgerId, side, amountPaise, optional dims)
```

### Voucher types (v1)

| Type | Cash impact | Typical use |
|------|-------------|-------------|
| `RECEIPT` | Cash/Bank Dr | Money in |
| `PAYMENT` | Cash/Bank Cr | Money out |
| `CONTRA` | Cash/Bank both sides | Internal transfer |
| `JOURNAL` | None required | Accruals, non-cash |
| `PURCHASE` | Optional | Purchase + tax lines |
| `SALE` | Optional | Sale + tax lines |
| `DEBIT_NOTE` | — | Corrections / returns |
| `CREDIT_NOTE` | — | Corrections / returns |
| `OPENING_BALANCE` | — | Migration opening |
| `ADJUSTMENT` | — | Controlled adjustments |

Future reserved: PO, SO, delivery, receipt note — **no silent mutation** of historical purchase/sale; use notes.

### Status lifecycle

```text
DRAFT → PENDING_APPROVAL? → APPROVED? → POSTED
                ↘ REJECTED
POSTED → REVERSED (via reversing voucher)
DRAFT/PENDING → CANCELLED
```

**Only `POSTED` affects books, balances, reports, ageing.**

### Mutation discipline

Prefer for posted vouchers:

1. **Reversal** voucher (mirror Dr/Cr)
2. **Replacement** / correction voucher linked via `correctionOfVoucherId` / `reversedVoucherId`
3. Never silent overwrite of posted lines

---

## 7. User entry vs accounting engine

### Quick entry (operator)

Fields for Money Received:

Amount, Date, Received From (Party), Received Into (Cash/Bank ledger), Purpose, Business, Category, Project, Area, Reference, Note, Attachment.

Purpose presets map to **posting templates** (see `COMPANY_VOUCHER_RULES.md`). Admin may override ledgers.

### Effect preview (required before save)

Plain:

```text
Bank A        +₹1,00,000
User1 Payable +₹1,00,000
Company cash: +₹1,00,000
Liability:    +₹1,00,000
Profit:        No change
```

Advanced:

```text
Bank A/c              Dr  ₹1,00,000
User1 Loan Payable        ₹1,00,000 Cr
```

---

## 8. Bill-wise outstanding

### Bill reference

First-class `company_bill_refs` for advances, invoices, loans drawdowns, etc.

Reference types on allocation:

- `NEW_REFERENCE` — create outstanding
- `AGAINST_REFERENCE` — settle existing
- `ADVANCE` — advance bucket
- `ON_ACCOUNT` — unallocated on party

### Partial payment

Outstanding ₹1,00,000; pay ₹40,000 → remaining ₹60,000; status not fully settled.

### Allocations

M:N between payments and bills via `company_bill_allocations`.

### Ageing buckets (default)

`Not Due`, `0–15`, `16–30`, `31–60`, `61–90`, `90+` (company-configurable).

---

## 9. Contract / projection layers (not SoT)

These sit **above** the ledger and never replace it:

| Module | Role |
|--------|------|
| Loan / lender agreement | Principal, rate, schedule — posts still via vouchers |
| Farmer advance tracker | Tracks advance settlement lifecycle |
| Property investment tracker | Purpose-driven classification |
| Interest engine (optional) | Disabled until explicitly enabled |
| Recurring rules | Generate draft vouchers on schedule |

---

## 10. Financial year & periods

- `financialYearStartMonth` on company workspace (India default often April = 4).
- FY for a voucher date is **derived**, not free-typed inconsistently.
- Period locks: `lock_before_date` — block post/edit before date except privileged reopen with reason + PIN.

---

## 11. Opening balances

Migration path:

1. Create cash/bank/party/capital opening via balanced `OPENING_BALANCE` journal.
2. Prefer bill-wise openings where outstanding matters.
3. Opening must itself satisfy Debit = Credit.

---

## 12. Anti-patterns (forbidden)

- Mapping UI “Money Received” directly to “Credit” as the only stored fact
- Treating every payment as Expense
- Collapsing multi-relationship party into one GL balance without breakdown
- Inferring purpose solely from party category
- Posting unbalanced vouchers
- Updating posted history in place
- Mixing personal transaction IDs into company balances without bridge journal
