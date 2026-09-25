<?php
declare(strict_types=1);
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";

$db = db_conn();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Drop orphans if any
foreach (["company_bill_allocations", "company_bill_refs"] as $t) {
    try { $db->exec("DROP TABLE IF EXISTS `$t`"); echo "dropped $t\n"; } catch (Throwable $e) { echo $e->getMessage()."\n"; }
}

$sql = <<<'SQL'
CREATE TABLE company_bill_refs (
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

CREATE TABLE company_bill_allocations (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  bill_ref_id VARCHAR(191) NOT NULL,
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
SQL;

foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
    if ($stmt === '') continue;
    $db->exec($stmt);
    echo "OK: " . substr($stmt, 0, 60) . "…\n";
}

$r = $db->query("SHOW TABLES LIKE 'company_bill%'");
echo "bill tables: " . implode(", ", $r->fetchAll(PDO::FETCH_COLUMN)) . "\n";
