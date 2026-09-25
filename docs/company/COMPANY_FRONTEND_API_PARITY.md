# Company Frontend ↔ API Parity

| Endpoint | API Client | Page | Status |
|----------|------------|------|--------|
| workspaces.php | listMemberships | SelectCompany | LIVE |
| workspace-create.php | createWorkspace | CreateCompany | LIVE |
| workspace.php | getWorkspace | hydrate | LIVE |
| parties.php | listParties / createParty | PartiesPage | LIVE |
| party-item.php | getParty | PartyDetail | LIVE |
| ledgers.php | listLedgers | LedgersPage | LIVE |
| vouchers.php | listVouchers | VouchersPage | LIVE |
| voucher-item.php | getVoucher | VoucherDetail | LIVE |
| voucher-post.php | postVoucher | Quick*/Journal | LIVE |
| voucher-preview.php | previewVoucher | Quick* | LIVE |
| voucher-reverse.php | reverseVoucher | VoucherDetail | LIVE |
| bills.php | listBills | AR/AP | LIVE |
| reports.php | report | ReportView | LIVE |
| memberships.php | listMembers / inviteMember | UsersPage | LIVE |
| dimensions.php | list/create dimensions | MastersPage | LIVE |
| period-locks.php | list/create/reopen | Settings (partial) | PARTIAL |
| approvals.php | list/approve/reject | Approvals (if routed) | PARTIAL |
| exports.php | exportReport | ExportPage | PARTIAL |
| audit.php | listAudit | AuditPage | LIVE |
| search.php | search | SearchPage | LIVE |

## Error codes (server)

`COMPANY_MEMBERSHIP_REQUIRED`, `COMPANY_PERMISSION_DENIED`, `UNBALANCED_VOUCHER`, `PERIOD_LOCKED`, `IDEMPOTENCY_CONFLICT`, `PREVIEW_STALE`, `PARTY_REQUIRED`, `INVALID_LEDGER`, `INVALID_BILL_ALLOCATION`, `BILL_OVERALLOCATED`, `VOUCHER_ALREADY_REVERSED`, `LEDGER_NOT_FOUND`, `BILL_NOT_FOUND`, `PARTY_NOT_FOUND`
