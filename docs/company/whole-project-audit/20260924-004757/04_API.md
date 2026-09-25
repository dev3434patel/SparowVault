# 04 — API

## Surface

24 files under `api/company/` → `php/controllers/company.php` → helpers.

## Endpoint matrix (condensed)

| Endpoint | Methods | Permission | Client method | Notes |
|----------|---------|------------|---------------|-------|
| workspaces.php | GET/POST | auth / create | listMemberships, createWorkspace | |
| workspace.php | GET | membership | getWorkspace | |
| workspace-item.php | GET | membership | — | **Duplicate** of workspace.php |
| workspace-create.php | POST | auth | — | **Duplicate** of workspaces POST |
| memberships.php | GET/POST | manage_users | listMembers, inviteMember | |
| parties.php | GET/POST | view_party / manage_parties | listParties, createParty | |
| party-create.php | POST | manage_parties | — | **Duplicate** |
| party-item.php | GET/PATCH/DELETE/POST | view/manage | getParty, updateParty | categories upsert via POST |
| ledgers.php | GET | view_ledgers | listLedgers | No manage_ledgers API |
| vouchers.php | GET | view_day_book | listVouchers | |
| voucher-item.php | GET | **membership only** | getVoucher | Softer than matrix |
| voucher-preview.php | POST | **membership only** | previewVoucher | |
| voucher-post.php | POST | create_* / post_voucher | postVoucher | |
| voucher-reverse.php | POST | reverse + PIN | reverseVoucher | |
| bills.php | GET | view_receivables (default) | listBills | Empty side → receivables perm |
| bill-allocate.php | POST | post_voucher | allocateOnAccount | |
| reports.php | GET | per-report | report | Hard-coded keys |
| dimensions.php | GET/POST/DELETE | view_dashboard / manage_dimensions | list/createDimension | |
| period-locks.php | GET/POST | membership / lock / reopen+PIN | list/create/reopen | |
| approvals.php | GET/POST | approve_voucher | list/approve/reject | |
| exports.php | GET/POST | export_reports + PIN | exportReport | No re-check view_* |
| audit.php | GET | view_audit | listAudit | |
| search.php | GET | **membership only** | search | Broad intra-tenant |
| bootstrap.php | — | N/A | — | Loader only |

## Client parity

Every `companyApi.*` method has ≥1 FE caller. Duplicate PHP entrypoints without FE wrappers: workspace-item, workspace-create, party-create, bootstrap.

## Error contract (observed patterns)

| Code | Typical use |
|------|-------------|
| 401 | No auth |
| 403 | Missing permission / PIN |
| 404 | Not found or cross-company (same-company assert) |
| 409 | IDEMPOTENCY_CONFLICT, PREVIEW_STALE, business conflicts |
| 422 | Validation (unbalanced, missing fields) |

Canonical error matrix completeness: **PARTIAL** (not all codes enumerated in one OpenAPI doc).

## Design verdict

**PARTIAL** — solid financial write path; membership-only reads and export-without-view-perm weaken RBAC story; duplicate endpoints add surface area.
