# Company Voucher Rules

**Status:** Architecture (pre-implementation)  
**Invariant:** Posted voucher ⇒ Σ Debit paise = Σ Credit paise

---

## 1. Global posting rules

1. Amounts are positive integers (paise) on each line; side encodes direction.
2. At least two lines for any posted voucher (except explicitly forbidden single-line).
3. Cash/Bank ledgers must appear on RECEIPT (Dr), PAYMENT (Cr), CONTRA (both).
4. Period lock: `voucher_date < lock_before_date` → reject mutate/post.
5. `mutation_id` required; unique per company.
6. Narration recommended; purpose code stored for analytics.
7. Party required when purpose implies party relationship (loan, vendor, advance, etc.).

---

## 2. Voucher type rules

### RECEIPT (Money Received)

**Structure**

| Side | Account |
|------|---------|
| Dr | Cash or Bank |
| Cr | Counter-account(s) from purpose |

**Allowed purposes → mapping (defaults)**

| Purpose code | Credit ledger / relationship |
|--------------|------------------------------|
| `LOAN_RECEIVED` | Party Loan Payable (liability) |
| `CUSTOMER_PAYMENT` | Party Receivable / Against bill |
| `CAPITAL_INTRODUCED` | Capital / Partner Capital |
| `ADVANCE_RETURNED` | Reduce Advance Asset / against advance bill |
| `INTEREST_INCOME` | Interest Income |
| `PROPERTY_RECEIPT` | Property Income or Property liability/advance per override |
| `FARMING_RECEIPT` | Farming Income or advance settlement |
| `SALE` | Sales (+ tax lines if enabled) |
| `OTHER_INCOME` | Other Income |
| `OTHER` | Requires explicit ledger pick |

**Forbidden:** Storing only “Credit ₹X” without bank Dr line.

### PAYMENT (Money Paid)

**Structure**

| Side | Account |
|------|---------|
| Dr | Counter-account(s) from purpose |
| Cr | Cash or Bank |

**Purposes**

| Purpose code | Debit ledger / relationship |
|--------------|-----------------------------|
| `LOAN_REPAYMENT` | Party Loan Payable (reduce liability) |
| `VENDOR_PAYMENT` | Party Payable / against bill |
| `ADVANCE_GIVEN` | Advance to Party (asset) — **not** expense by default |
| `MONEY_LENT` | Loan asset to party |
| `FARMING_PAYMENT` | Farming Expense **or** advance — user must choose subtype |
| `PROPERTY_PAYMENT` | Ask: advance / investment / expense / payable settlement |
| `PURCHASE` | Purchase (+ tax) / payable |
| `EXPENSE` | Selected expense ledger |
| `SALARY` | Salary expense (or payable if accrual split) |
| `INTEREST` | Interest Expense / reduce interest payable |
| `REFUND` | Contra to prior income/liability as selected |
| `CAPITAL_WITHDRAWAL` | Drawings |
| `OTHER` | Explicit ledger |

**Hard rule:** Do not auto-map every payment to Expense.

### CONTRA

Only Cash/Bank (money) ledgers. No income/expense/party P&amp;L impact. Two lines minimum (From Cr, To Dr) or multi-bank splits balanced.

### JOURNAL

Any ledgers; no automatic cash. Used for accruals, opening (or use OPENING_BALANCE type), non-cash adjustments. Still must balance.

### PURCHASE / SALE

Multi-line with tax optional:

```text
Purchase Dr 1,00,000
Input GST Dr 18,000
   Vendor Cr 1,18,000
```

Do not silently rewrite historical purchase; use DEBIT_NOTE / CREDIT_NOTE.

### DEBIT_NOTE / CREDIT_NOTE

Linked to original via `correction_of_voucher_id` when applicable. Creates new posted artefact.

### OPENING_BALANCE

Single balanced opening journal at/before `books_start_date`. May create bill refs for party openings.

### ADJUSTMENT

Same as journal but flagged for audit sensitivity; may require PIN.

---

## 3. Effect preview computation

From drafted lines:

1. Sum money ledgers → cash impact
2. Sum liability/receivable relationship lines → party impact
3. Sum income − expense lines → profit impact
4. Present plain language + Dr/Cr

If preview profit impact ≠ 0 for pure loan purposes → **block** (template bug).

---

## 4. Bill allocation rules

On RECEIPT/PAYMENT involving party AR/AP/advance:

| User choice | System |
|-------------|--------|
| New reference | Create `bill_ref` + allocation NEW_REFERENCE |
| Against bills | Allocate AGAINST_REFERENCE; reduce `outstanding_paise` |
| Advance | ADVANCE bucket |
| On account | ON_ACCOUNT; remains unallocated |

Partial allocations allowed; cannot allocate more than remaining outstanding (paise-exact).

---

## 5. Cost-centre allocation

If enabled on a line total T:

```text
sum(allocation_paise) == T
```

Percent mode converts with leftover paise assigned to last centre (deterministic).

---

## 6. Reversal rules

Reversing voucher:

- Opposite sides, same amounts, same ledgers/dims (or mirrored)
- Original status → REVERSED
- Link `reversed_voucher_id`
- Bill allocations reversed / outstanding restored
- Requires `reverse_voucher` (+ PIN if sensitive)

---

## 7. Idempotency & concurrency

- Duplicate `mutation_id` + same body hash → return original voucher
- Duplicate `mutation_id` + different hash → 409 conflict
- Optimistic lock optional via `version` on draft edits

---

## 8. Examples (canonical)

### Loan received ₹1,00,000 into Bank A from User1

```text
Bank A                 Dr  1,00,000
   User1 Loan Payable      1,00,000 Cr
```

UI: Money Received / Purpose: Loan received.  
P&amp;L: no change.

### Advance to Farmer User3 ₹70,000 from Bank

```text
Advance to Farmer User3  Dr  70,000
   Bank                      70,000 Cr
```

UI: Money Paid / Purpose: Advance given.  
**Not** Farming Expense.

### Later settle: purchase ₹80,000 + refund ₹20,000

Journal/purchase + receipt against advance bills — advance outstanding → 0; expense/purchase recognized only on settlement voucher.

### Cash to Bank ₹10,000

```text
Bank   Dr  10,000
   Cash    10,000 Cr
```

---

## 9. Validation checklist (server)

- [ ] membership + permission
- [ ] company_id consistent on all child rows
- [ ] voucher_type allowed
- [ ] date not locked
- [ ] ledgers active & belong to company
- [ ] party/dims belong to company
- [ ] ΣDr = ΣCr
- [ ] cash rules per type
- [ ] purpose template satisfied or override permitted
- [ ] allocations consistent
- [ ] mutation receipt recorded
- [ ] audit row written
