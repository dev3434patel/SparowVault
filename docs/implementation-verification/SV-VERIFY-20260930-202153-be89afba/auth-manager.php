<?php
declare(strict_types=1);
if ((getenv("DB_NAME") ?: "") !== "sparowvault_verify_test") {
    fwrite(STDERR, "refuse\n");
    exit(2);
}
require_once __DIR__ . "/../../../php/config/env.php";
require_once __DIR__ . "/../../../php/config/db.php";
require_once __DIR__ . "/../../../php/helpers/company/bootstrap.php";

$db = db_conn();
$companyId = $argv[1] ?? "";
$bob = "sv-verify-bob";
$st = $db->prepare("SELECT COUNT(*) FROM company_vouchers WHERE company_id = ? AND created_by = ?");
$st->execute([$companyId, $bob]);
echo "bobVouchers=" . $st->fetchColumn() . "\n";

$role = $db->prepare("SELECT id FROM company_roles WHERE company_id = ? AND code = 'MANAGER' LIMIT 1");
$role->execute([$companyId]);
$roleId = (string)$role->fetchColumn();
$gamma = "sv-verify-gamma";
$salt = create_pin_salt();
$hash = hash_secret("258013:" . $salt);
$db->prepare("INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at) VALUES (?, 'gammaverify', 'Gamma Verify', ?, ?, 'user', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())")->execute([$gamma, $hash, $salt]);
$gmid = company_new_id();
$db->prepare("INSERT INTO company_memberships (id, company_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())")->execute([$gmid, $companyId, $gamma]);
$db->prepare("INSERT INTO company_membership_roles (id, company_id, membership_id, role_id, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())")->execute([company_new_id(), $companyId, $gmid, $roleId]);

$bank = company_ledger_id_by_code($db, $companyId, "BANK_PRIMARY");
$capital = company_ledger_id_by_code($db, $companyId, "CAPITAL_LEDGER");
$today = gmdate("Y-m-d");
$detail = ["hasOpening" => company_user_has_permission($db, $gamma, $companyId, "manage_opening_balances"), "hasJournal" => company_user_has_permission($db, $gamma, $companyId, "create_journal")];
try {
    company_post_voucher($db, $companyId, $gamma, [
        "mutationId" => "mgr-open-" . company_new_id(),
        "voucherType" => "OPENING_BALANCE",
        "voucherDate" => $today,
        "status" => "POSTED",
        "lines" => [
            ["ledgerId" => $bank, "side" => "DEBIT", "amountPaise" => 100],
            ["ledgerId" => $capital, "side" => "CREDIT", "amountPaise" => 100],
        ],
    ]);
    $detail["posted"] = true;
    $detail["error"] = null;
} catch (Throwable $e) {
    $detail["posted"] = false;
    $detail["error"] = $e->getMessage();
}
file_put_contents(__DIR__ . "/auth-manager.json", json_encode($detail, JSON_PRETTY_PRINT));
echo json_encode($detail), "\n";
