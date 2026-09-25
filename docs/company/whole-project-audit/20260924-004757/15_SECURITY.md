# 15 — Security

## Authentication

| Check | Status | Evidence |
|-------|--------|----------|
| Cloud user required | PASS | `company_auth_user` / bootstrap_api |
| Shared lock / mustChangePin | PASS (code) | App.tsx company portal |
| Session hydration race | PENDING | hydrate script this wave |
| Login UI | LIVE | LoginPage |

## Authorization / RBAC

| Check | Status | Notes |
|-------|--------|-------|
| Permission seeded roles | PASS | seed.php |
| Server enforce on writes | PASS | posting + authz |
| Membership-only reads | PARTIAL | search, voucher-item, preview, lock GET |
| Unused permission keys | PARTIAL | manage_ledgers, edit_*, delete_draft, export_backup, manage_company, … |
| UI permission gates | PASS | NewActionMenu, nav, pages |
| Export without view_* | PARTIAL | export_reports only |

## Tenant isolation / IDOR

`company:test:idor` this run: **PASS** (`raw/EVIDENCE_IDOR.txt`).

## CSRF / CORS / XSS / SQLi

| Run | Result | Artifact |
|-----|--------|----------|
| Default `review_demo` | FAIL live login 401 | `EVIDENCE_SECURITY_MATRIX.txt` |
| `cert_211549` + PIN | **PASS** full matrix | `EVIDENCE_SECURITY_MATRIX_AUTH.txt` |

Double-submit CSRF enforced when session cookie present. Bearer-only may skip CSRF — **PARTIAL** for pure Bearer clients. Dimensions SQL identifiers allowlisted.

## Auditability

Append-only `company_audit_logs` with view_audit. CASCADE wipe with workspace. **PARTIAL**.

## Sensitive actions

Reverse, period reopen, exports require sensitive PIN. **PASS** (code + gate asserts helper present).

## Security scorecard

| Dimension | Score /10 | Status |
|-----------|----------:|--------|
| Authentication | 8 | Shared platform auth |
| Authorization | 6 | Membership-only gaps + unused keys |
| Tenant Isolation | 8 | company_id + IDOR PASS |
| CSRF | 8 | PASS with valid session |
| CORS | 8 | PASS matrix |
| Input Safety | 8 | Bound params + SQLi probe |
| Auditability | 7 | Exists; cascade wipe |
| Sensitive Actions | 8 | PIN gated |

**Overall Security: PASS with PARTIAL authorization-depth notes**
