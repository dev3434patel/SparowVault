<?php
declare(strict_types=1);

require_once __DIR__ . "/../../../../php/config/env.php";
require_once __DIR__ . "/../../../../php/config/db.php";
require_once __DIR__ . "/../../../../php/helpers/auth.php";
require_once __DIR__ . "/../../../../php/helpers/company/bootstrap.php";

$TARGET = "sparowvault_test_svverify_b182d886";
$db = db_conn();
$actualDb = (string)$db->query("SELECT DATABASE()")->fetchColumn();
if ($actualDb !== $TARGET || !str_contains($actualDb, "test")) {
    fwrite(STDERR, "Refusing oracle: connected database is not the disposable target.\n");
    exit(2);
}

$results = [];
function record(string $id, string $surface, string $child, $expected, $actual, string $note = ""): void {
    global $results;
    $diff = (is_int($expected) && is_int($actual)) ? $actual - $expected : null;
    $results[] = [
        "id" => $id,
        "surface" => $surface,
        "child" => $child,
        "expected" => $expected,
        "actual" => $actual,
        "differencePaise" => $diff,
        "status" => $expected === $actual ? "PASS" : "FAIL",
        "note" => $note,
    ];
}

function ledger_net(PDO $db, string $companyId, string $ledgerId, string $status = "POSTED"): int {
    $st = $db->prepare(
        "SELECT COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE -l.amount_paise END), 0)
         FROM company_voucher_lines l
         INNER JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
         WHERE l.company_id = ? AND l.ledger_id = ? AND v.status = ? AND v.deleted_at IS NULL"
    );
    $st->execute([$companyId, $ledgerId, $status]);
    return (int)$st->fetchColumn();
}

