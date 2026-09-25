# Company Security Certification

**Date:** 2026-09-23  
**Status:** **PARTIAL**

## Controls present

| Control | Implementation |
|---------|----------------|
| Auth required | `require_cloud_user()` on company APIs |
| Membership required | `company_require_membership` |
| Permission keys | `company_require_permission` |
| Cross-company assert | `company_assert_same_company` |
| Idempotency | mutation receipts |
| Audit | `company_audit_write` |
| Period lock | posting checks `company_period_locks` |
| Platform admin ≠ company access | no automatic grant |

## Gaps

- Dedicated automated IDOR suite across all endpoints not fully executed this session.
- Sensitive PIN for reopen/export not fully UI-wired.
- Approval workflow enforcement is threshold-hook only.

## Verdict

**PARTIAL** — design and helpers enforce isolation; full security probe matrix not green-certified.
