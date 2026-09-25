# OPEN_GAPS

## P0

None.

## P1

1. Masters `/company/app/masters/categories` falls through to Business Units UI.
2. `/company/app/vouchers/new` renders voucher list — no create experience.
3. Authenticated browser A–N suite aborted (selector expects `Create`, UI has `Create party`).
4. Membership-only API surfaces (`search`, `voucher-item`, `preview`) weaker than permission matrix.
5. Export uses `export_reports` without re-checking view_* report perms.

## P2

1. Company store not cleared on logout (cross-user localStorage risk).
2. Product browser NEW_MENU locator mismatch (false FAIL; button exists).
3. Report registry FE-only; PHP hard-coded.
4. Unused permission keys / unused tables (schema ahead of product).
5. Formal multi-company 100k matrix not re-executed this stamp (scale checksum OK via backup).
6. Accessibility & full viewport matrix incomplete.
7. Approvals UX thin on financial impact.
8. Export page success UX shows raw JSON.

## FUTURE

Documents, recurring, cross-domain bridge, org subscriptions, invite-token redeem, GST, payroll, inventory, SaaS billing.

## Accepted limitations this run

- MCP browser started blank until storage clear (session glitch) — recovered.
- `company:certify:final` / `company:certify:product` orchestrators not fully re-issued; constituent evidence recorded instead.
