# 03 — Database

**Live probe:** `raw/EVIDENCE_DB_PROBE.txt` — `CONNECTED`, `company_tables=34`, `DB_NAME=sparowvault`

## Migrations

| File | Role |
|------|------|
| `sql/migrations/20260923_company_core.sql` | CREATE all core tables |
| `sql/migrations/20260923_company_indexes.sql` | Performance indexes |
| `sql/migrations/20260923_company_bill_on_account.sql` | Nullable `bill_ref_id` for ON_ACCOUNT |
| `sql/migrations/20260923_company_reversal_fk.sql` | Reversal/correction FKs |

## Table inventory (34)

### Org / RBAC
`company_workspaces`, `company_groups`, `company_group_members`, `company_roles`, `company_role_permissions`, `company_memberships`, `company_membership_roles`, `company_org_subscriptions` (unused API)

### Dimensions
`company_business_units`, `company_branches`, `company_areas`, `company_projects`, `company_cost_centres`

### Parties
`company_parties`, `company_party_roles`, `company_party_categories`, `company_party_category_memberships`, `company_party_tags` (unused API), `company_party_tag_memberships`, `company_party_relationship_accounts`

### Books
`company_account_groups`, `company_ledgers`, `company_vouchers`, `company_voucher_lines`, `company_voucher_cost_allocations` (unused API), `company_bill_refs`, `company_bill_allocations`

### Ops
`company_documents` (FUTURE), `company_recurring_rules` (FUTURE), `company_period_locks`, `company_audit_logs`, `company_financial_write_receipts`, `company_approvals`, `company_cross_domain_links` (FUTURE)

## Money storage

All monetary columns use **BIGINT paise** (`amount_paise`, `outstanding_paise`, etc.). **PASS**

## Tenant strategy

Almost every owned table has `company_id` FK → `company_workspaces` **ON DELETE CASCADE**. Workspace wipe deletes vouchers + **audit**. **PARTIAL** for audit durability on tenant delete.

## Dangerous cascades

| Pattern | Verdict |
|---------|---------|
| Workspace CASCADE → financial + audit | Expected for tenant wipe; operational risk if mis-delete |
| Ledger group RESTRICT | Good |
| Bill allocations bill_ref RESTRICT | Good (ON_ACCOUNT nullable) |
| Party RESTRICT from bills/vouchers | Good |

## Normalization notes

- No redundant persisted party balances (derived from lines/bills) — good
- Bill outstanding is **persisted** and updated on alloc/reverse — must stay consistent with allocations
- Approval intent encoded in narration for deferred post — denormalized smell (**PARTIAL**)

## Indexes

Core + `company_indexes.sql` cover party, voucher date/status, bill side/status. Full EXPLAIN pack: **NOT VERIFIED** this run unless latency/perf scripts emit it.

## Migration safety

| Check | Status |
|-------|--------|
| Fresh install scripts exist | PASS (apply-migration.php) |
| Idempotent re-run | PARTIAL (CREATE TABLE IF NOT EXISTS pattern in core — verify in restore drill) |
| Rollback scripts | NOT IMPLEMENTED (no down migrations) |
| Seed safety | Seed on workspace create only |

## Database scorecard

| Dimension | Score /10 | Status |
|-----------|----------:|--------|
| Schema quality | 8 | Professional multi-table design |
| Integrity | 8 | Strong FKs; narration-encoded approval intent weak |
| Indexing | 7 | Present; EXPLAIN not re-proven |
| Migration safety | 6 | Forward-only |
| Tenant safety | 8 | company_id everywhere; CASCADE blast radius |
| Accounting safety | 8 | BIGINT paise; RESTRICT on history-critical FKs |

**Overall DB: PASS with PARTIAL migration/audit-cascade notes**
