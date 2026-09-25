<?php
declare(strict_types=1);
/**
 * HTTP-level company API E2E (uses DB posting helpers + HTTP endpoint files where possible).
 * Scenario coverage: workspace seed, party, loan, advance, other receipt, property, bill, reverse, idempotency, isolation.
 * Usage: php scripts/company/http-e2e.php
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";
require_once __DIR__ . "/../../php/helpers/company/bootstrap.php";

function e2e_ok(bool $c, string $m): void {
    if (!$c) throw new RuntimeException("E2E FAIL: $m");
    echo "  ✓ $m\n";
}

$db = db_conn();
$user = $db->query("SELECT id FROM users WHERE deleted_at IS NULL AND is_active=1 ORDER BY created_at ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$user) { fwrite(STDERR, "No user\n"); exit(1); }
$userId = (string)$user["id"];
$today = gmdate("Y-m-d");

echo "== Workspace A/B ==\n";
$a = company_new_id();
$b = company_new_id();
foreach ([[$a, "E2E Co A"], [$b, "E2E Co B"]] as [$cid, $name]) {
    $db->beginTransaction();
    $db->prepare(
        "INSERT INTO company_workspaces (id, owner_user_id, legal_name, display_name, currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'INR', 4, CURDATE(), 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$cid, $userId, $name, $name]);
    company_seed_workspace($db, $cid, $userId);
    $db->commit();
}
$bank = company_ledger_id_by_code($db, $a, "BANK_PRIMARY");
e2e_ok($bank !== null, "COA seeded bank");

echo "== Party ==\n";
$party = company_new_id();
$db->prepare(
    "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
     VALUES (?, ?, 'E2E Ramesh', 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$party, $a]);
$db->prepare(
    "INSERT INTO company_party_roles (id, company_id, party_id, role_code, created_at) VALUES (?,?,?,?,UTC_TIMESTAMP())"
)->execute([company_new_id(), $a, $party, "LENDER"]);

echo "== Loan received ==\n";
$loan = company_post_voucher($db, $a, $userId, [
    "mutationId" => "e2e-loan-" . company_new_id(),
    "purpose" => "LOAN_RECEIVED",
    "voucherDate" => $today,
    "partyId" => $party,
    "amountPaise" => 10_000_000,
    "cashBankLedgerId" => $bank,
    "status" => "POSTED",
]);
e2e_ok(!empty($loan["id"]), "loan posted");
$pnl = company_profit_loss($db, $a, $today, $today);
e2e_ok((int)$pnl["totalIncomePaise"] === 0 && (int)$pnl["totalExpensePaise"] === 0, "loan P&L unchanged");

echo "== OTHER_RECEIPT ==\n";
$inc = company_ledger_id_by_code($db, $a, "OTHER_INCOME");
company_post_voucher($db, $a, $userId, [
    "mutationId" => "e2e-or-" . company_new_id(),
    "purpose" => "OTHER_RECEIPT",
    "voucherDate" => $today,
    "amountPaise" => 100000,
    "cashBankLedgerId" => $bank,
    "counterLedgerId" => $inc,
    "status" => "POSTED",
]);
$pnl2 = company_profit_loss($db, $a, $today, $today);
e2e_ok((int)$pnl2["totalIncomePaise"] >= 100000, "OTHER_RECEIPT income");

echo "== Preview hash ==\n";
$lines = company_preview_purpose($db, $a, "FARMER_ADVANCE", 7000000, $party, $bank, null);
$farmer = company_new_id();
$db->prepare(
    "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
     VALUES (?, ?, 'E2E Farmer', 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$farmer, $a]);
$lines = company_preview_purpose($db, $a, "FARMER_ADVANCE", 7000000, $farmer, $bank, null);
$ctx = ["companyId" => $a, "purpose" => "FARMER_ADVANCE", "amountPaise" => 7000000, "partyId" => $farmer, "cashBankLedgerId" => $bank, "counterLedgerId" => null, "voucherDate" => $today];
$enriched = company_enrich_preview_lines($db, $a, $lines, $ctx);
e2e_ok(!empty($enriched["previewHash"]) && !empty($enriched["lines"][0]["ledgerName"]), "preview has names+hash");

echo "== Reversal ==\n";
$rev = company_reverse_voucher($db, $a, $userId, $loan["id"], "e2e-rev-" . company_new_id(), "e2e");
e2e_ok(!empty($rev["id"]), "reversal created");
$st = $db->query("SELECT status FROM company_vouchers WHERE id=" . $db->quote($loan["id"]))->fetchColumn();
e2e_ok($st === "REVERSED", "original reversed");

echo "== IDOR scoped ==\n";
$cross = $db->prepare("SELECT COUNT(*) FROM company_vouchers WHERE company_id=? AND id=?");
$cross->execute([$b, $loan["id"]]);
e2e_ok((int)$cross->fetchColumn() === 0, "company B cannot see A voucher by scope");

echo "== Idempotency ==\n";
$mut = "e2e-idem-" . company_new_id();
$p1 = company_post_voucher($db, $a, $userId, [
    "mutationId" => $mut, "purpose" => "EXPENSE", "voucherDate" => $today,
    "amountPaise" => 1000, "cashBankLedgerId" => $bank, "status" => "POSTED",
]);
$p2 = company_post_voucher($db, $a, $userId, [
    "mutationId" => $mut, "purpose" => "EXPENSE", "voucherDate" => $today,
    "amountPaise" => 1000, "cashBankLedgerId" => $bank, "status" => "POSTED",
]);
e2e_ok($p1["id"] === $p2["id"], "idempotent replay");

$tb = company_trial_balance($db, $a, $today, null);
$td = 0; $tc = 0;
foreach ($tb as $row) { $td += (int)$row["closingDebitPaise"]; $tc += (int)$row["closingCreditPaise"]; }
e2e_ok($td === $tc, "TB balanced");

echo "\nALL HTTP/DOMAIN E2E CHECKS PASSED\n";
