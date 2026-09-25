# Company Test Matrix

**Status:** Architecture (pre-implementation)  
**Style:** Align with SparowVault certification gates (unit + API + browser evidence)

---

## 1. Test layers

| Layer | Location (planned) | Focus |
|-------|--------------------|-------|
| Unit | `src/company/services/__tests__`, `php/helpers/company` tests | Balancing, purpose maps, ageing, FY derivation |
| API | `tests/api/company/*` | AuthZ, isolation, idempotency, posting |
| Browser E2E | `tests/browser/company/*` | Login → select → quick entry → party ledger |
| SQL fixtures | `sql/fixtures/company/*` | Seed COA + sample vouchers |

Personal finance regression suite must remain green; company work must not break personal gates.

---

## 2. Tenant isolation (P0)

| ID | Assertion |
|----|-----------|
| ISO-01 | User without membership cannot GET company voucher |
| ISO-02 | Member of A cannot read B’s party by ID |
| ISO-03 | Member of A cannot post voucher with B’s `company_id` in body |
| ISO-04 | Exports cannot include other company rows |
| ISO-05 | Attachments metadata scoped; no cross-company document fetch |
| ISO-06 | Search results never leak cross-company |
| ISO-07 | Audit log queries scoped |

---

## 3. Auth / membership (P0)

| ID | Assertion |
|----|-----------|
| AUTH-01 | Unauthenticated `/api/company/*` → 401 |
| AUTH-02 | Authenticated, no membership → 403 |
| AUTH-03 | Suspended membership → 403 |
| AUTH-04 | Permission missing → 403 even if UI would show |
| AUTH-05 | Platform admin ≠ company access |
| AUTH-06 | Single membership skips selector (browser) |
| AUTH-07 | Sensitive action without PIN → reject when enabled |

---

## 4. Double-entry engine (P0)

| ID | Assertion |
|----|-----------|
| DE-01 | Unbalanced post → 422, no rows persisted |
| DE-02 | Balanced RECEIPT loan → bank↑ liability↑ P&amp;L 0 |
| DE-03 | PAYMENT advance → asset↑ cash↓ expense 0 |
| DE-04 | CONTRA cash→bank → P&amp;L 0, party 0 |
| DE-05 | JOURNAL interest accrual → expense↑ payable↑ |
| DE-06 | Purchase+GST three-line voucher balances |
| DE-07 | Float/rupee string normalized to paise exactly |
| DE-08 | Negative line amount rejected |
| DE-09 | Posted voucher in-place edit rejected |
| DE-10 | Reverse restores bill outstanding |

---

## 5. Idempotency (P0)

| ID | Assertion |
|----|-----------|
| IDM-01 | Same mutationId + body → one voucher |
| IDM-02 | Same mutationId + different body → 409 |
| IDM-03 | Concurrent duplicate posts → single durable voucher |

---

## 6. Party model (P0/P1)

| ID | Assertion |
|----|-----------|
| PTY-01 | One party multiple roles |
| PTY-02 | Categories M:N |
| PTY-03 | Relationship-wise balances differ correctly |
| PTY-04 | Plain-language payable/receivable wording |
| PTY-05 | Category report aggregates only that category’s parties |

---

## 7. Bills & ageing (P0)

| ID | Assertion |
|----|-----------|
| BILL-01 | Partial payment leaves residual outstanding |
| BILL-02 | Multi-bill allocation sums exact |
| BILL-03 | Over-allocation rejected |
| BILL-04 | Ageing bucket boundaries inclusive as specified |
| BILL-05 | ON_ACCOUNT does not clear specific bill |

---

## 8. Dimensions (P1)

| ID | Assertion |
|----|-----------|
| DIM-01 | Project filter on day book |
| DIM-02 | Cost centre allocations must sum to line |
| DIM-03 | Hierarchical area includes children option |

---

## 9. Reports (P0)

| ID | Assertion |
|----|-----------|
| RPT-01 | TB debit total = credit total |
| RPT-02 | BS assets = liabilities + equity |
| RPT-03 | Loan receipt absent from P&amp;L |
| RPT-04 | Day book chronological |
| RPT-05 | Party statement running balance correct |
| RPT-06 | Export filters match on-screen filters |
| RPT-07 | PDF contains company name, period, timestamp |

---

## 10. Period lock & audit (P0)

| ID | Assertion |
|----|-----------|
| LCK-01 | Post before lock date rejected |
| LCK-02 | Reopen requires permission + reason |
| AUD-01 | Post writes audit with actor |
| AUD-02 | Reverse writes before/after linkage |
| AUD-03 | Client cannot forge `company_audit_logs` |

---

## 11. Approvals (P1)

| ID | Assertion |
|----|-----------|
| APR-01 | Over-threshold payment → PENDING not POSTED |
| APR-02 | Approve → POSTED and affects TB |
| APR-03 | Reject → not in books |

---

## 12. Domain boundary (P0)

| ID | Assertion |
|----|-----------|
| BND-01 | Company post does not create personal `transactions` row |
| BND-02 | Company post does not write `financial_events` |
| BND-03 | Personal txn create does not create company voucher |
| BND-04 | Bridge link (when implemented) requires explicit API + dual confirmation |

---

## 13. UX / browser smoke (P1)

| ID | Flow |
|----|------|
| UX-01 | Login → select → dashboard KPIs render |
| UX-02 | Money Received loan → preview shows no profit → save → party payable |
| UX-03 | Money Paid advance → party advance asset |
| UX-04 | Transfer cash↔bank |
| UX-05 | Party statement date range |
| UX-06 | Permission-denied toast for viewer on payment |

---

## 14. Certification gate (recommended)

```text
npm run test:company-unit
php tests for company helpers
api company isolation suite
browser company smoke
personal finance existing gates still pass
```

Evidence folder (when implemented): `docs/company/evidence/`.

---

## 15. Non-testing until built

Interest auto-post, Tally import, group consolidation, inventory — mark N/A in matrices until phase starts.
