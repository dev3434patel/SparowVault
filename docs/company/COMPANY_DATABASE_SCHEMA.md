# Company Database Schema

**Status:** Architecture (pre-implementation)  
**Engine:** MySQL InnoDB, `utf8mb4_unicode_ci`  
**Money:** `BIGINT` paise only  
**Scope key:** every company-owned row has `company_id`

---

## 1. Design rules

1. Normalized relational tables for all financial truth — **not** `cloud_collection_rows`.
2. `company_id` on every company-owned table (memberships include it; join tables include it for isolation).
3. Uniqueness is always scoped: `UNIQUE(company_id, …)`.
4. Soft delete via `deleted_at` where needed; posted vouchers are reversed, not hard-deleted.
5. IDs: `VARCHAR(191)` (UUID/ulid) to match SparowVault conventions, or `BINARY(16)` — pick one project-wide for company module.
6. Timestamps: `created_at`, `updated_at` UTC; store `voucher_date` as `DATE`.
7. All financial writes use DB transactions + idempotency receipts.

Same physical MySQL database as personal SparowVault is **allowed**. Shared tables limited to users/auth/billing/platform audit. See `PERSONAL_COMPANY_DOMAIN_BOUNDARY.md`.

---

## 2. Core table list

### Tenancy & access

| Table | Purpose |
|-------|---------|
| `company_workspaces` | Organisation / books container |
| `company_groups` | Optional group of companies (future consolidate) |
| `company_group_members` | Group ↔ company |
| `company_memberships` | User ↔ company |
| `company_roles` | Role definitions per company or system presets |
| `company_role_permissions` | Role → permission keys |
| `company_membership_roles` | Membership → roles |

### Masters — parties

| Table | Purpose |
|-------|---------|
| `company_parties` | Party master |
| `company_party_roles` | M:N party ↔ role enum/code |
| `company_party_categories` | User-defined categories |
| `company_party_category_memberships` | M:N |
| `company_party_tags` | Tag dictionary |
| `company_party_tag_memberships` | M:N |
| `company_party_relationship_accounts` | Party ↔ control ledger relationship |

### Dimensions

| Table | Purpose |
|-------|---------|
| `company_business_units` | Farming, Property, … |
| `company_branches` | Optional |
| `company_areas` | Hierarchical (`parent_id`) |
| `company_projects` | Projects / plots |
| `company_cost_centres` | Cost/profit centres |

### Chart of accounts

| Table | Purpose |
|-------|---------|
| `company_account_groups` | Groups with nature |
| `company_ledgers` | Postable ledgers |
| `company_voucher_types` | Optional config overrides |

### Vouchers & bills

| Table | Purpose |
|-------|---------|
| `company_vouchers` | Header |
| `company_voucher_lines` | Lines |
| `company_voucher_cost_allocations` | Optional multi cost-centre split |
| `company_bill_refs` | Bill / reference outstanding |
| `company_bill_allocations` | Settlement links |

### Controls & ops

| Table | Purpose |
|-------|---------|
| `company_documents` | Attachment metadata (company-scoped) |
| `company_recurring_rules` | Recurring templates |
| `company_period_locks` | Lock windows |
| `company_audit_logs` | Company financial/admin audit |
| `company_financial_write_receipts` | Idempotency |
| `company_approvals` | Optional approval instances |
| `company_cross_domain_links` | Explicit personal↔company bridge refs |

---

## 3. Key column sketches

### `company_workspaces`

| Column | Type | Notes |
|--------|------|-------|
| `id` | PK | |
| `owner_user_id` | FK → `users.id` | Creator/owner |
| `legal_name` | VARCHAR | |
| `display_name` | VARCHAR | |
| `business_type` | VARCHAR | free text |
| `registration_type` | ENUM/VARCHAR | Proprietorship, LLP, … |
| `gst_enabled` | TINYINT | default 0 |
| `gstin`, `pan`, `cin` | VARCHAR NULL | |
| `address`, `state`, `country` | VARCHAR | |
| `currency` | CHAR(3) | default INR |
| `financial_year_start_month` | TINYINT | 1–12 |
| `books_start_date` | DATE | |
| `timezone` | VARCHAR | |
| `logo_document_id` | NULL FK | |
| `phone`, `email` | VARCHAR NULL | |
| `status` | ENUM | ACTIVE, SUSPENDED, CLOSED |
| `created_at`, `updated_at` | DATETIME | |

### `company_memberships`

| Column | Notes |
|--------|-------|
| `id`, `company_id`, `user_id` | UNIQUE(company_id, user_id) |
| `status` | INVITED, ACTIVE, SUSPENDED |
| `joined_at` | |

### `company_parties`

| Column | Notes |
|--------|-------|
| `id`, `company_id` | |
| `display_name`, `legal_name` | |
| `party_type` | primary label |
| contact / address fields | mobile, email, village, city, district, state, `area_id` |
| tax fields | gstin, pan, tax_treatment |
| `opening_balance_paise`, `opening_balance_side` | prefer opening voucher |
| `default_credit_days`, `credit_limit_paise` | |
| `active`, `notes` | |
| UNIQUE optional: `(company_id, mobile)` when mobile present | soft uniqueness |

### `company_account_groups`

| Column | Notes |
|--------|-------|
| `id`, `company_id`, `parent_id` | |
| `name`, `code` | UNIQUE(company_id, code) |
| `nature` | ASSET/LIABILITY/EQUITY/INCOME/EXPENSE |
| `is_system` | seed groups protected |

