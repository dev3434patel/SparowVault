<?php
declare(strict_types=1);

if ((getenv("DB_NAME") ?: "") !== "sparowvault_verify_test") {
    fwrite(STDERR, "Refusing oracle: DB_NAME must be sparowvault_verify_test\n");
    exit(2);
}

require_once __DIR__ . "/../../../php/config/env.php";
require_once __DIR__ . "/../../../php/config/db.php";
require_once __DIR__ . "/../../../php/helpers/company/bootstrap.php";
require_once __DIR__ . "/../../../php/helpers/auth.php";

$results = [];
function record(string $id, string $status, array $detail): void {
    global $results;
    $results[] = ["id" => $id, "status" => $status] + $detail;
    echo $id . " " . $status . "\n";
}

$db = db_conn();
$alice = "sv-verify-alice";
$bob = "sv-verify-bob";
$today = gmdate("Y-m-d");
$companyId = company_new_id();
$otherId = company_new_id();

$db->beginTransaction();
$ins = $db->prepare(
    "INSERT INTO company_workspaces (id, owner_user_id, legal_name, display_name, currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'INR', 4, CURDATE(), 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
);
$ins->execute([$companyId, $alice, "Alpha Books", "Alpha Books"]);
$ins->execute([$otherId, $alice, "Beta Books", "Beta Books"]);
company_seed_workspace($db, $companyId, $alice);
company_seed_workspace($db, $otherId, $alice);
$db->commit();

