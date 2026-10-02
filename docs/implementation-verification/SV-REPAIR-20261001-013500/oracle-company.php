<?php
declare(strict_types=1);

/**
 * Disposable-database checks for the reimbursement, cheque, and stock repairs.
 * Refuses any connection whose database name does not contain "test".
 */
require_once __DIR__ . "/../../../php/config/env.php";
require_once __DIR__ . "/../../../php/config/db.php";
require_once __DIR__ . "/../../../php/helpers/auth.php";
require_once __DIR__ . "/../../../php/helpers/company/bootstrap.php";

$db = db_conn();
$actualDb = (string)$db->query("SELECT DATABASE()")->fetchColumn();
if (!str_contains(strtolower($actualDb), "test") || !str_contains($actualDb, "svrepair_20261001")) {
    fwrite(STDERR, "Refusing oracle: connected database is not the disposable target.\n");
    exit(2);
}

$mode = $argv[1] ?? "";

function ledger_net(PDO $db, string $companyId, string $code): int {
    $st = $db->prepare(
        "SELECT COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE -l.amount_paise END), 0)
         FROM company_voucher_lines l
         INNER JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
         INNER JOIN company_ledgers g ON g.id = l.ledger_id AND g.company_id = l.company_id
         WHERE l.company_id = ? AND g.code = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL"
    );
    $st->execute([$companyId, $code]);
    return (int)$st->fetchColumn();
}

if ($mode === "setup") {
    $userId = company_new_id();
    $salt = create_pin_salt();
    $hash = hash_secret("5829:" . $salt);
    $db->prepare(
        "INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
         VALUES (?, 'svrepair01', 'Repair Check', ?, ?, 'user', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$userId, $hash, $salt]);
    $companyId = company_new_id();
    $db->beginTransaction();
    $db->prepare(
        "INSERT INTO company_workspaces (id, owner_user_id, legal_name, display_name, currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at)
         VALUES (?, ?, 'Repair Books', 'Repair Books', 'INR', 4, '2026-04-01', 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$companyId, $userId]);
    company_seed_workspace($db, $companyId, $userId);
    $db->commit();
    $token = sign_cloud_token(["userId" => $userId, "username" => "svrepair01"]);
    echo json_encode([
        "companyId" => $companyId,
        "userId" => $userId,
        "personalEntityId" => "udh_repair_750000",
        "token" => $token,
        "database" => $actualDb,
    ], JSON_UNESCAPED_SLASHES);
    exit(0);
}

if ($mode === "measure") {
    $companyId = $argv[2] ?? "";
    if ($companyId === "") {
        fwrite(STDERR, "companyId required\n");
        exit(2);
    }
    $item = $db->prepare(
        "SELECT qty, value_amount, cogs_amount FROM company_items WHERE company_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1"
    );
    $item->execute([$companyId]);
    $row = $item->fetch(PDO::FETCH_ASSOC) ?: ["qty" => null, "value_amount" => null, "cogs_amount" => null];
    $vouchers = $db->prepare("SELECT COUNT(*) FROM company_vouchers WHERE company_id = ? AND status = 'POSTED' AND deleted_at IS NULL");
    $vouchers->execute([$companyId]);
    $expenseVouchers = $db->prepare(
        "SELECT COUNT(DISTINCT v.id)
         FROM company_vouchers v
         INNER JOIN company_voucher_lines l ON l.voucher_id = v.id AND l.company_id = v.company_id
         INNER JOIN company_ledgers g ON g.id = l.ledger_id AND g.company_id = l.company_id
         WHERE v.company_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL AND g.code = 'REIMBURSEMENT_EXPENSE'"
    );
    $expenseVouchers->execute([$companyId]);
    echo json_encode([
        "database" => $actualDb,
        "payable" => ledger_net($db, $companyId, "REIMBURSEMENT_PAYABLE"),
        "expense" => ledger_net($db, $companyId, "REIMBURSEMENT_EXPENSE"),
        "salary" => ledger_net($db, $companyId, "SALARY"),
        "reimbursementVouchers" => (int)$expenseVouchers->fetchColumn(),
        "bank" => ledger_net($db, $companyId, "BANK_PRIMARY"),
        "uncleared" => ledger_net($db, $companyId, "UNCLEARED_CHEQUE"),
        "stock" => ledger_net($db, $companyId, "STOCK"),
        "cogs" => ledger_net($db, $companyId, "COGS"),
        "itemQty" => $row["qty"] === null ? null : (int)$row["qty"],
        "itemValue" => $row["value_amount"] === null ? null : (int)$row["value_amount"],
        "itemCogs" => $row["cogs_amount"] === null ? null : (int)$row["cogs_amount"],
        "postedVouchers" => (int)$vouchers->fetchColumn(),
    ], JSON_UNESCAPED_SLASHES);
    exit(0);
}

fwrite(STDERR, "mode must be setup or measure\n");
exit(2);
