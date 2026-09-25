<?php
declare(strict_types=1);
/**
 * Make company_bill_allocations.bill_ref_id nullable for ON_ACCOUNT.
 * Usage: php scripts/company/apply-bill-on-account.php
 */
require __DIR__ . "/../../php/config/env.php";
require __DIR__ . "/../../php/config/db.php";

$db = db_conn();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$col = $db->query("SHOW COLUMNS FROM company_bill_allocations LIKE 'bill_ref_id'")->fetch(PDO::FETCH_ASSOC);
echo "bill_ref_id Null=" . ($col["Null"] ?? "?") . "\n";

$fk = $db->query(
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'company_bill_allocations'
       AND COLUMN_NAME = 'bill_ref_id'
       AND REFERENCED_TABLE_NAME IS NOT NULL
     LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);

$needsNull = ($col["Null"] ?? "") !== "YES";
$needsFk = !$fk;

if (!$needsNull && !$needsFk) {
    echo "already nullable with FK — nothing to do\n";
    exit(0);
}

if ($fk && $needsNull) {
    $name = str_replace("`", "``", (string)$fk["CONSTRAINT_NAME"]);
    $db->exec("ALTER TABLE company_bill_allocations DROP FOREIGN KEY `{$name}`");
    echo "dropped FK {$fk["CONSTRAINT_NAME"]}\n";
    $needsFk = true;
}

if ($needsNull) {
    $db->exec("ALTER TABLE company_bill_allocations MODIFY COLUMN bill_ref_id VARCHAR(191) NULL");
    echo "modified bill_ref_id to NULL\n";
}

if ($needsFk) {
    $db->exec(
        "ALTER TABLE company_bill_allocations
         ADD CONSTRAINT fk_company_bill_alloc_bill
         FOREIGN KEY (bill_ref_id) REFERENCES company_bill_refs(id) ON DELETE RESTRICT"
    );
    echo "re-added FK fk_company_bill_alloc_bill\n";
}

$col = $db->query("SHOW COLUMNS FROM company_bill_allocations LIKE 'bill_ref_id'")->fetch(PDO::FETCH_ASSOC);
echo "after: Null=" . ($col["Null"] ?? "?") . "\n";
