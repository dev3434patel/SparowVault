-- PHASE_04 future-schema documentation (no DDL behavior change).
-- These tables exist (or are planned) for product capabilities not yet wired in the company SPA.
-- Tracker IDs are placeholders for backlog; do not DROP without explicit product decision.

/*
FUTURE TABLE NOTES (SparowVault Company)

| Table                         | Tracker              | Intent |
|------------------------------|----------------------|--------|
| company_documents            | COMP-FUTURE-DOCS     | Attachments / file refs on vouchers & parties |
| company_recurring_rules      | COMP-FUTURE-RECUR    | Recurring voucher schedules |
| company_cross_domain_links   | COMP-FUTURE-XDOM     | Links between company vouchers and personal finance |
| company_org_subscriptions    | COMP-FUTURE-BILLING  | Org-level billing / plan entitlements |
| company_party_tags           | COMP-FUTURE-TAGS     | Free-form party tags (orthogonal to categories) |
| company_party_tag_memberships| COMP-FUTURE-TAGS     | M2M party ↔ tag |
| company_voucher_cost_allocations | COMP-FUTURE-COST | Split voucher lines across cost centres |
| company_groups / group_*     | COMP-FUTURE-GROUPS   | Ledger group hierarchy beyond seed CoA |

No CREATE/ALTER in this migration — documentation only for auditors and future phases.
*/

SELECT 1 AS company_future_tables_note_applied;
