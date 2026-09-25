<?php
declare(strict_types=1);
/**
 * Scaled performance seed (certification smoke — not full 100k by default).
 * Env: COMPANY_PERF_PARTIES (default 200), COMPANY_PERF_VOUCHERS (default 500)
 * Usage: php scripts/company/perf-generator.php
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";
require_once __DIR__ . "/../../php/helpers/company/bootstrap.php";

$partyN = (int)(getenv("COMPANY_PERF_PARTIES") ?: 200);
$voucherN = (int)(getenv("COMPANY_PERF_VOUCHERS") ?: 500);

$db = db_conn();
$user = $db->query("SELECT id FROM users WHERE deleted_at IS NULL AND is_active=1 ORDER BY created_at ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$user) { fwrite(STDERR, "No user\n"); exit(1); }
$userId = (string)$user["id"];

$companyId = company_new_id();
$db->beginTransaction();
$db->prepare(
    "INSERT INTO company_workspaces (id, owner_user_id, legal_name, display_name, currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at)
     VALUES (?, ?, 'Perf Co', 'Perf Co', 'INR', 4, CURDATE(), 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$companyId, $userId]);
company_seed_workspace($db, $companyId, $userId);
$db->commit();
$bank = company_ledger_id_by_code($db, $companyId, "BANK_PRIMARY");

$t0 = microtime(true);
$partyIds = [];
$pins = $db->prepare(
    "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
     VALUES (?, ?, ?, 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
);
for ($i = 0; $i < $partyN; $i++) {
    $id = company_new_id();
    $partyIds[] = $id;
    $pins->execute([$id, $companyId, "Perf Party $i"]);
}
$tParties = microtime(true) - $t0;

$t1 = microtime(true);
for ($i = 0; $i < $voucherN; $i++) {
    company_post_voucher($db, $companyId, $userId, [
        "mutationId" => "perf-" . $i . "-" . company_new_id(),
        "purpose" => "EXPENSE",
        "voucherDate" => gmdate("Y-m-d"),
        "amountPaise" => 100 + ($i % 50),
        "cashBankLedgerId" => $bank,
        "status" => "POSTED",
    ]);
}
$tVouchers = microtime(true) - $t1;

$t2 = microtime(true);
$tb = company_trial_balance($db, $companyId, gmdate("Y-m-d"), null);
$tTb = microtime(true) - $t2;

$out = [
    "companyId" => $companyId,
    "parties" => $partyN,
    "vouchers" => $voucherN,
    "partyInsertSec" => round($tParties, 3),
    "voucherPostSec" => round($tVouchers, 3),
    "trialBalanceSec" => round($tTb, 3),
    "tbRows" => count($tb),
];
echo json_encode($out, JSON_PRETTY_PRINT) . "\n";
$dir = __DIR__ . "/../../docs/company/evidence";
if (!is_dir($dir)) mkdir($dir, 0777, true);
file_put_contents($dir . "/EVIDENCE_COMPANY_PERFORMANCE.txt", json_encode($out, JSON_PRETTY_PRINT));
echo "PERF GENERATOR DONE\n";
