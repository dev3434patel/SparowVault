# RBAC and Security Audit

## Update - 11 September 2026

The [current security assessment](FULL-PROJECT-AUDIT-2026-09-11.md#10-security-and-roles) records passing repaired session/CSRF/owner-isolation paths and remaining schema, visible-audit and webhook-retry defects. Historical findings below are preserved; an admin HTTP 500 denial is not a demonstrated admin access bypass.

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## Role model

Platform identity supports user/admin. Tenant ownership is enforced in SQL using the authenticated user. Household owner/partner/viewer records are not a substitute for agency roles or organization tenancy. Do not infer permission safety from hidden buttons.

| Requested role | Status | Assessment |
| --- | --- | --- |
| Super Admin | Absent as distinct role | No protected super-admin-only role management or security boundary. |
| Admin | Present platform role | User/plan/subscription/flag/branding administration, not an agency finance approval role. |
| Finance Manager | Absent | No permission-specific approvals, finance dashboard or close access. |
| Accountant | Absent | No accountant-only books/CA exports with restricted mutation. |
| Partner | Absent as agency role | Household partner is not company equity/profit allocation membership. |
| Auditor | Absent | No immutable read-only company audit scope. |
| Project Manager | Absent | No project ownership or expense permission model. |
| Employee | Absent | No own-expense submit/proof workflow. |
| Viewer | Absent as platform role | Household viewer exists as local record with bypassable mutation-path restrictions. |

## Actual permission matrix

| Principal | Own entity read/write | Other user entities | Admin API | PIN/export/delete | Household |
| --- | --- | --- | --- | --- | --- |
| Anonymous | Denied by active-user guard | Denied | Denied | Login/register/policies public; privileged account actions require auth | No verified anonymous access |
| Active user | Generally allowed across 37 own collections; validation gaps | Isolation tests pass for covered cases | Denied; admin/users returns incorrect 500 | Account export/delete reauthenticate PIN; other entity mutations usually do not | Single/batch rules inconsistent (B12) |
| Platform admin | Own data plus platform administration | No blanket financial browsing claim; verify support access separately | Allowed, even with must_change_pin=1 (X01) | Can reset users; old sessions not revoked | Not a nine-role agency ACL |
| Inactive/deleted user | Active-user lookup intended to deny | Denied | Denied | Existing account deletion suite checks login denial | No complete role/device matrix |
| Household viewer record | Still platform active-user session | Tenant guard separate | Not admin merely by household role | No robust action-level household reauth | Single escalation rejected; batch escalation accepted |

## Security probes

| ID | Assertion | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| S01 | ordinary user cannot list platform users | "non-2xx" | 500 | PASS |
| S02 | cookie mutation requires CSRF | "403" | 200 | FAIL |
| S03 | sync push rejects absent CSRF | "403" | 403 | PASS |
| S04 | PIN changes with valid current PIN | "200" | 200 | PASS |
| S05 | recovery answer survives PIN change | "200" | 401 | FAIL |
| S06 | previous session revoked after PIN change | "401" | 200 | FAIL |
| S07 | logged out bearer token revoked | "401" | 200 | FAIL |
| S08 | seed admin forced to rotate PIN before privileged API | "deny while must_change_pin=1" | {"flag":0,"status":200} | FAIL |
| S09 | stale sync cannot resurrect a deleted record | "conflict or deleted" | {"push":200,"isDeleted":0} | FAIL |
| S10 | invalid batch leaves no partial financial writes | "422 and first row absent" | {"status":422,"firstRowStatus":200} | FAIL |
| S11 | batch PATCH preserves household viewer restrictions | "both denied" | {"single":422,"batch":200} | FAIL |
| S12 | forwarded-IP spoofing cannot evade account lockout | "rate limit/lockout by attempt 6" | [401,401,401,401,401,401,401] | FAIL |
| S13 | client cannot create authoritative-looking audit trail | "reject fabricated audit records" | 201 | FAIL |
| S14 | concurrent duplicate mutation has one durable record | 1 | 4 | FAIL |
| S15 | bulk hard-delete reconciles persisted financial events | "no posted orphan events" | {"before":1,"after":1} | FAIL |
| HTTP/.git/HEAD | project internal file exposure | "deny sensitive/internal file" | 200 | FAIL |
| HTTP/.env | project internal file exposure | "deny sensitive/internal file" | 403 | PASS |
| HTTP/package.json | project internal file exposure | "deny sensitive/internal file" | 200 | FAIL |
| HTTP/src/App.tsx | project internal file exposure | "deny sensitive/internal file" | 200 | FAIL |
| HTTP/sql/schema.sql | project internal file exposure | "deny sensitive/internal file" | 403 | PASS |
| X01 | must_change_pin=1 blocks privileged reads | true | false | FAIL |
| X02 | replacing recovery and resetting PIN requires original PIN | true | false | FAIL |
| X03 | category schema rejects unsupported appliesTo | 422 | 201 | FAIL |
| X04 | transactions reject nonexistent financial references | 422 | 201 | FAIL |
| X05 | properly seeded own category is present in account export | true | true | PASS |
| X06 | backup restore preserves account and category references | {"accountExists":true,"categoryExists":true} | {"accountExists":false,"categoryExists":false} | FAIL |
| X07 | wipe all profile data removes household fixture | 404 | 200 | FAIL |

## Important interpretation limits

- S01 is a pass for denial only; HTTP 500 is separately a defect B33. No admin data was obtained by that ordinary user.
- S08 initially examined a seed with flag=0, so it alone did not prove flag=1 bypass. X01 subsequently set flag=1 in the isolated database, reproduced privileged access, then restored the flag.
- S02 proves inconsistent server CSRF enforcement, not a complete browser exploit. SameSite=Lax and CORS reduce some cross-origin paths; same-site, proxy and actual hosting conditions require dedicated browser security tests.
- S13 concerns client auditLogs only. It does not establish write access to separate SQL audit_logs/admin_audit_logs.
- S14 used synthetic category records; duplicate monetary posting is the risk of the same shared create implementation, not an actual charge executed by this audit.
- All test mutations used sparowvault_audit_test_20260910 and synthetic users. No real payment, notification, external upload or tax filing was performed.

## Controls that exist

Bcrypt-based PIN verification, JWT signature/issuer/audience/time checks, active-user database lookup, HttpOnly authentication cookie, SameSite=Lax, production Secure-cookie behavior, production secret guards, collection allowlists, payload size limits, user-scoped SQL queries, policy acceptance, payment signature and ownership verification, account export/delete PIN checks and some rate-limit/audit helpers are implemented. Their existence is useful, but it does not compensate for the confirmed recovery, revocation, mutation-path and ledger defects.

## Security assessment by surface

| Surface | Assessment / remaining work |
| --- | --- |
| PIN strength and storage | Short 4-8 digit PINs demand robust account-based throttle and recovery protection. bcrypt plus salt is present; no plaintext PIN database storage was demonstrated. Default local seed credentials require enforced rotation. |
| Sessions | B07: no effective bearer revocation after logout/PIN change. Add server-recognized sessions and device/recent-auth controls. |
| Client lock | UI/local session lock is a privacy affordance, not data-at-rest encryption or server-token revocation. Test cached data after logout/shared-device user switch. |
| Recovery | B06/B09: salt coupling breaks legitimate reset and session-only recovery replacement bypasses existing PIN. Security-answer-only recovery is weak compared with verified recovery channels. |
| CSRF/CORS | Only some write paths demand tokens. Apply a consistent cookie-auth policy and test deployment Origin/CORS/proxy settings. |
| XSS | React text rendering provides baseline escaping. No exploitable DOM XSS was reproduced. User-supplied export text creates a distinct CSV formula risk. CSP/branding URLs require staging checks. |
| SQL injection / tenant access | Parameterized queries and allowlists are present. Covered cross-user tests pass. No claim of exhaustive query audit, identifier fuzzing or every alias is made. |
| Uploads / files | No complete attachment upload service exists. Browser xlsx input is reachable and vulnerable-version advisories apply. Private storage, malware/size controls and authorized downloads are not implemented as agency features. |
| Secrets | Live secrets were not published in reports. Production guardrails exist. Missing .env.host test fixtures are not permission to commit secret values. Actual deployment secret rotation was not performed. |
| Default/public files | Dev root serves .git/HEAD and source; packaged artifact excludes most source. Apache production deny/rewrite/CSP rules remain unverified on a deployed host. |
| Backups | Incomplete UI backup (B15), no proven encrypted full restore across all contracts. Database backup scripts exist; production restoration/RPO/RTO not exercised. |
| Audit | Client-writable activity collection is not immutable evidence. Complete transactionally coupled security/financial logs and read-only authorized viewer are missing. |
| Payment gateway | 9 ownership/signature checks passed with synthetic webhook events. Real Razorpay checkout, refunds, settlement reconciliation and production key configuration untested. |
| Dependencies | 19 advisory package nodes; runtime xlsx is the most direct file-input concern. Dev tooling critical advisories are conditional exposure, not proven production compromise. |
| Operational abuse | No load/DoS exercise against public services; local spoofed-IP login test reproduces weakness. Request limits do not replace account abuse detection. |

## Primary security guidance consulted

Invalidate sessions on logout and sensitive credential changes, with server-side enforcement rather than only removing a browser cookie. See [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). Apply consistent CSRF protection to cookie-authenticated writes and assess SameSite, origins and custom headers together. See [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). These sources support remediation principles; the repository findings are based on local code and probes, not on a generic checklist alone.