$viewerRole = $db->prepare("SELECT id FROM company_roles WHERE company_id = ? AND code = 'VIEWER' LIMIT 1");
$viewerRole->execute([$companyId]);
$viewerRoleId = (string)$viewerRole->fetchColumn();
$membershipId = company_new_id();
$db->prepare(
    "INSERT INTO company_memberships (id, company_id, user_id, status, created_at, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$membershipId, $companyId, $bob]);
$db->prepare(
    "INSERT INTO company_membership_roles (id, company_id, membership_id, role_id, created_at)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
)->execute([company_new_id(), $companyId, $membershipId, $viewerRoleId]);

$bank = company_ledger_id_by_code($db, $companyId, "BANK_PRIMARY");
$sales = company_ledger_id_by_code($db, $companyId, "SALES_LEDGER");
$ar = company_ledger_id_by_code($db, $companyId, "AR_CONTROL");
$expense = company_ledger_id_by_code($db, $companyId, "OTHER_EXPENSE");
$taxGroup = $db->prepare("SELECT id FROM company_account_groups WHERE company_id = ? AND code = 'TAX_PAY' LIMIT 1");
$taxGroup->execute([$companyId]);
$taxGroupId = (string)$taxGroup->fetchColumn();
$taxLedger = company_new_id();
$db->prepare(
    "INSERT INTO company_ledgers (id, company_id, group_id, name, code, is_cash_bank, is_party_control, active, created_at, updated_at)
     VALUES (?, ?, ?, 'GST payable (hypothetical)', 'GST_PAYABLE', 0, 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$taxLedger, $companyId, $taxGroupId]);

$base = 1_000_000;
$tax = 180_000;
$receipt = 500_000;
$receivable = $base + $tax;
try {
    company_post_voucher($db, $companyId, $alice, [
        "mutationId" => "o07-sale-" . company_new_id(),
        "voucherType" => "SALE",
        "voucherDate" => $today,
        "narration" => "O07 sale recognition",
        "status" => "POSTED",
        "lines" => [
            ["ledgerId" => $ar, "side" => "DEBIT", "amountPaise" => $receivable],
            ["ledgerId" => $sales, "side" => "CREDIT", "amountPaise" => $base],
            ["ledgerId" => $taxLedger, "side" => "CREDIT", "amountPaise" => $tax],
        ],
    ]);
    company_post_voucher($db, $companyId, $alice, [
        "mutationId" => "o07-receipt-" . company_new_id(),
        "voucherType" => "RECEIPT",
        "voucherDate" => $today,
        "narration" => "O07 settlement",
        "status" => "POSTED",
        "lines" => [
            ["ledgerId" => $bank, "side" => "DEBIT", "amountPaise" => $receipt],
            ["ledgerId" => $ar, "side" => "CREDIT", "amountPaise" => $receipt],
        ],
    ]);
    $pnl = company_profit_loss($db, $companyId, $today, $today);
    $arBal = $db->prepare(
        "SELECT COALESCE(SUM(CASE WHEN side='DEBIT' THEN amount_paise ELSE -amount_paise END),0)
         FROM company_voucher_lines WHERE company_id = ? AND ledger_id = ?"
    );
    $arBal->execute([$companyId, $ar]);
    $arNet = (int)$arBal->fetchColumn();
    $income = (int)($pnl["totalIncomePaise"] ?? -1);
    $ok = $income === $base && $arNet === ($receivable - $receipt);
    record("O07", $ok ? "PASS" : "FAIL", [
        "expectedIncomePaise" => $base,
        "actualIncomePaise" => $income,
        "expectedReceivablePaise" => $receivable - $receipt,
        "actualReceivablePaise" => $arNet,
        "differencePaise" => $income - $base,
    ]);
} catch (Throwable $e) {
    record("O07", "FAIL", ["error" => $e->getMessage()]);
}

$ccA = company_new_id();
$ccB = company_new_id();
$db->prepare("INSERT INTO company_cost_centres (id, company_id, name, active, created_at, updated_at) VALUES (?, ?, 'CC A', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())")->execute([$ccA, $companyId]);
$db->prepare("INSERT INTO company_cost_centres (id, company_id, name, active, created_at, updated_at) VALUES (?, ?, 'CC B', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())")->execute([$ccB, $companyId]);
try {
    $posted = company_post_voucher($db, $companyId, $alice, [
        "mutationId" => "o08-split-" . company_new_id(),
        "voucherType" => "JOURNAL",
        "voucherDate" => $today,
        "narration" => "O08 dimension split",
        "status" => "POSTED",
        "lines" => [
            [
                "ledgerId" => $expense,
                "side" => "DEBIT",
                "amountPaise" => 10000,
                "costAllocations" => [
                    ["costCentreId" => $ccA, "amountPaise" => 6000],
                    ["costCentreId" => $ccB, "amountPaise" => 4000],
                ],
            ],
            ["ledgerId" => $bank, "side" => "CREDIT", "amountPaise" => 10000],
        ],
    ]);
    $sum = $db->prepare("SELECT COALESCE(SUM(amount_paise),0) FROM company_voucher_cost_allocations WHERE company_id = ? AND voucher_id = ?");
    $sum->execute([$companyId, $posted["id"]]);
    $alloc = (int)$sum->fetchColumn();
    $line = $db->prepare("SELECT COALESCE(SUM(amount_paise),0) FROM company_voucher_lines WHERE company_id = ? AND voucher_id = ? AND side = 'DEBIT'");
    $line->execute([$companyId, $posted["id"]]);
    $debit = (int)$line->fetchColumn();
    $unequalThrew = false;
    try {
        company_post_voucher($db, $companyId, $alice, [
            "mutationId" => "o08-bad-" . company_new_id(),
            "voucherType" => "JOURNAL",
            "voucherDate" => $today,
            "narration" => "O08 unequal",
            "status" => "POSTED",
            "lines" => [
                [
                    "ledgerId" => $expense,
                    "side" => "DEBIT",
                    "amountPaise" => 10000,
                    "costAllocations" => [
                        ["costCentreId" => $ccA, "amountPaise" => 6000],
                        ["costCentreId" => $ccB, "amountPaise" => 3000],
                    ],
                ],
                ["ledgerId" => $bank, "side" => "CREDIT", "amountPaise" => 10000],
            ],
        ]);
    } catch (Throwable $e) {
        $unequalThrew = true;
    }
    $ok = $alloc === 10000 && $debit === 10000 && $unequalThrew;
    record("O08", $ok ? "PASS" : "FAIL", [
        "allocationPaise" => $alloc,
        "debitLinePaise" => $debit,
        "unequalRejected" => $unequalThrew,
        "differencePaise" => $alloc - 10000,
    ]);
} catch (Throwable $e) {
    record("O08", "FAIL", ["error" => $e->getMessage()]);
}

try {
    company_items_ensure($db);
    $itemId = company_new_id();
    $db->prepare(
        "INSERT INTO company_items (id, company_id, name, kind, costing_method, qty, value_amount, cogs_amount, revenue_amount, active, created_at, updated_at)
         VALUES (?, ?, 'Widget', 'STOCK', 'weighted-average', 0, 0, 0, 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$itemId, $companyId]);
    $beforeVouchers = (int)$db->query("SELECT COUNT(*) FROM company_vouchers WHERE company_id = " . $db->quote($companyId))->fetchColumn();
    $state = company_stock_state();
    $state = company_apply_weighted_average($state, "buy", 10, 100);
    $state = company_apply_weighted_average($state, "sell", 4, 150);
    $db->prepare("UPDATE company_items SET qty=?, value_amount=?, cogs_amount=?, revenue_amount=? WHERE id=?")
        ->execute([$state["qty"], $state["value"], $state["cogs"], $state["revenue"], $itemId]);
    $afterVouchers = (int)$db->query("SELECT COUNT(*) FROM company_vouchers WHERE company_id = " . $db->quote($companyId))->fetchColumn();
    $expectedValue = 60_000;
    $expectedCogs = 40_000;
    $ok = $state["qty"] === 6 && $state["value"] === $expectedValue && $state["cogs"] === $expectedCogs && $afterVouchers > $beforeVouchers;
    record("O09", $ok ? "PASS" : "FAIL", [
        "qty" => $state["qty"],
        "storedValue" => $state["value"],
        "storedCogs" => $state["cogs"],
        "expectedValuePaise" => $expectedValue,
        "expectedCogsPaise" => $expectedCogs,
        "valueDifferencePaise" => $state["value"] - $expectedValue,
        "cogsDifferencePaise" => $state["cogs"] - $expectedCogs,
        "vouchersAdded" => $afterVouchers - $beforeVouchers,
        "uiSendsUnit" => 100,
        "note" => "Modules page sends unit 100 and 150. Paise for Rs 100 and Rs 150 are 10000 and 15000.",
    ]);
} catch (Throwable $e) {
    record("O09", "FAIL", ["error" => $e->getMessage()]);
}

try {
    $preview = company_payroll_preview(30000);
    $plan = company_payroll_commit_plan($preview);
    $payrollMap = [
        "SALARY_LEDGER" => ["Salary", "SALARY", "SALARY_LEDGER"],
        "STATUTORY_DEDUCTIONS" => ["Statutory deductions (unverified)", "TAX_PAY", "STATUTORY_DEDUCTIONS"],
        "EMPLOYER_LIABILITY" => ["Employer liability (unverified)", "EXP_PAY", "EMPLOYER_LIABILITY"],
        "SALARY_PAYABLE" => ["Salary payable", "EXP_PAY", "SALARY_PAYABLE"],
        "BANK" => ["Bank", "BANK", "BANK_PRIMARY"],
    ];
    $mapLine = static function (array $line) use ($db, $companyId, $payrollMap): array {
        $spec = $payrollMap[(string)$line["ledger"]];
        return [
            "ledgerId" => company_payroll_ledger_id($db, $companyId, $spec[2], $spec[0], $spec[1]),
            "side" => (string)$line["side"],
            "amountPaise" => company_payroll_rupees_to_paise((int)$line["amount"]),
        ];
    };
    $accrualLines = [];
    foreach ($plan["accrual"] as $line) {
        $accrualLines[] = $mapLine($line);
    }
    company_post_voucher($db, $companyId, $alice, [
        "mutationId" => "payroll-accrue-30000-oracle",
        "voucherType" => "JOURNAL",
        "voucherDate" => $today,
        "narration" => "O10 accrual",
        "status" => "POSTED",
        "lines" => $accrualLines,
    ]);
    $payLines = [];
    foreach ($plan["payment"]["lines"] as $line) {
        $payLines[] = $mapLine($line);
    }
    company_post_voucher($db, $companyId, $alice, [
        "mutationId" => "payroll-pay-30000-oracle",
        "voucherType" => "JOURNAL",
        "voucherDate" => $today,
        "narration" => "O10 payment",
        "status" => "POSTED",
        "lines" => $payLines,
    ]);
    $salary = company_ledger_id_by_code($db, $companyId, "SALARY_LEDGER");
    $q = $db->prepare("SELECT COALESCE(SUM(amount_paise),0) FROM company_voucher_lines WHERE company_id=? AND ledger_id=? AND side='DEBIT'");
    $q->execute([$companyId, $salary]);
    $salaryDebit = (int)$q->fetchColumn();
    $expected = 3_180_000;
    record("O10", $salaryDebit === $expected && $plan["paymentRepeatsSalaryExpense"] === false ? "PASS" : "FAIL", [
        "expectedSalaryDebitPaise" => $expected,
        "actualSalaryDebitPaise" => $salaryDebit,
        "differencePaise" => $salaryDebit - $expected,
        "paymentRepeatsSalaryExpense" => $plan["paymentRepeatsSalaryExpense"],
    ]);
} catch (Throwable $e) {
    record("O10", "FAIL", ["error" => $e->getMessage()]);
}

try {
    $before = (int)$db->query("SELECT COUNT(*) FROM company_vouchers WHERE company_id = " . $db->quote($companyId))->fetchColumn();
    $effect = company_cheque_match_effect(2_500_000, 15_000);
    $after = (int)$db->query("SELECT COUNT(*) FROM company_vouchers WHERE company_id = " . $db->quote($companyId))->fetchColumn();
    $ok = $effect["cashPostedAgain"] === 0 && $after === $before && $effect["feeIsExplicitVoucher"] === true;
    record("O11", $ok ? "PASS" : "FAIL", [
        "cashPostedAgain" => $effect["cashPostedAgain"],
        "vouchersAdded" => $after - $before,
        "feePaise" => 15000,
        "feeVoucherCreated" => false,
    ]);
} catch (Throwable $e) {
    record("O11", "FAIL", ["error" => $e->getMessage()]);
}

try {
    $before = (int)$db->query("SELECT COUNT(*) FROM company_vouchers WHERE company_id = " . $db->quote($companyId))->fetchColumn();
    $plan = company_reimbursement_plan(100000);
    $link = company_new_id();
    $db->prepare(
        "INSERT INTO company_cross_domain_links (id, company_id, company_voucher_id, personal_user_id, personal_collection, personal_entity_id, link_type, created_at)
         VALUES (?, ?, NULL, ?, 'udhari', 'local-receivable', 'REIMBURSEMENT', UTC_TIMESTAMP())"
    )->execute([$link, $companyId, $alice]);
    $after = (int)$db->query("SELECT COUNT(*) FROM company_vouchers WHERE company_id = " . $db->quote($companyId))->fetchColumn();
    $ok = $plan["companyPayable"] === 100000 && $after > $before;
    record("O12", $ok ? "PASS" : "FAIL", [
        "expectedCompanyPayablePaise" => 100000,
        "planCompanyPayable" => $plan["companyPayable"],
        "singleDatabaseTransaction" => $plan["singleDatabaseTransaction"],
        "vouchersAdded" => $after - $before,
        "personalRowsWritten" => 0,
        "differencePaise" => $after === $before ? 100000 : 0,
    ]);
} catch (Throwable $e) {
    record("O12", "FAIL", ["error" => $e->getMessage()]);
}

try {
    $omitted = company_group_management_totals(
        [["companyId" => "a", "total" => 100], ["companyId" => "b", "total" => 40]],
        []
    );
    $matched = company_group_management_totals(
        [["companyId" => "a", "total" => 100], ["companyId" => "b", "total" => 40]],
        [["fromCompanyId" => "a", "toCompanyId" => "b", "amount" => 15]]
    );
    $ok = $omitted["managementTotal"] === 140 && $matched["managementTotal"] === 125 && $matched["statutoryConsolidation"] === false && $omitted["automaticElimination"] === false;
    record("O13", $ok ? "PASS" : "FAIL", [
        "omittedTotal" => $omitted["managementTotal"],
        "matchedTotal" => $matched["managementTotal"],
        "automaticElimination" => $omitted["automaticElimination"],
        "note" => "An omitted pair stays inside the management total. There is no statutory consolidation.",
    ]);
} catch (Throwable $e) {
    record("O13", "FAIL", ["error" => $e->getMessage()]);
}

$authz = [
    "bobReopen" => company_user_has_permission($db, $bob, $companyId, "reopen_period"),
    "bobOpening" => company_user_has_permission($db, $bob, $companyId, "manage_opening_balances"),
    "bobApprove" => company_user_has_permission($db, $bob, $companyId, "approve_voucher"),
    "bobBackup" => company_user_has_permission($db, $bob, $companyId, "export_backup"),
    "aliceReopen" => company_user_has_permission($db, $alice, $companyId, "reopen_period"),
];
$openingDenied = false;
try {
    company_post_voucher($db, $companyId, $bob, [
        "mutationId" => "auth-open-" . company_new_id(),
        "voucherType" => "OPENING_BALANCE",
        "voucherDate" => $today,
        "status" => "POSTED",
        "lines" => [
            ["ledgerId" => $bank, "side" => "DEBIT", "amountPaise" => 100],
            ["ledgerId" => company_ledger_id_by_code($db, $companyId, "CAPITAL_LEDGER"), "side" => "CREDIT", "amountPaise" => 100],
        ],
    ]);
} catch (Throwable $e) {
    $openingDenied = str_contains($e->getMessage(), "manage_opening_balances");
}
$pinMissing = false;
$pinWrong = false;
$pinOk = false;
try {
    company_require_sensitive_pin(["userId" => $alice], []);
} catch (Throwable $e) {
    $pinMissing = str_contains($e->getMessage(), "PIN");
}
try {
    company_require_sensitive_pin(["userId" => $alice], ["pin" => "000000"]);
} catch (Throwable $e) {
    $pinWrong = true;
}
try {
    company_require_sensitive_pin(["userId" => $alice], ["pin" => "258013"]);
    $pinOk = true;
} catch (Throwable $e) {
    $pinOk = false;
}
$foreign = $db->prepare("SELECT COUNT(*) FROM company_vouchers v WHERE v.company_id = ? AND v.narration = 'O07 sale recognition'");
$foreign->execute([$otherId]);
$foreignCount = (int)$foreign->fetchColumn();
$stale = false;
try {
    company_post_voucher($db, $companyId, $alice, [
        "mutationId" => "auth-stale-" . company_new_id(),
        "purpose" => "OTHER_RECEIPT",
        "voucherDate" => $today,
        "amountPaise" => 100,
        "cashBankLedgerId" => $bank,
        "counterLedgerId" => company_ledger_id_by_code($db, $companyId, "OTHER_INCOME"),
        "previewHash" => str_repeat("ab", 32),
        "status" => "POSTED",
    ]);
} catch (Throwable $e) {
    $stale = str_contains($e->getMessage(), "stale") || str_contains($e->getMessage(), "Preview");
}
$authOk = $authz["bobReopen"] === false
    && $authz["bobOpening"] === false
    && $authz["bobApprove"] === false
    && $authz["bobBackup"] === false
    && $authz["aliceReopen"] === true
    && $openingDenied
    && $pinMissing
    && $pinWrong
    && $pinOk
    && $foreignCount === 0
    && $stale;
record("AUTH", $authOk ? "PASS" : "FAIL", [
    "permissions" => $authz,
    "openingDenied" => $openingDenied,
    "pinMissingDenied" => $pinMissing,
    "pinWrongDenied" => $pinWrong,
    "pinValidAccepted" => $pinOk,
    "foreignCompanySaleRows" => $foreignCount,
    "stalePreviewRejected" => $stale,
]);

$reportResults = [];
foreach (["receipts-payments", "project-report", "business-report", "area-report", "category-report", "user-activity"] as $key) {
    try {
        $data = company_report_run($db, $companyId, $key, ["from" => $today, "to" => $today, "asOf" => $today]);
        $rows = $data["rows"] ?? [];
        $reportResults[$key] = ["ok" => true, "rowCount" => is_array($rows) ? count($rows) : 0];
    } catch (Throwable $e) {
        $reportResults[$key] = ["ok" => false, "error" => $e->getMessage()];
    }
}
$reportsOk = true;
foreach ($reportResults as $row) {
    if (!$row["ok"]) $reportsOk = false;
}
record("REPORTS6", $reportsOk ? "PASS" : "FAIL", ["reports" => $reportResults]);

$idempotent = false;
try {
    $mid = "idem-" . substr(company_new_id(), 0, 20);
    $payload = [
        "mutationId" => $mid,
        "voucherType" => "JOURNAL",
        "voucherDate" => $today,
        "narration" => "idempotency",
        "status" => "POSTED",
        "lines" => [
            ["ledgerId" => $expense, "side" => "DEBIT", "amountPaise" => 100],
            ["ledgerId" => $bank, "side" => "CREDIT", "amountPaise" => 100],
        ],
    ];
    $first = company_post_voucher($db, $companyId, $alice, $payload);
    $second = company_post_voucher($db, $companyId, $alice, $payload);
    $count = $db->prepare("SELECT COUNT(*) FROM company_vouchers WHERE company_id = ? AND mutation_id = ?");
    $count->execute([$companyId, $mid]);
    $idempotent = $first["id"] === $second["id"] && (int)$count->fetchColumn() === 1;
} catch (Throwable $e) {
    $idempotent = false;
    $resultsIdemError = $e->getMessage();
}
record("IDEMPOTENCY", $idempotent ? "PASS" : "FAIL", ["sameVoucherReturned" => $idempotent, "error" => $resultsIdemError ?? null]);

$out = __DIR__ . "/oracle-company.json";
file_put_contents($out, json_encode(["companyId" => $companyId, "otherCompanyId" => $otherId, "results" => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
echo "wrote oracle-company.json\n";