function make_user(PDO $db, string $username, string $pin): string {
    $id = company_new_id();
    $salt = create_pin_salt();
    $hash = hash_secret($pin . ":" . $salt);
    $db->prepare(
        "INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'user', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$id, $username, $username, $hash, $salt]);
    return $id;
}

function make_company(PDO $db, string $ownerId, string $name): string {
    $id = company_new_id();
    $db->beginTransaction();
    $db->prepare(
        "INSERT INTO company_workspaces (id, owner_user_id, legal_name, display_name, currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'INR', 4, '2026-04-01', 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$id, $ownerId, $name, $name]);
    company_seed_workspace($db, $id, $ownerId);
    $db->commit();
    return $id;
}

function add_member(PDO $db, string $companyId, string $userId, string $roleCode): void {
    $role = $db->prepare("SELECT id FROM company_roles WHERE company_id = ? AND code = ?");
    $role->execute([$companyId, $roleCode]);
    $roleId = (string)$role->fetchColumn();
    $membershipId = company_new_id();
    $db->prepare(
        "INSERT INTO company_memberships (id, company_id, user_id, status, joined_at, created_at, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$membershipId, $companyId, $userId]);
    if ($roleId !== "") {
        $db->prepare(
            "INSERT INTO company_membership_roles (id, company_id, membership_id, role_id, created_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
        )->execute([company_new_id(), $companyId, $membershipId, $roleId]);
    }
}

function ensure_ledger(PDO $db, string $companyId, string $code, string $name, string $groupCode, int $cash = 0): string {
    $existing = company_ledger_id_by_code($db, $companyId, $code);
    if ($existing) return $existing;
    $group = $db->prepare("SELECT id FROM company_account_groups WHERE company_id = ? AND code = ?");
    $group->execute([$companyId, $groupCode]);
    $groupId = (string)$group->fetchColumn();
    $id = company_new_id();
    $db->prepare(
        "INSERT INTO company_ledgers (id, company_id, group_id, name, code, is_cash_bank, is_party_control, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$id, $companyId, $groupId, $name, $code, $cash]);
    return $id;
}

$alicePin = "2580";
$bobPin = "3691";
$alice = make_user($db, "alice_svv", $alicePin);
$bob = make_user($db, "bob_svv", $bobPin);
$alpha = make_company($db, $alice, "Alpha Audit Co");
$beta = make_company($db, $alice, "Beta Audit Co");
add_member($db, $alpha, $bob, "VIEWER");
$dataEntry = make_user($db, "data_svv", "4702");
add_member($db, $alpha, $dataEntry, "DATA_ENTRY");
$emptyUser = make_user($db, "empty_svv", "5813");
add_member($db, $alpha, $emptyUser, "NO_SUCH_ROLE");

$today = "2026-09-30";
$bank = company_ledger_id_by_code($db, $alpha, "BANK_PRIMARY");
$ar = company_ledger_id_by_code($db, $alpha, "AR_CONTROL");
$sales = company_ledger_id_by_code($db, $alpha, "SALES_LEDGER");
$tax = ensure_ledger($db, $alpha, "OUTPUT_GST", "Output GST", "TAX_PAY");
$stock = ensure_ledger($db, $alpha, "STOCK", "Stock", "INVENTORY");
$partyId = company_new_id();
$db->prepare(
    "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
     VALUES (?, ?, 'Gamma Customer', 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$partyId, $alpha]);

$base = 1_000_000;
$taxPaise = 180_000;
$receipt = 500_000;
$expectedReceivable = $base + $taxPaise;
$expectedOpen = $expectedReceivable - $receipt;

$draft = company_post_voucher($db, $alpha, $alice, [
    "mutationId" => "o07-sale-draft",
    "voucherType" => "SALE",
    "voucherDate" => $today,
    "partyId" => $partyId,
    "narration" => "O07 sale",
    "status" => "DRAFT",
    "lines" => [
        ["ledgerId" => $ar, "side" => "DEBIT", "amountPaise" => $expectedReceivable],
        ["ledgerId" => $sales, "side" => "CREDIT", "amountPaise" => $base],
        ["ledgerId" => $tax, "side" => "CREDIT", "amountPaise" => $taxPaise],
    ],
]);
record("O07-draft-revenue", "C-sales-invoice", "draft does not recognise revenue", 0, ledger_net($db, $alpha, $sales), "income net is credit-positive");
ob_start();
company_promote_draft_voucher($db, $alpha, $alice, (string)$draft["id"]);
ob_end_clean();
record("O07-posted-revenue", "C-sales-invoice", "posted sale recognises base only", $base, ledger_net($db, $alpha, $sales));
record("O07-posted-tax", "C-sales-invoice", "tax is a liability credit", -$taxPaise, ledger_net($db, $alpha, $tax));
record("O07-posted-receivable", "C-sales-invoice", "receivable is base plus tax", $expectedReceivable, ledger_net($db, $alpha, $ar));

company_post_voucher($db, $alpha, $alice, [
    "mutationId" => "o07-receipt",
    "voucherType" => "RECEIPT",
    "voucherDate" => $today,
    "partyId" => $partyId,
    "narration" => "O07 receipt",
    "status" => "POSTED",
    "lines" => [
        ["ledgerId" => $bank, "side" => "DEBIT", "amountPaise" => $receipt],
        ["ledgerId" => $ar, "side" => "CREDIT", "amountPaise" => $receipt],
    ],
]);
record("O07-revenue-after-receipt", "C-sales-invoice", "receipt does not re-recognise revenue", $base, ledger_net($db, $alpha, $sales));
record("O07-open-receivable", "C-sales-invoice", "receipt settles part of the receivable", $expectedOpen, ledger_net($db, $alpha, $ar));
record("O07-bank", "C-sales-invoice", "receipt increases bank once", $receipt, ledger_net($db, $alpha, $bank));

$cc1 = company_new_id();
$cc2 = company_new_id();
$db->prepare("INSERT INTO company_cost_centres (id, company_id, name, code, active, created_at, updated_at) VALUES (?, ?, 'CC A', 'A', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())")->execute([$cc1, $alpha]);
$db->prepare("INSERT INTO company_cost_centres (id, company_id, name, code, active, created_at, updated_at) VALUES (?, ?, 'CC B', 'B', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())")->execute([$cc2, $alpha]);
$project = company_new_id();
$db->prepare("INSERT INTO company_projects (id, company_id, name, code, active, created_at, updated_at) VALUES (?, ?, 'Project One', 'P1', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())")->execute([$project, $alpha]);
$expense = company_ledger_id_by_code($db, $alpha, "OTHER_EXPENSE");
$lineAmount = 100_000;
$splitVoucher = company_post_voucher($db, $alpha, $alice, [
    "mutationId" => "o08-split",
    "voucherType" => "PAYMENT",
    "voucherDate" => $today,
    "narration" => "O08 dimension split",
    "status" => "POSTED",
    "dimensions" => ["projectId" => $project],
    "lines" => [
        [
            "ledgerId" => $expense,
            "side" => "DEBIT",
            "amountPaise" => $lineAmount,
            "projectId" => $project,
            "costAllocations" => [
                ["costCentreId" => $cc1, "amountPaise" => 60_000],
                ["costCentreId" => $cc2, "amountPaise" => 40_000],
            ],
        ],
        ["ledgerId" => $bank, "side" => "CREDIT", "amountPaise" => $lineAmount, "projectId" => $project],
    ],
]);
$alloc = $db->prepare("SELECT COALESCE(SUM(amount_paise),0) FROM company_voucher_cost_allocations WHERE company_id = ? AND voucher_id = ?");
$alloc->execute([$alpha, $splitVoucher["id"]]);
record("O08-allocation-sum", "C-dimensions", "splits equal the line", $lineAmount, (int)$alloc->fetchColumn());
$voucherDebit = $db->prepare("SELECT COALESCE(SUM(amount_paise),0) FROM company_voucher_lines WHERE company_id = ? AND voucher_id = ? AND side = 'DEBIT'");
$voucherDebit->execute([$alpha, $splitVoucher["id"]]);
record("O08-line-not-doubled", "C-dimensions", "voucher debit equals the line", $lineAmount, (int)$voucherDebit->fetchColumn());
$projectReport = company_report_run($db, $alpha, "project-report", ["from" => $today, "to" => $today]);
$projectDebit = 0;
foreach ($projectReport["rows"] as $row) {
    if (($row["dimensionId"] ?? "") === $project) $projectDebit += (int)$row["debitPaise"];
}
record("O08-project-report", "C-reports", "project report debit equals the line", $lineAmount, $projectDebit);

company_items_ensure($db);
$itemId = company_new_id();
$db->prepare(
    "INSERT INTO company_items (id, company_id, name, kind, costing_method, qty, value_amount, cogs_amount, revenue_amount, active, created_at, updated_at)
     VALUES (?, ?, 'Widget', 'STOCK', 'weighted-average', 0, 0, 0, 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$itemId, $alpha]);
$bought = company_apply_weighted_average(["qty" => 0, "value" => 0, "cogs" => 0, "revenue" => 0], "buy", 2, 10_000);
$db->prepare("UPDATE company_items SET qty=?, value_amount=?, cogs_amount=?, revenue_amount=? WHERE id=? AND company_id=?")
    ->execute([$bought["qty"], $bought["value"], $bought["cogs"], $bought["revenue"], $itemId, $alpha]);
$sold = company_apply_weighted_average($bought, "sell", 1, 15_000);
$db->prepare("UPDATE company_items SET qty=?, value_amount=?, cogs_amount=?, revenue_amount=? WHERE id=? AND company_id=?")
    ->execute([$sold["qty"], $sold["value"], $sold["cogs"], $sold["revenue"], $itemId, $alpha]);
$itemRow = $db->prepare("SELECT qty, value_amount, cogs_amount, revenue_amount FROM company_items WHERE id=?");
$itemRow->execute([$itemId]);
$item = $itemRow->fetch(PDO::FETCH_ASSOC);
record("O09-qty", "C-inventory", "one unit remains", 1, (int)$item["qty"]);
record("O09-value", "C-inventory", "remaining stock value", 10_000, (int)$item["value_amount"]);
record("O09-cogs", "C-inventory", "cost of the unit sold", 10_000, (int)$item["cogs_amount"]);
record("O09-item-revenue", "C-inventory", "sale price stored on the item", 15_000, (int)$item["revenue_amount"]);
record("O09-stock-ledger", "C-inventory", "STOCK ledger should hold remaining value", 10_000, ledger_net($db, $alpha, $stock), "item row is not a posted voucher");

$preview = company_payroll_preview(30000);
$plan = company_payroll_commit_plan($preview);
$expectedExpense = (30000 + 1800) * 100;
$expectedNet = (30000 - 4000) * 100;
$codes = [
    "SALARY_LEDGER" => ["Salary", "SALARY"],
    "STATUTORY_DEDUCTIONS" => ["Statutory deductions (unverified)", "TAX_PAY"],
    "EMPLOYER_LIABILITY" => ["Employer liability (unverified)", "EXP_PAY"],
    "SALARY_PAYABLE" => ["Salary payable", "EXP_PAY"],
    "BANK" => ["Bank", "BANK"],
];
$accrualLines = [];
foreach ($plan["accrual"] as $line) {
    $code = $line["ledger"] === "BANK" ? "BANK_PRIMARY" : (string)$line["ledger"];
    [$name, $group] = $codes[$line["ledger"]];
    $accrualLines[] = [
        "ledgerId" => company_payroll_ledger_id($db, $alpha, $code, $name, $group),
        "side" => (string)$line["side"],
        "amountPaise" => company_payroll_rupees_to_paise((int)$line["amount"]),
    ];
}
company_post_voucher($db, $alpha, $alice, [
    "mutationId" => "payroll-accrue-30000",
    "voucherType" => "JOURNAL",
    "voucherDate" => $today,
    "narration" => "O10 accrual",
    "status" => "POSTED",
    "lines" => $accrualLines,
]);
$salaryId = company_ledger_id_by_code($db, $alpha, "SALARY_LEDGER");
$payableId = company_ledger_id_by_code($db, $alpha, "SALARY_PAYABLE");
record("O10-accrual-expense", "C-payroll", "accrual expenses gross plus employer", $expectedExpense, ledger_net($db, $alpha, $salaryId));
record("O10-accrual-payable", "C-payroll", "net pay is a credit payable", -$expectedNet, ledger_net($db, $alpha, $payableId));
$payLines = [];
foreach ($plan["payment"]["lines"] as $line) {
    $code = $line["ledger"] === "BANK" ? "BANK_PRIMARY" : (string)$line["ledger"];
    [$name, $group] = $codes[$line["ledger"]];
    $payLines[] = [
        "ledgerId" => company_payroll_ledger_id($db, $alpha, $code, $name, $group),
        "side" => (string)$line["side"],
        "amountPaise" => company_payroll_rupees_to_paise((int)$line["amount"]),
    ];
}
$salaryBeforePay = ledger_net($db, $alpha, $salaryId);
company_post_voucher($db, $alpha, $alice, [
    "mutationId" => "payroll-pay-30000",
    "voucherType" => "JOURNAL",
    "voucherDate" => $today,
    "narration" => "O10 payment",
    "status" => "POSTED",
    "lines" => $payLines,
]);
record("O10-payment-no-second-expense", "C-payroll", "payment does not expense salary again", $salaryBeforePay, ledger_net($db, $alpha, $salaryId));
record("O10-payable-cleared", "C-payroll", "payment clears the payable", 0, ledger_net($db, $alpha, $payableId));

$bankBeforeCheque = ledger_net($db, $alpha, $bank);
$cheque = 2_500_000;
$chequeVoucher = company_post_voucher($db, $alpha, $alice, [
    "mutationId" => "o11-cheque",
    "voucherType" => "PAYMENT",
    "voucherDate" => $today,
    "narration" => "O11 cheque issued",
    "status" => "POSTED",
    "lines" => [
        ["ledgerId" => $expense, "side" => "DEBIT", "amountPaise" => $cheque],
        ["ledgerId" => $bank, "side" => "CREDIT", "amountPaise" => $cheque],
    ],
]);
$match = company_cheque_match_effect($cheque, 0);
$bankAfterMatch = ledger_net($db, $alpha, $bank);
record("O11-not-cleared-yet", "C-cheque", "bank stays put until the cheque clears", $bankBeforeCheque, $bankAfterMatch, "match cashPostedAgain=" . (int)$match["cashPostedAgain"]);
record("O11-match-does-not-double", "C-cheque", "matching does not post a second cash amount", 0, (int)$match["cashPostedAgain"]);

$reimburse = 750_000;
$planR = company_reimbursement_plan($reimburse);
$linkId = company_new_id();
$db->prepare(
    "INSERT INTO company_cross_domain_links (id, company_id, company_voucher_id, personal_user_id, personal_collection, personal_entity_id, link_type, created_at)
     VALUES (?, ?, NULL, ?, 'udhari', ?, 'REIMBURSEMENT', UTC_TIMESTAMP())"
)->execute([$linkId, $alpha, $alice, "personal-udhari-o12"]);
$bridgeVouchers = $db->prepare("SELECT COUNT(*) FROM company_voucher_lines l JOIN company_vouchers v ON v.id=l.voucher_id WHERE v.company_id=? AND v.narration LIKE 'O12%'");
$bridgeVouchers->execute([$alpha]);
record("O12-company-payable", "C-bridge", "company books a payable for the reimbursement", $reimburse, 0, "link stored; plan companyPayable=" . $planR["companyPayable"] . "; singleDatabaseTransaction=" . ($planR["singleDatabaseTransaction"] ? "true" : "false"));

try {
    company_post_voucher($db, $alpha, $alice, [
        "mutationId" => "o13-one-sided",
        "voucherType" => "JOURNAL",
        "voucherDate" => $today,
        "narration" => "O13 omitted offset",
        "status" => "POSTED",
        "lines" => [
            ["ledgerId" => $expense, "side" => "DEBIT", "amountPaise" => 100_000],
        ],
    ]);
    record("O13-reject-unbalanced", "C-journal", "one-sided journal is rejected", "rejected", "accepted");
} catch (Throwable $e) {
    record("O13-reject-unbalanced", "C-journal", "one-sided journal is rejected", "rejected", "rejected", $e->getMessage());
}

try {
    company_post_voucher($db, $beta, $bob, [
        "mutationId" => "foreign-bob",
        "voucherType" => "JOURNAL",
        "voucherDate" => $today,
        "narration" => "foreign",
        "status" => "POSTED",
        "lines" => [
            ["ledgerId" => company_ledger_id_by_code($db, $beta, "OTHER_EXPENSE"), "side" => "DEBIT", "amountPaise" => 100],
            ["ledgerId" => company_ledger_id_by_code($db, $beta, "BANK_PRIMARY"), "side" => "CREDIT", "amountPaise" => 100],
        ],
    ]);
    record("AUTH-foreign-company", "C-access", "viewer of Alpha cannot post into Beta", "denied", "posted");
} catch (Throwable $e) {
    record("AUTH-foreign-company", "C-access", "viewer of Alpha cannot post into Beta", "denied", "denied", $e->getMessage());
}

$bobRow = user_auth_row_by_id($bob);
$pinOk = $bobRow && verify_secret($bobPin . ":" . (string)$bobRow["pin_salt"], (string)$bobRow["pin_hash"]);
$canReopen = company_user_has_permission($db, $bob, $alpha, "reopen_period");
$canOpening = company_user_has_permission($db, $bob, $alpha, "manage_opening_balances");
$canApprove = company_user_has_permission($db, $bob, $alpha, "approve_voucher");
$canBackup = company_user_has_permission($db, $bob, $alpha, "export_backup");
record("AUTH-pin-without-reopen", "C-settings", "valid PIN does not grant reopen_period", false, $pinOk && $canReopen);
record("AUTH-pin-without-opening", "C-ledgers", "valid PIN does not grant manage_opening_balances", false, $pinOk && $canOpening);
record("AUTH-pin-without-approve", "C-approvals", "valid PIN does not grant approve_voucher", false, $pinOk && $canApprove);
record("AUTH-pin-without-backup", "C-export", "valid PIN does not grant export_backup", false, $pinOk && $canBackup);

$emptyPerms = company_user_permissions($db, $emptyUser, $alpha);
record("AUTH-empty-permissions", "C-permissions", "membership with no role denies", 0, count($emptyPerms));
try {
    company_post_voucher($db, $alpha, $emptyUser, [
        "mutationId" => "empty-perm",
        "voucherType" => "JOURNAL",
        "voucherDate" => $today,
        "status" => "POSTED",
        "lines" => [
            ["ledgerId" => $expense, "side" => "DEBIT", "amountPaise" => 100],
            ["ledgerId" => $bank, "side" => "CREDIT", "amountPaise" => 100],
        ],
    ]);
    record("AUTH-empty-post", "C-permissions", "empty permissions cannot post", "denied", "posted");
} catch (Throwable $e) {
    record("AUTH-empty-post", "C-permissions", "empty permissions cannot post", "denied", "denied", $e->getMessage());
}

$previewDraft = company_post_voucher($db, $alpha, $alice, [
    "mutationId" => "preview-then-revoke",
    "voucherType" => "JOURNAL",
    "voucherDate" => $today,
    "narration" => "preview revoke",
    "status" => "DRAFT",
    "lines" => [
        ["ledgerId" => $expense, "side" => "DEBIT", "amountPaise" => 100],
        ["ledgerId" => $bank, "side" => "CREDIT", "amountPaise" => 100],
    ],
]);
try {
    ob_start();
    company_promote_draft_voucher($db, $alpha, $dataEntry, (string)$previewDraft["id"]);
    ob_end_clean();
    record("AUTH-preview-revoke", "C-vouchers", "data entry cannot promote after preview", "denied", "posted");
} catch (Throwable $e) {
    ob_end_clean();
    record("AUTH-preview-revoke", "C-vouchers", "data entry cannot promote after preview", "denied", "denied", $e->getMessage());
}

$reportKeys = ["receipts-payments", "project-report", "business-report", "area-report", "category-report", "user-activity"];
foreach ($reportKeys as $key) {
    try {
        $data = company_report_run($db, $alpha, $key, ["from" => "2026-04-01", "to" => $today]);
        $rows = is_array($data["rows"] ?? null) ? count($data["rows"]) : -1;
        record("RPT-" . $key, "C-reports", "PHP handler runs", "ran", "ran", "rows=" . $rows);
    } catch (Throwable $e) {
        record("RPT-" . $key, "C-reports", "PHP handler runs", "ran", "threw", $e->getMessage());
    }
}

$out = [
    "database" => $actualDb,
    "generatedAt" => gmdate("c"),
    "results" => $results,
];
$dest = dirname(__DIR__) . "/oracle-results-company.json";
file_put_contents($dest, json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
$fail = 0;
foreach ($results as $row) if ($row["status"] !== "PASS") $fail++;
echo "company oracles fail=$fail total=" . count($results) . "\n";
exit(0);
