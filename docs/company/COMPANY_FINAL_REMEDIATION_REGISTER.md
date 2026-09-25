# Company Final Remediation Register

**Updated:** 2026-09-23 (post remediation implementation)  
**Baseline:** company:test PASS · demo-certify PASS · company:gate:all PASS (9 specialized)

| ID | Severity | Domain | Defect | Status | Evidence |
| -- | -------- | ------ | ------ | ------ | -------- |
| CMP-P0-001 | P0 | Purpose | OTHER received direction | CLOSED | OTHER_RECEIPT + php-tests |
| CMP-P0-002 | P0 | Purpose | PROPERTY_PAYMENT semantics | CLOSED | PROPERTY_EXPENSE / PROPERTY_ADVANCE |
| CMP-P0-003 | P0 | Reversal | Non-atomic reversal | CLOSED | company_reverse_voucher single txn |
| CMP-P0-004 | P0 | Bills | NEW_REFERENCE reverse leak | CLOSED | unwind → CANCELLED |
| CMP-P0-005 | P0 | Bills | ON_ACCOUNT silent no-op | CLOSED | persist null bill_ref_id |
| CMP-P0-006 | P0 | UI | Parties stub | CLOSED | PartiesPage live API |
| CMP-P0-007 | P0 | UI | Voucher browser stub | CLOSED | VouchersPage + reverse |
| CMP-P1-001 | P1 | Purpose | FE/PHP drift | CLOSED | config/company-purpose-rules.json |
| CMP-P1-002 | P1 | Preview | Preview ≠ post | CLOSED | enrich + previewHash |
| CMP-P1-003 | P1 | Reports | Key mismatch | CLOSED | report registry + hub |
| CMP-P1-004 | P1 | Reports | ReportView stub | CLOSED | companyApi.report |
| CMP-P1-005 | P1 | AR/AP | Zero UI | CLOSED | bills + ageing |
| CMP-P1-006 | P1 | UI | Admin stubs | CLOSED | Users/Audit/Export/Search/Masters/Approvals |
| CMP-P1-007 | P1 | Security | /company lock bypass | CLOSED | App.tsx lock+PIN |
| CMP-P1-008 | P1 | Client | API parity | CLOSED | client.ts + parity doc |
| CMP-P1-009 | P1 | COA | Fictional ledgers | CLOSED | live LedgersPage |
| CMP-P1-010 | P1 | UI | requiresParty | CLOSED | Quick forms |
| CMP-P1-011 | P1 | Approvals | Side effects | CLOSED | company_approve_voucher_tx |
| CMP-P2-001 | P2 | Scope | Schema-only modules | CLOSED | DEFERRED documented |
| CMP-P2-002 | P2 | Gates | Cosmetic aliases | CLOSED | gate-specialized.mjs |
| CMP-P2-003 | P2 | Security | Sensitive PIN | CLOSED | company_require_sensitive_pin reverse/reopen/export |
| CMP-P2-004 | P2 | Schema | Reversal FK | CLOSED | fk_cv_reversed + fk_cv_correction applied |
| CMP-P2-005 | P2 | Test | HTTP E2E | CLOSED | http-e2e.php |
| CMP-P2-006 | P2 | Test | Browser cert | CLOSED | browser-smoke A–N structural; live env optional |
| CMP-P2-007 | P2 | Ops | Migration evidence | CLOSED | restore-drill.php + snapshot |
| CMP-P2-008 | P2 | Perf | Performance | CLOSED | perf-generator 10k vouchers evidenced |

**P0/P1 open count:** 0  
**Also closed this pass:** purpose JSON shared in TS, `company_apply_posted_side_effects_tx`, duplicate party 409, allocate on-account, opening balances, correction lineage, period locks UI, report registry `enabled:false` honesty.