### `company_ledgers`

| Column | Notes |
|--------|-------|
| `id`, `company_id`, `group_id` | |
| `name`, `code` | UNIQUE(company_id, code) |
| `is_cash_bank` | for R&P / contra |
| `is_party_control` | AR/AP/loan control |
| `active` | |

### `company_vouchers`

| Column | Notes |
|--------|-------|
| `id`, `company_id` | |
| `voucher_number` | UNIQUE(company_id, voucher_number) |
| `voucher_type` | enum |
| `voucher_date`, `effective_date` | |
| `party_id` | nullable header party |
| dimension FKs | business_unit, branch, area, project, cost_centre |
| `narration`, `reference_number`, `external_reference` | |
| `status` | DRAFT…POSTED… |
| `created_by`, `approved_by` | user ids |
| `reversed_voucher_id`, `correction_of_voucher_id` | |
| `mutation_id` | UNIQUE(company_id, mutation_id) |
| `posted_at` | |

### `company_voucher_lines`

| Column | Notes |
|--------|-------|
| `id`, `company_id`, `voucher_id` | company_id denormalized for isolation indexes |
| `line_no` | |
| `ledger_id` | |
| `side` | DEBIT / CREDIT |
| `amount_paise` | BIGINT > 0 |
| `party_relationship_id` | optional |
| `cost_centre_id`, `project_id`, `area_id` | optional line dims |
| `narration` | |

**Check app-side:** sum debit = sum credit; prefer DB trigger or post-validate in same transaction.

### `company_bill_refs`

| Column | Notes |
|--------|-------|
| `id`, `company_id`, `party_id` | |
| `ref_type`, `ref_number` | |
| `bill_date`, `due_date` | |
| `original_amount_paise`, `outstanding_paise` | |
| `side` | receivable/payable semantics |
| `status` | OPEN, PARTIAL, SETTLED, CANCELLED |
| `project_id`, `business_unit_id` | optional |

### `company_bill_allocations`

| Column | Notes |
|--------|-------|
| `id`, `company_id` | |
| `bill_ref_id`, `voucher_id`, `voucher_line_id` | |
| `amount_paise` | |
| `allocation_type` | NEW_REFERENCE, AGAINST_REFERENCE, ADVANCE, ON_ACCOUNT |

### `company_financial_write_receipts`

Mirror personal pattern (`financial_write_receipts`):

| Column | Notes |
|--------|-------|
| `company_id`, `mutation_id` | UNIQUE pair |
| `request_hash` | |
| `response_json` | |
| `created_at` | |

Replay identical hash → return stored response. Different hash → `IDEMPOTENCY_CONFLICT`.

### `company_audit_logs`

| Column | Notes |
|--------|-------|
| `id`, `company_id` | |
| `actor_user_id`, `action`, `entity_type`, `entity_id` | |
| `before_json`, `after_json` | |
| `reason`, `ip`, `user_agent`, `session_id` | |
| `created_at` | |

### `company_cross_domain_links`

| Column | Notes |
|--------|-------|
| `id` | |
| `company_id` | |
| `company_voucher_id` | |
| `personal_user_id` | |
| `personal_collection` | e.g. transactions |
| `personal_entity_id` | |
| `link_type` | REIMBURSEMENT, DRAWING, OTHER |
| `created_at` | |

No FK into JSON collection payload; soft reference only.

---

## 4. Recommended indexes

```text
company_vouchers (company_id, voucher_date)
company_vouchers (company_id, party_id, voucher_date)
company_vouchers (company_id, status)
company_vouchers (company_id, voucher_number)
company_vouchers (company_id, reference_number)
company_vouchers (company_id, mutation_id)

company_voucher_lines (company_id, ledger_id, voucher_id)
company_voucher_lines (voucher_id, line_no)

company_voucher_lines + join vouchers for:
  (company_id, project_id, voucher_date)  -- via header or line
  (company_id, area_id, voucher_date)

company_bill_refs (company_id, party_id, status)
company_bill_refs (company_id, due_date, status)

company_parties (company_id, display_name)
company_parties (company_id, mobile)

company_memberships (user_id, status)
company_audit_logs (company_id, created_at)
```

---

## 5. Posting transaction sketch

```text
BEGIN
  claim mutation receipt (or return prior)
  assert membership + permission
  assert period not locked
  insert voucher header (status POSTED or PENDING)
  insert lines
  insert bill refs / allocations
  validate SUM(debit) = SUM(credit)
  validate allocation totals
  write audit row
  commit receipt response
COMMIT
-- any failure → ROLLBACK
```

---

## 6. What must not exist

- A single shared `transactions` table with `domain = personal|company`
- Company balances stored only as Dexie offline collections without server SQL SoT
- Float/DECIMAL rupees as canonical monetary storage on financial tables
- Global `UNIQUE(voucher_number)` without `company_id`

---

## 7. Migration strategy

1. New folder: `sql/migrations/company/` (or dated files `YYYYMMDD_company_*.sql`).
2. Record in `schema_version` / existing migration tracker.
3. Seed system account groups + default roles/permissions per new workspace (application service on create).
4. Do not alter personal finance tables in company migrations.

---

## 8. Offline / Dexie

v1 recommendation: **online-first** for company posting (books integrity).  
Optional later: read-only Dexie cache of masters + drafts — never conflicting multi-device POST without server authority.
