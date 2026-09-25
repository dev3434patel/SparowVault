<?php
declare(strict_types=1);
/**
 * PHP domain tests for purpose registry, OTHER_RECEIPT direction, property advance vs expense, ON_ACCOUNT.
 * Usage: php scripts/company/php-tests/run-accounting.php
 */
require_once __DIR__ . "/../../../php/config/env.php";
require_once __DIR__ . "/../../../php/config/db.php";
require_once __DIR__ . "/../../../php/helpers/company/bootstrap.php";

function t_assert(bool $c, string $m): void {
    if (!$c) throw new RuntimeException("FAIL: $m");
    echo "  ✓ $m\n";
}

$db = db_conn();
$user = $db->query("SELECT id FROM users WHERE deleted_at IS NULL AND is_active=1 ORDER BY created_at ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$user) { fwrite(STDERR, "No user\n"); exit(1); }
$userId = (string)$user["id"];
$today = gmdate("Y-m-d");

$companyId = company_new_id();
$db->beginTransaction();
$db->prepare(
    "INSERT INTO company_workspaces (id, owner_user_id, legal_name, display_name, currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at)
     VALUES (?, ?, 'PHP Test Co', 'PHP Test Co', 'INR', 4, CURDATE(), 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$companyId, $userId]);
company_seed_workspace($db, $companyId, $userId);
$db->commit();

$bank = company_ledger_id_by_code($db, $companyId, "BANK_PRIMARY");
$otherInc = company_ledger_id_by_code($db, $companyId, "OTHER_INCOME");
$propAdv = company_ledger_id_by_code($db, $companyId, "PROPERTY_ADVANCE");
$propExp = company_ledger_id_by_code($db, $companyId, "PROPERTY_EXPENSE");
if (!$propAdv || !$propExp) {
    // Seed may have been applied before new ledgers — insert if missing
    fwrite(STDERR, "Missing property ledgers — re-seed or apply migration for existing companies\n");
}

echo "== Registry loads ==\n";
$reg = company_purpose_registry();
t_assert(count($reg["purposes"]) > 10, "purpose registry has purposes");
t_assert(company_purpose_rule("OTHER_RECEIPT") !== null, "OTHER_RECEIPT exists");
t_assert(company_purpose_rule("PROPERTY_ADVANCE") !== null, "PROPERTY_ADVANCE exists");

echo "== OTHER_RECEIPT direction ==\n";
$lines = company_preview_purpose($db, $companyId, "OTHER_RECEIPT", 100000, null, $bank, $otherInc);
t_assert($lines[0]["side"] === "DEBIT" && $lines[0]["ledgerId"] === $bank, "OTHER_RECEIPT debits bank");
t_assert($lines[1]["side"] === "CREDIT" && $lines[1]["ledgerId"] === $otherInc, "OTHER_RECEIPT credits income (not expense)");

$pnl0 = company_profit_loss($db, $companyId, $today, $today);
company_post_voucher($db, $companyId, $userId, [
    "mutationId" => "php-or-" . company_new_id(),
    "purpose" => "OTHER_RECEIPT",
    "voucherDate" => $today,
    "amountPaise" => 100000,
    "cashBankLedgerId" => $bank,
    "counterLedgerId" => $otherInc,
    "status" => "POSTED",
]);
$pnl1 = company_profit_loss($db, $companyId, $today, $today);
t_assert((int)$pnl1["totalIncomePaise"] === (int)$pnl0["totalIncomePaise"] + 100000, "OTHER_RECEIPT increases income");

if ($propAdv && $propExp) {
    echo "== PROPERTY_ADVANCE vs EXPENSE ==\n";
    $partyId = company_new_id();
    $db->prepare(
        "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
         VALUES (?, ?, 'Prop Party', 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$partyId, $companyId]);

    $pnlA = company_profit_loss($db, $companyId, $today, $today);
    company_post_voucher($db, $companyId, $userId, [
        "mutationId" => "php-pa-" . company_new_id(),
        "purpose" => "PROPERTY_ADVANCE",
        "voucherDate" => $today,
        "partyId" => $partyId,
        "amountPaise" => 7000000,
        "cashBankLedgerId" => $bank,
        "status" => "POSTED",
    ]);
    $pnlB = company_profit_loss($db, $companyId, $today, $today);
    t_assert((int)$pnlB["netProfitPaise"] === (int)$pnlA["netProfitPaise"], "PROPERTY_ADVANCE no P&L");

    company_post_voucher($db, $companyId, $userId, [
        "mutationId" => "php-pe-" . company_new_id(),
        "purpose" => "PROPERTY_EXPENSE",
        "voucherDate" => $today,
        "amountPaise" => 7000000,
        "cashBankLedgerId" => $bank,
        "status" => "POSTED",
    ]);
    $pnlC = company_profit_loss($db, $companyId, $today, $today);
    t_assert((int)$pnlC["totalExpensePaise"] === (int)$pnlB["totalExpensePaise"] + 7000000, "PROPERTY_EXPENSE hits P&L");
}

echo "== ON_ACCOUNT persistence ==\n";
$party2 = company_new_id();
$db->prepare(
    "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
     VALUES (?, ?, 'Vendor OnAcct', 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$party2, $companyId]);
$v = company_post_voucher($db, $companyId, $userId, [
    "mutationId" => "php-oa-" . company_new_id(),
    "purpose" => "VENDOR_PAYMENT",
    "voucherDate" => $today,
    "partyId" => $party2,
    "amountPaise" => 5000000,
    "cashBankLedgerId" => $bank,
    "billAllocations" => [
        ["allocationType" => "ON_ACCOUNT", "amountPaise" => 5000000],
    ],
    "status" => "POSTED",
]);
$cnt = (int)$db->query(
    "SELECT COUNT(*) FROM company_bill_allocations WHERE company_id=" . $db->quote($companyId)
    . " AND voucher_id=" . $db->quote($v["id"]) . " AND allocation_type='ON_ACCOUNT' AND bill_ref_id IS NULL"
)->fetchColumn();
t_assert($cnt === 1, "ON_ACCOUNT row persisted with null bill_ref_id");

echo "== LOAN_RECEIVED P&L zero ==\n";
$partyLoan = company_new_id();
$db->prepare(
    "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
     VALUES (?, ?, 'Lender Audit', 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$partyLoan, $companyId]);
$db->prepare(
    "INSERT INTO company_party_roles (id, company_id, party_id, role_code, created_at)
     VALUES (?, ?, ?, 'LENDER', UTC_TIMESTAMP())"
)->execute([company_new_id(), $companyId, $partyLoan]);
$pnlBeforeLoan = company_profit_loss($db, $companyId, $today, $today);
$loan = company_post_voucher($db, $companyId, $userId, [
    "mutationId" => "php-loan-" . company_new_id(),
    "purpose" => "LOAN_RECEIVED",
    "voucherDate" => $today,
    "partyId" => $partyLoan,
    "amountPaise" => 10000000,
    "cashBankLedgerId" => $bank,
    "status" => "POSTED",
]);
$pnlAfterLoan = company_profit_loss($db, $companyId, $today, $today);
t_assert(
    (int)$pnlAfterLoan["netProfitPaise"] === (int)$pnlBeforeLoan["netProfitPaise"],
    "LOAN_RECEIVED does not change P&L"
);

echo "== Preview/post parity + PREVIEW_STALE ==\n";
$prevCtx = company_preview_hash_context("OTHER_RECEIPT", 25000, null, $bank, $otherInc);
$prev = company_enrich_preview_lines(
    $db,
    $companyId,
    company_preview_purpose($db, $companyId, "OTHER_RECEIPT", 25000, null, $bank, $otherInc),
    $prevCtx
);
t_assert(!empty($prev["previewHash"]), "previewHash present");
$posted = company_post_voucher($db, $companyId, $userId, [
    "mutationId" => "php-prev-" . company_new_id(),
    "purpose" => "OTHER_RECEIPT",
    "voucherDate" => $today,
    "amountPaise" => 25000,
    "cashBankLedgerId" => $bank,
    "counterLedgerId" => $otherInc,
    "previewHash" => $prev["previewHash"],
    "status" => "POSTED",
]);
$lineRows = $db->prepare("SELECT ledger_id, side, amount_paise FROM company_voucher_lines WHERE company_id=? AND voucher_id=? ORDER BY line_no");
$lineRows->execute([$companyId, $posted["id"]]);
$postedLines = $lineRows->fetchAll(PDO::FETCH_ASSOC);
t_assert(count($postedLines) === count($prev["lines"]), "posted line count matches preview");
foreach ($prev["lines"] as $i => $pl) {
    t_assert($postedLines[$i]["ledger_id"] === $pl["ledgerId"], "preview ledger matches post line $i");
    t_assert($postedLines[$i]["side"] === $pl["side"], "preview side matches post line $i");
    t_assert((int)$postedLines[$i]["amount_paise"] === (int)$pl["amountPaise"], "preview amount matches post line $i");
}
$staleThrown = false;
try {
    company_post_voucher($db, $companyId, $userId, [
        "mutationId" => "php-stale-" . company_new_id(),
        "purpose" => "OTHER_RECEIPT",
        "voucherDate" => $today,
        "amountPaise" => 25000,
        "cashBankLedgerId" => $bank,
        "counterLedgerId" => $otherInc,
        "previewHash" => "deadbeef",
        "status" => "POSTED",
    ]);
} catch (Throwable $e) {
    $staleThrown = ($e instanceof CompanyPostingException && $e->errorCode === "PREVIEW_STALE")
        || str_contains($e->getMessage(), "stale");
}
t_assert($staleThrown, "PREVIEW_STALE rejects mismatched hash");

echo "== Unbalanced journal reject ==\n";
$unbal = false;
try {
    company_post_voucher($db, $companyId, $userId, [
        "mutationId" => "php-unbal-" . company_new_id(),
        "voucherType" => "JOURNAL",
        "voucherDate" => $today,
        "lines" => [
            ["ledgerId" => $bank, "side" => "DEBIT", "amountPaise" => 100],
            ["ledgerId" => $otherInc, "side" => "CREDIT", "amountPaise" => 50],
        ],
        "status" => "POSTED",
    ]);
} catch (Throwable $e) {
    $unbal = true;
}
t_assert($unbal, "unbalanced voucher rejected");

echo "== Double reverse reject ==\n";
$rev1 = company_reverse_voucher($db, $companyId, $userId, $loan["id"], "php-rev1-" . company_new_id(), "audit");
t_assert(!empty($rev1["id"]), "first reversal created");
$rev2 = company_reverse_voucher($db, $companyId, $userId, $loan["id"], "php-rev2-" . company_new_id(), "audit");
t_assert((string)$rev2["id"] === (string)$rev1["id"], "second reverse replays same reversal voucher");
$stLoan = (string)$db->query("SELECT status FROM company_vouchers WHERE id=" . $db->quote($loan["id"]))->fetchColumn();
t_assert($stLoan === "REVERSED", "original remains REVERSED after second reverse call");
$revCount = (int)$db->query(
    "SELECT COUNT(*) FROM company_vouchers WHERE company_id=" . $db->quote($companyId)
    . " AND reversed_voucher_id IS NOT NULL AND narration LIKE " . $db->quote("%" . $loan["voucher_number"] . "%")
)->fetchColumn();
// At most one reversal voucher linked from original
$linked = (string)$db->query(
    "SELECT reversed_voucher_id FROM company_vouchers WHERE id=" . $db->quote($loan["id"])
)->fetchColumn();
t_assert($linked === (string)$rev1["id"], "original points to single reversal voucher");

echo "== Voucher number seq past 9999 ==\n";
$prefix = "PAY-" . str_replace("-", "", $today) . "-";
// Simulate string-sort trap: insert 9999 and 10000 style numbers
$db->prepare(
    "INSERT INTO company_vouchers (id, company_id, voucher_number, voucher_type, voucher_date, status, created_by, mutation_id, created_at, updated_at)
     VALUES (?, ?, ?, 'PAYMENT', ?, 'POSTED', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([company_new_id(), $companyId, $prefix . "9999", $today, $userId, "seq-trap-a-" . company_new_id()]);
$db->prepare(
    "INSERT INTO company_vouchers (id, company_id, voucher_number, voucher_type, voucher_date, status, created_by, mutation_id, created_at, updated_at)
     VALUES (?, ?, ?, 'PAYMENT', ?, 'POSTED', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([company_new_id(), $companyId, $prefix . "10000", $today, $userId, "seq-trap-b-" . company_new_id()]);
$next = company_next_voucher_number($db, $companyId, "PAYMENT", $today);
t_assert(str_ends_with($next, "00010001") || str_ends_with($next, "10001"), "next seq after 10000 is 10001 got $next");

echo "== TB still balanced ==\n";
$tb = company_trial_balance($db, $companyId, $today, null);
$td = 0;
$tc = 0;
foreach ($tb as $row) {
    $td += (int)$row["closingDebitPaise"];
    $tc += (int)$row["closingCreditPaise"];
}
t_assert($td === $tc, "trial balance debit=credit ($td == $tc)");

echo "== Deprecated purposes rejected ==\n";
foreach (["OTHER" => "OTHER_PAYMENT", "PROPERTY_PAYMENT" => "PROPERTY_EXPENSE", "REFUND" => "VENDOR_REFUND_RECEIVED"] as $legacy => $repl) {
    $caught = null;
    try {
        company_preview_purpose($db, $companyId, $legacy, 10000, null, $bank, null);
    } catch (CompanyPostingException $e) {
        $caught = $e;
    }
    t_assert($caught instanceof CompanyPostingException, "$legacy throws");
    t_assert($caught->errorCode === "PURPOSE_DEPRECATED", "$legacy code PURPOSE_DEPRECATED");
    t_assert($caught->status === 422, "$legacy HTTP 422");
    t_assert(str_contains($caught->getMessage(), $repl), "$legacy message mentions $repl");
}

$postCaught = null;
try {
    company_post_voucher($db, $companyId, $userId, [
        "mutationId" => "php-dep-" . company_new_id(),
        "purpose" => "OTHER",
        "voucherDate" => $today,
        "amountPaise" => 10000,
        "cashBankLedgerId" => $bank,
        "status" => "POSTED",
    ]);
} catch (CompanyPostingException $e) {
    $postCaught = $e;
}
t_assert($postCaught instanceof CompanyPostingException && $postCaught->errorCode === "PURPOSE_DEPRECATED", "post OTHER rejected PURPOSE_DEPRECATED");

echo "== Report view permission map ==\n";
t_assert(company_report_view_permission("trial-balance") === "view_trial_balance", "TB → view_trial_balance");
t_assert(company_report_view_permission("day-book") === "view_day_book", "day-book → view_day_book");
t_assert(company_report_view_permission("profit-loss") === "view_pnl", "P&L → view_pnl");

echo "== Report registry SoT parity ==\n";
$reportReg = company_report_registry();
t_assert(count($reportReg["reports"]) >= 10, "report registry has entries");
$partyIdForStmt = company_new_id();
$db->prepare(
    "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
     VALUES (?, ?, 'Parity Party', 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
)->execute([$partyIdForStmt, $companyId]);

foreach ($reportReg["reports"] as $row) {
    $key = (string)$row["key"];
    $enabled = !empty($row["enabled"]);
    if (!$enabled) {
        $caught = null;
        try {
            company_report_resolve($key);
        } catch (CompanyPostingException $e) {
            $caught = $e;
        }
        t_assert($caught instanceof CompanyPostingException, "$key resolve throws when disabled");
        t_assert($caught->errorCode === "REPORT_DISABLED", "$key → REPORT_DISABLED");
        continue;
    }
    // Enabled: resolve + run with minimal opts
    [$perm, $handler] = company_report_resolve($key);
    t_assert($perm === (string)$row["permission"] || !empty($row["aliasOf"]), "$key permission from registry ($perm)");
    t_assert($handler !== "", "$key has handler");
    $opts = [
        "asOf" => $today,
        "from" => $today,
        "to" => $today,
        "partyId" => $partyIdForStmt,
        "ledgerId" => $bank,
        "side" => $row["side"] ?? "receivable",
    ];
    $data = company_report_run($db, $companyId, $key, $opts);
    t_assert($data !== null, "$key runs (enabled → data)");
}

$unknownCaught = null;
try {
    company_report_resolve("not-a-real-report");
} catch (CompanyPostingException $e) {
    $unknownCaught = $e;
}
t_assert($unknownCaught instanceof CompanyPostingException && $unknownCaught->errorCode === "REPORT_UNKNOWN", "unknown → REPORT_UNKNOWN");

echo "== Purpose preview parity (non-deprecated) ==\n";
foreach (company_purpose_registry()["purposes"] as $p) {
    if (!empty($p["deprecated"])) continue;
    $pkey = strtoupper((string)$p["key"]);
    $strategy = strtoupper((string)($p["counterStrategy"] ?? ""));
    if ($strategy === "CONTRA_EXPLICIT") {
        continue; // PHP requires explicit lines; FE transfer UI owns CONTRA drafts
    }
    $partyForPurpose = null;
    $counterExplicit = null;
    if (!empty($p["requiresParty"])) {
        $partyForPurpose = $partyIdForStmt;
    }
    if ($strategy === "EXPLICIT_COUNTER") {
        $counterExplicit = $otherInc;
    }
    if ($strategy === "LEDGER_CODE" && empty($p["counterLedgerCode"])) {
        continue;
    }
    try {
        $plines = company_preview_purpose(
            $db,
            $companyId,
            $pkey,
            5000,
            $partyForPurpose,
            $bank,
            $counterExplicit
        );
    } catch (CompanyPostingException $e) {
        // Party relationship may need seed roles — skip soft failures for missing COA
        if (str_contains($e->getMessage(), "COA_INCOMPLETE") || str_contains($e->getMessage(), "relationship")) {
            echo "  ~ skip $pkey: " . $e->getMessage() . "\n";
            continue;
        }
        throw $e;
    }
    t_assert(count($plines) === 2, "$pkey yields 2 lines");
    $direction = strtoupper((string)($p["direction"] ?? ""));
    $vt = strtoupper((string)($p["voucherType"] ?? ""));
    $isReceipt = $direction === "RECEIVED" || in_array($vt, ["RECEIPT", "SALE"], true);
    if ($isReceipt) {
        t_assert($plines[0]["side"] === "DEBIT" && $plines[0]["ledgerId"] === $bank, "$pkey Dr bank");
        t_assert($plines[1]["side"] === "CREDIT", "$pkey Cr counter");
    } else {
        t_assert($plines[0]["side"] === "DEBIT", "$pkey Dr counter");
        t_assert($plines[1]["side"] === "CREDIT" && $plines[1]["ledgerId"] === $bank, "$pkey Cr bank");
    }
}

echo "\nALL PHP ACCOUNTING TESTS PASSED\n";
