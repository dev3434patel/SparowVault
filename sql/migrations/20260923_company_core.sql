-- Company module core schema (InnoDB, utf8mb4_unicode_ci).
-- Money: BIGINT paise. IDs: VARCHAR(191). Isolation: company_id on every owned table.
-- Does NOT alter personal finance tables.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Tenancy & access
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS company_workspaces (
  id VARCHAR(191) NOT NULL,
  owner_user_id VARCHAR(191) NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(128) NULL,
  registration_type VARCHAR(64) NULL,
  gst_enabled TINYINT(1) NOT NULL DEFAULT 0,
  gstin VARCHAR(32) NULL,
  pan VARCHAR(16) NULL,
  cin VARCHAR(32) NULL,
  address VARCHAR(512) NULL,
  state VARCHAR(128) NULL,
  country VARCHAR(128) NOT NULL DEFAULT 'IN',
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  financial_year_start_month TINYINT UNSIGNED NOT NULL DEFAULT 4,
  books_start_date DATE NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  logo_document_id VARCHAR(191) NULL,
  phone VARCHAR(32) NULL,
  email VARCHAR(191) NULL,
  status ENUM('ACTIVE','SUSPENDED','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_cw_owner (owner_user_id),
  KEY idx_cw_status (status),
  CONSTRAINT fk_cw_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_groups (
  id VARCHAR(191) NOT NULL,
  owner_user_id VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cg_owner (owner_user_id),
  CONSTRAINT fk_cg_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_group_members (
  id VARCHAR(191) NOT NULL,
  group_id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cgm_group_company (group_id, company_id),
  KEY idx_cgm_company (company_id),
  CONSTRAINT fk_cgm_group FOREIGN KEY (group_id) REFERENCES company_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_cgm_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_roles (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cr_company_code (company_id, code),
  CONSTRAINT fk_cr_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_role_permissions (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  role_id VARCHAR(191) NOT NULL,
  permission_key VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crp_role_perm (company_id, role_id, permission_key),
  KEY idx_crp_role (role_id),
  CONSTRAINT fk_crp_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_crp_role FOREIGN KEY (role_id) REFERENCES company_roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_memberships (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  status ENUM('INVITED','ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  joined_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cm_company_user (company_id, user_id),
  KEY idx_cm_user_status (user_id, status),
  CONSTRAINT fk_cm_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_membership_roles (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  membership_id VARCHAR(191) NOT NULL,
  role_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cmr_membership_role (company_id, membership_id, role_id),
  KEY idx_cmr_role (role_id),
  CONSTRAINT fk_cmr_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cmr_membership FOREIGN KEY (membership_id) REFERENCES company_memberships(id) ON DELETE CASCADE,
  CONSTRAINT fk_cmr_role FOREIGN KEY (role_id) REFERENCES company_roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Dimensions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS company_business_units (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(64) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cbu_company_name (company_id, name),
  CONSTRAINT fk_cbu_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_branches (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(64) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cbr_company_name (company_id, name),
  CONSTRAINT fk_cbr_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_areas (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  parent_id VARCHAR(191) NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(64) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ca_company_name (company_id, name),
  KEY idx_ca_parent (company_id, parent_id),
  CONSTRAINT fk_ca_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_parent FOREIGN KEY (parent_id) REFERENCES company_areas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_projects (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(64) NULL,
  business_unit_id VARCHAR(191) NULL,
  area_id VARCHAR(191) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cp_company_name (company_id, name),
  KEY idx_cp_bu (company_id, business_unit_id),
  CONSTRAINT fk_cp_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_bu FOREIGN KEY (business_unit_id) REFERENCES company_business_units(id) ON DELETE SET NULL,
  CONSTRAINT fk_cp_area FOREIGN KEY (area_id) REFERENCES company_areas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_cost_centres (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(64) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ccc_company_name (company_id, name),
  CONSTRAINT fk_ccc_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Parties
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS company_parties (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255) NULL,
  party_type VARCHAR(64) NOT NULL DEFAULT 'PERSON',
  mobile VARCHAR(32) NULL,
  email VARCHAR(191) NULL,
  village VARCHAR(128) NULL,
  city VARCHAR(128) NULL,
  district VARCHAR(128) NULL,
  state VARCHAR(128) NULL,
  area_id VARCHAR(191) NULL,
  gstin VARCHAR(32) NULL,
  pan VARCHAR(16) NULL,
  tax_treatment VARCHAR(64) NULL,
  opening_balance_paise BIGINT NOT NULL DEFAULT 0,
  opening_balance_side ENUM('DEBIT','CREDIT') NULL,
  default_credit_days INT NULL,
  credit_limit_paise BIGINT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_cpart_name (company_id, display_name),
  KEY idx_cpart_mobile (company_id, mobile),
  CONSTRAINT fk_cpart_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpart_area FOREIGN KEY (area_id) REFERENCES company_areas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_party_roles (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  party_id VARCHAR(191) NOT NULL,
  role_code VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cpr_party_role (company_id, party_id, role_code),
  KEY idx_cpr_party (party_id),
  CONSTRAINT fk_cpr_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpr_party FOREIGN KEY (party_id) REFERENCES company_parties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_party_categories (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cpc_company_name (company_id, name),
  CONSTRAINT fk_cpc_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_party_category_memberships (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  party_id VARCHAR(191) NOT NULL,
  category_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cpcm_party_cat (company_id, party_id, category_id),
  CONSTRAINT fk_cpcm_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpcm_party FOREIGN KEY (party_id) REFERENCES company_parties(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpcm_cat FOREIGN KEY (category_id) REFERENCES company_party_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_party_tags (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cpt_company_name (company_id, name),
  CONSTRAINT fk_cpt_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_party_tag_memberships (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  party_id VARCHAR(191) NOT NULL,
  tag_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cptm_party_tag (company_id, party_id, tag_id),
  CONSTRAINT fk_cptm_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cptm_party FOREIGN KEY (party_id) REFERENCES company_parties(id) ON DELETE CASCADE,
  CONSTRAINT fk_cptm_tag FOREIGN KEY (tag_id) REFERENCES company_party_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Chart of accounts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS company_account_groups (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  parent_id VARCHAR(191) NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(64) NOT NULL,
  nature ENUM('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE') NOT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cag_company_code (company_id, code),
  KEY idx_cag_parent (company_id, parent_id),
  CONSTRAINT fk_cag_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cag_parent FOREIGN KEY (parent_id) REFERENCES company_account_groups(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_ledgers (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  group_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  code VARCHAR(64) NOT NULL,
  is_cash_bank TINYINT(1) NOT NULL DEFAULT 0,
  is_party_control TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cl_company_code (company_id, code),
  KEY idx_cl_group (company_id, group_id),
  CONSTRAINT fk_cl_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cl_group FOREIGN KEY (group_id) REFERENCES company_account_groups(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_party_relationship_accounts (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  party_id VARCHAR(191) NOT NULL,
  relationship_type VARCHAR(64) NOT NULL,
  ledger_id VARCHAR(191) NOT NULL,
  control_ledger_id VARCHAR(191) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cpra_party_rel (company_id, party_id, relationship_type),
  KEY idx_cpra_ledger (company_id, ledger_id),
  CONSTRAINT fk_cpra_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpra_party FOREIGN KEY (party_id) REFERENCES company_parties(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpra_ledger FOREIGN KEY (ledger_id) REFERENCES company_ledgers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cpra_control FOREIGN KEY (control_ledger_id) REFERENCES company_ledgers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Vouchers & bills
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS company_vouchers (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  voucher_number VARCHAR(64) NOT NULL,
  voucher_type VARCHAR(32) NOT NULL,
  voucher_date DATE NOT NULL,
  effective_date DATE NULL,
  party_id VARCHAR(191) NULL,
  business_unit_id VARCHAR(191) NULL,
  branch_id VARCHAR(191) NULL,
  area_id VARCHAR(191) NULL,
  project_id VARCHAR(191) NULL,
  cost_centre_id VARCHAR(191) NULL,
  purpose VARCHAR(64) NULL,
  narration VARCHAR(1024) NULL,
  reference_number VARCHAR(128) NULL,
  external_reference VARCHAR(128) NULL,
  status ENUM('DRAFT','PENDING_APPROVAL','REJECTED','POSTED','REVERSED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  created_by VARCHAR(191) NOT NULL,
  approved_by VARCHAR(191) NULL,
  reversed_voucher_id VARCHAR(191) NULL,
  correction_of_voucher_id VARCHAR(191) NULL,
  mutation_id VARCHAR(128) NOT NULL,
  posted_at DATETIME NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cv_company_number (company_id, voucher_number),
  UNIQUE KEY uq_cv_company_mutation (company_id, mutation_id),
  KEY idx_cv_date (company_id, voucher_date),
  KEY idx_cv_party_date (company_id, party_id, voucher_date),
  KEY idx_cv_status (company_id, status),
  KEY idx_cv_ref (company_id, reference_number),
  KEY idx_cv_reversed (reversed_voucher_id),
  KEY idx_cv_correction (correction_of_voucher_id),
  CONSTRAINT fk_cv_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cv_party FOREIGN KEY (party_id) REFERENCES company_parties(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cv_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cv_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cv_bu FOREIGN KEY (business_unit_id) REFERENCES company_business_units(id) ON DELETE SET NULL,
  CONSTRAINT fk_cv_branch FOREIGN KEY (branch_id) REFERENCES company_branches(id) ON DELETE SET NULL,
  CONSTRAINT fk_cv_area FOREIGN KEY (area_id) REFERENCES company_areas(id) ON DELETE SET NULL,
  CONSTRAINT fk_cv_project FOREIGN KEY (project_id) REFERENCES company_projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_cv_cc FOREIGN KEY (cost_centre_id) REFERENCES company_cost_centres(id) ON DELETE SET NULL,
  CONSTRAINT fk_cv_reversed FOREIGN KEY (reversed_voucher_id) REFERENCES company_vouchers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_cv_correction FOREIGN KEY (correction_of_voucher_id) REFERENCES company_vouchers(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_voucher_lines (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  voucher_id VARCHAR(191) NOT NULL,
  line_no INT UNSIGNED NOT NULL,
  ledger_id VARCHAR(191) NOT NULL,
  side ENUM('DEBIT','CREDIT') NOT NULL,
  amount_paise BIGINT NOT NULL,
  party_relationship_id VARCHAR(191) NULL,
  cost_centre_id VARCHAR(191) NULL,
  project_id VARCHAR(191) NULL,
  area_id VARCHAR(191) NULL,
  narration VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cvl_voucher_line (voucher_id, line_no),
  KEY idx_cvl_ledger (company_id, ledger_id, voucher_id),
  KEY idx_cvl_project (company_id, project_id),
  KEY idx_cvl_area (company_id, area_id),
  CONSTRAINT fk_cvl_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cvl_voucher FOREIGN KEY (voucher_id) REFERENCES company_vouchers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cvl_ledger FOREIGN KEY (ledger_id) REFERENCES company_ledgers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cvl_rel FOREIGN KEY (party_relationship_id) REFERENCES company_party_relationship_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_cvl_cc FOREIGN KEY (cost_centre_id) REFERENCES company_cost_centres(id) ON DELETE SET NULL,
  CONSTRAINT fk_cvl_project FOREIGN KEY (project_id) REFERENCES company_projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_cvl_area FOREIGN KEY (area_id) REFERENCES company_areas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_voucher_cost_allocations (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  voucher_id VARCHAR(191) NOT NULL,
  voucher_line_id VARCHAR(191) NOT NULL,
  cost_centre_id VARCHAR(191) NOT NULL,
  amount_paise BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cvca_line (company_id, voucher_line_id),
  CONSTRAINT fk_cvca_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cvca_voucher FOREIGN KEY (voucher_id) REFERENCES company_vouchers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cvca_line FOREIGN KEY (voucher_line_id) REFERENCES company_voucher_lines(id) ON DELETE CASCADE,
  CONSTRAINT fk_cvca_cc FOREIGN KEY (cost_centre_id) REFERENCES company_cost_centres(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_bill_refs (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  party_id VARCHAR(191) NOT NULL,
  ref_type VARCHAR(64) NOT NULL DEFAULT 'BILL',
  ref_number VARCHAR(128) NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE NULL,
  original_amount_paise BIGINT NOT NULL,
  outstanding_paise BIGINT NOT NULL,
  side ENUM('RECEIVABLE','PAYABLE') NOT NULL,
  status ENUM('OPEN','PARTIAL','SETTLED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  project_id VARCHAR(191) NULL,
  business_unit_id VARCHAR(191) NULL,
  source_voucher_id VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_company_bill_refs_ref (company_id, party_id, ref_number),
  KEY idx_company_bill_refs_party (company_id, party_id, status),
  KEY idx_company_bill_refs_due (company_id, due_date, status),
  CONSTRAINT fk_company_bill_refs_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_company_bill_refs_party FOREIGN KEY (party_id) REFERENCES company_parties(id) ON DELETE RESTRICT,
  CONSTRAINT fk_company_bill_refs_project FOREIGN KEY (project_id) REFERENCES company_projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_company_bill_refs_bu FOREIGN KEY (business_unit_id) REFERENCES company_business_units(id) ON DELETE SET NULL,
  CONSTRAINT fk_company_bill_refs_voucher FOREIGN KEY (source_voucher_id) REFERENCES company_vouchers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_bill_allocations (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  bill_ref_id VARCHAR(191) NULL,
  voucher_id VARCHAR(191) NOT NULL,
  voucher_line_id VARCHAR(191) NULL,
  amount_paise BIGINT NOT NULL,
  allocation_type ENUM('NEW_REFERENCE','AGAINST_REFERENCE','ADVANCE','ON_ACCOUNT') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_company_bill_alloc_bill (company_id, bill_ref_id),
  KEY idx_company_bill_alloc_voucher (company_id, voucher_id),
  CONSTRAINT fk_company_bill_alloc_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_company_bill_alloc_bill FOREIGN KEY (bill_ref_id) REFERENCES company_bill_refs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_company_bill_alloc_voucher FOREIGN KEY (voucher_id) REFERENCES company_vouchers(id) ON DELETE CASCADE,
  CONSTRAINT fk_company_bill_alloc_line FOREIGN KEY (voucher_line_id) REFERENCES company_voucher_lines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Controls & ops
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS company_documents (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id VARCHAR(191) NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NULL,
  storage_key VARCHAR(512) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_cdoc_entity (company_id, entity_type, entity_id),
  CONSTRAINT fk_cdoc_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cdoc_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_recurring_rules (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  voucher_type VARCHAR(32) NOT NULL,
  cadence VARCHAR(32) NOT NULL,
  next_run_date DATE NULL,
  template_json LONGTEXT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_crr_next (company_id, next_run_date, active),
  CONSTRAINT fk_crr_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_crr_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_period_locks (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  lock_before_date DATE NOT NULL,
  reason VARCHAR(512) NULL,
  locked_by VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at DATETIME NULL,
  released_by VARCHAR(191) NULL,
  PRIMARY KEY (id),
  KEY idx_cpl_company_date (company_id, lock_before_date),
  CONSTRAINT fk_cpl_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpl_locked_by FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cpl_released_by FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_audit_logs (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  actor_user_id VARCHAR(191) NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  before_json LONGTEXT NULL,
  after_json LONGTEXT NULL,
  reason VARCHAR(512) NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  session_id VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cal_company_created (company_id, created_at),
  KEY idx_cal_entity (company_id, entity_type, entity_id),
  CONSTRAINT fk_cal_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cal_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_financial_write_receipts (
  company_id VARCHAR(191) NOT NULL,
  mutation_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  response_json LONGTEXT NOT NULL,
  http_status SMALLINT UNSIGNED NOT NULL DEFAULT 200,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, mutation_id),
  CONSTRAINT fk_cfwr_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_approvals (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  voucher_id VARCHAR(191) NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  requested_by VARCHAR(191) NOT NULL,
  decided_by VARCHAR(191) NULL,
  comment VARCHAR(1024) NULL,
  decided_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_capp_voucher (company_id, voucher_id, status),
  CONSTRAINT fk_capp_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_capp_voucher FOREIGN KEY (voucher_id) REFERENCES company_vouchers(id) ON DELETE CASCADE,
  CONSTRAINT fk_capp_requested FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_capp_decided FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_cross_domain_links (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  company_voucher_id VARCHAR(191) NULL,
  personal_user_id VARCHAR(191) NOT NULL,
  personal_collection VARCHAR(64) NOT NULL,
  personal_entity_id VARCHAR(191) NOT NULL,
  link_type ENUM('REIMBURSEMENT','DRAWING','OTHER') NOT NULL DEFAULT 'OTHER',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ccdl_company (company_id),
  KEY idx_ccdl_personal (personal_user_id, personal_collection, personal_entity_id),
  CONSTRAINT fk_ccdl_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccdl_voucher FOREIGN KEY (company_voucher_id) REFERENCES company_vouchers(id) ON DELETE SET NULL,
  CONSTRAINT fk_ccdl_user FOREIGN KEY (personal_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Future SaaS foundation (org / company subscription adapter)
CREATE TABLE IF NOT EXISTS company_org_subscriptions (
  id VARCHAR(191) NOT NULL,
  org_id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NULL,
  plan_code VARCHAR(64) NOT NULL,
  max_companies INT UNSIGNED NOT NULL DEFAULT 1,
  max_users INT UNSIGNED NOT NULL DEFAULT 5,
  max_vouchers_per_month INT UNSIGNED NOT NULL DEFAULT 500,
  features_json LONGTEXT NULL,
  status ENUM('ACTIVE','PAST_DUE','CANCELLED','TRIAL') NOT NULL DEFAULT 'TRIAL',
  started_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cos_org (org_id, status),
  KEY idx_cos_company (company_id),
  CONSTRAINT fk_cos_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
