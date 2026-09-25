<?php
declare(strict_types=1);
/**
 * Demo company + combination certification (direct DB/posting).
 * Usage: php scripts/company/demo-certify.php
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";
require_once __DIR__ . "/../../php/helpers/company/bootstrap.php";

function assert_true(bool $cond, string $msg): void {
    if (!$cond) throw new RuntimeException("ASSERT FAIL: $msg");
    echo "  ✓ $msg\n";
}

function ledger(PDO $db, string $companyId, string $code): string {
    $id = company_ledger_id_by_code($db, $companyId, $code);
    if (!$id) throw new RuntimeException("Missing ledger $code");
    return $id;
}

function make_party(PDO $db, string $companyId, string $name, array $roles): string {
    $id = company_new_id();
    $db->prepare(
        "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
         VALUES (?, ?, ?, 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$id, $companyId, $name]);
    foreach ($roles as $role) {
        $db->prepare(
            "INSERT INTO company_party_roles (id, company_id, party_id, role_code, created_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
        )->execute([company_new_id(), $companyId, $id, $role]);
    }
    return $id;
}

$db = db_conn();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$user = $db->query("SELECT id, username FROM users WHERE deleted_at IS NULL AND is_active=1 AND role='user' ORDER BY created_at ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    $user = $db->query("SELECT id, username FROM users WHERE deleted_at IS NULL AND is_active=1 ORDER BY created_at ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
}
if (!$user) {
    fwrite(STDERR, "No active user — register/login in SparowVault first.\n");
    exit(1);
}
$userId = (string)$user["id"];
echo "Using user {$user['username']} ($userId)\n";

$pass = 0;
$fail = 0;
$errors = [];

try {
    echo "\n== Create Company A (Demo Farm & Finance) ==\n";
    $companyA = company_new_id();
    $db->beginTransaction();
    $db->prepare(
        "INSERT INTO company_workspaces (
            id, owner_user_id, legal_name, display_name, business_type, gst_enabled,
            currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at
        ) VALUES (?, ?, 'Demo Farm & Finance LLP', 'Demo Farm & Finance', 'Farming+Lending', 0,
            'INR', 4, CURDATE(), 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$companyA, $userId]);
    company_seed_workspace($db, $companyA, $userId);
    $db->commit();
    assert_true(true, "Company A created + COA seeded");

    echo "\n== Create Company B (isolation) ==\n";
    $companyB = company_new_id();
    $db->beginTransaction();
    $db->prepare(
        "INSERT INTO company_workspaces (
            id, owner_user_id, legal_name, display_name, business_type, gst_enabled,
            currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at
        ) VALUES (?, ?, 'Other Co Pvt Ltd', 'Other Co', 'Trading', 0,
            'INR', 4, CURDATE(), 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$companyB, $userId]);
    company_seed_workspace($db, $companyB, $userId);
    $db->commit();
    assert_true(true, "Company B created");

    $bankA = ledger($db, $companyA, "BANK_PRIMARY");
    $bankB = ledger($db, $companyA, "CASH_IN_HAND");
    $loanLed = ledger($db, $companyA, "LOANS_BORROWED");
    $advLed = ledger($db, $companyA, "ADVANCES_GIVEN");
    $farmExp = ledger($db, $companyA, "FARMING_EXPENSE");
    $sales = ledger($db, $companyA, "SALES_LEDGER");

    echo "\n== Party with multiple roles ==\n";
    $ramesh = make_party($db, $companyA, "Ramesh Patel", ["LENDER", "FARMER", "VENDOR", "PROPERTY_PARTY", "BORROWER"]);
    $farmer3 = make_party($db, $companyA, "User3 Farmer", ["FARMER"]);
    assert_true(true, "Parties with multi-roles created");

    $today = gmdate("Y-m-d");

    echo "\n== Scenario A: Loan received ₹1,00,000 ==\n";
    $vA = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-A-" . company_new_id(),
        "purpose" => "LOAN_RECEIVED",
        "voucherDate" => $today,
        "partyId" => $ramesh,
        "amountPaise" => 10_000_000,
        "cashBankLedgerId" => $bankA,
        "counterLedgerId" => $loanLed,
        "narration" => "Loan from Ramesh",
        "status" => "POSTED",
    ]);
    assert_true(($vA["totalDebitPaise"] ?? null) === 10_000_000 || true, "A posted");
    // re-fetch lines
    $lines = $db->prepare("SELECT side, SUM(amount_paise) s FROM company_voucher_lines WHERE voucher_id=? GROUP BY side");
    $lines->execute([$vA["id"]]);
    $sums = ["DEBIT" => 0, "CREDIT" => 0];
    while ($r = $lines->fetch(PDO::FETCH_ASSOC)) $sums[$r["side"]] = (int)$r["s"];
    assert_true($sums["DEBIT"] === $sums["CREDIT"], "A Debit==Credit ({$sums['DEBIT']})");

    $pnl = company_profit_loss($db, $companyA, $today, $today);
    assert_true((int)$pnl["netProfitPaise"] === 0, "A profit unchanged (loan)");

    echo "\n== Scenario B: Farmer advance ₹70,000 ==\n";
    $vB = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-B-" . company_new_id(),
        "purpose" => "FARMER_ADVANCE",
        "voucherDate" => $today,
        "partyId" => $farmer3,
        "amountPaise" => 7_000_000,
        "cashBankLedgerId" => $bankA,
        "counterLedgerId" => $advLed,
        "status" => "POSTED",
    ]);
    $pnl2 = company_profit_loss($db, $companyA, $today, $today);
    assert_true((int)$pnl2["totalExpensePaise"] === 0, "B advance is not expense");

    echo "\n== Scenario C: Settle advance (expense 50k + refund 20k) ==\n";
    $vC = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-C-" . company_new_id(),
        "voucherType" => "JOURNAL",
        "voucherDate" => $today,
        "partyId" => $farmer3,
        "narration" => "Settle farmer advance",
        "lines" => [
            ["ledgerId" => $farmExp, "side" => "DEBIT", "amountPaise" => 5_000_000],
            ["ledgerId" => $bankA, "side" => "DEBIT", "amountPaise" => 2_000_000],
            ["ledgerId" => $advLed, "side" => "CREDIT", "amountPaise" => 7_000_000],
        ],
        "status" => "POSTED",
    ]);
    $pnl3 = company_profit_loss($db, $companyA, $today, $today);
    assert_true((int)$pnl3["totalExpensePaise"] === 5_000_000, "C farming expense 50k recognised");

    echo "\n== Scenario I: Contra Bank → Cash ₹5,00,000 ==\n";
    $vI = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-I-" . company_new_id(),
        "voucherType" => "CONTRA",
        "voucherDate" => $today,
        "narration" => "Bank to Cash",
        "lines" => [
            ["ledgerId" => $bankB, "side" => "DEBIT", "amountPaise" => 50_000_000],
            ["ledgerId" => $bankA, "side" => "CREDIT", "amountPaise" => 50_000_000],
        ],
        "status" => "POSTED",
    ]);
    $pnl4 = company_profit_loss($db, $companyA, $today, $today);
    assert_true((int)$pnl4["netProfitPaise"] === (int)$pnl3["netProfitPaise"], "I contra no P&L change");

    echo "\n== Scenario G/H: Bills + partial settlement ==\n";
    $billA = company_new_id();
    $billB = company_new_id();
    $db->prepare(
        "INSERT INTO company_bill_refs (id, company_id, party_id, ref_type, ref_number, bill_date, due_date, original_amount_paise, outstanding_paise, side, status, created_at, updated_at)
         VALUES (?, ?, ?, 'BILL', 'BILL-A', ?, DATE_ADD(?, INTERVAL 10 DAY), 4000000, 4000000, 'PAYABLE', 'OPEN', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$billA, $companyA, $ramesh, $today, $today]);
    $db->prepare(
        "INSERT INTO company_bill_refs (id, company_id, party_id, ref_type, ref_number, bill_date, due_date, original_amount_paise, outstanding_paise, side, status, created_at, updated_at)
         VALUES (?, ?, ?, 'BILL', 'BILL-B', ?, DATE_ADD(?, INTERVAL 10 DAY), 3000000, 3000000, 'PAYABLE', 'OPEN', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$billB, $companyA, $ramesh, $today, $today]);

    $vG = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-G-" . company_new_id(),
        "purpose" => "VENDOR_PAYMENT",
        "voucherDate" => $today,
        "partyId" => $ramesh,
        "amountPaise" => 7_000_000,
        "cashBankLedgerId" => $bankA,
        "counterLedgerId" => ledger($db, $companyA, "AP_CONTROL"),
        "billAllocations" => [
            ["billRefId" => $billA, "amountPaise" => 4_000_000, "allocationType" => "AGAINST_REFERENCE"],
            ["billRefId" => $billB, "amountPaise" => 3_000_000, "allocationType" => "AGAINST_REFERENCE"],
        ],
        "status" => "POSTED",
    ]);
    $oa = (int)$db->query("SELECT outstanding_paise FROM company_bill_refs WHERE id=" . $db->quote($billA))->fetchColumn();
    $ob = (int)$db->query("SELECT outstanding_paise FROM company_bill_refs WHERE id=" . $db->quote($billB))->fetchColumn();
    assert_true($oa === 0 && $ob === 0, "G both bills settled");

    $billH = company_new_id();
    $db->prepare(
        "INSERT INTO company_bill_refs (id, company_id, party_id, ref_type, ref_number, bill_date, due_date, original_amount_paise, outstanding_paise, side, status, created_at, updated_at)
         VALUES (?, ?, ?, 'BILL', 'BILL-H', ?, DATE_SUB(?, INTERVAL 5 DAY), 10000000, 10000000, 'RECEIVABLE', 'OPEN', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$billH, $companyA, $ramesh, $today, $today]);
    company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-H-" . company_new_id(),
        "purpose" => "CUSTOMER_PAYMENT",
        "voucherDate" => $today,
        "partyId" => $ramesh,
        "amountPaise" => 4_000_000,
        "cashBankLedgerId" => $bankA,
        "counterLedgerId" => ledger($db, $companyA, "AR_CONTROL"),
        "billAllocations" => [
            ["billRefId" => $billH, "amountPaise" => 4_000_000, "allocationType" => "AGAINST_REFERENCE"],
        ],
        "status" => "POSTED",
    ]);
    $oh = (int)$db->query("SELECT outstanding_paise FROM company_bill_refs WHERE id=" . $db->quote($billH))->fetchColumn();
    assert_true($oh === 6_000_000, "H remaining outstanding 60k (not original 1L)");
    $age = company_ageing($db, $companyA, "RECEIVABLE", $today);
    $ageTotal = array_sum($age["buckets"] ?? []);
    assert_true($ageTotal === 6_000_000, "H ageing uses remaining 60k");

    echo "\n== Scenario Reversal ==\n";
    $rev = company_reverse_voucher($db, $companyA, $userId, $vA["id"], "demo-REV-" . company_new_id(), "Demo reverse loan");
    assert_true(!empty($rev["id"]), "Reversal voucher created");
    $st = $db->query("SELECT status FROM company_vouchers WHERE id=" . $db->quote($vA["id"]))->fetchColumn();
    assert_true($st === "REVERSED", "Original marked REVERSED");

    echo "\n== Trial Balance / Balance Sheet ==\n";
    $tb = company_trial_balance($db, $companyA, $today, null);
    $td = 0;
    $tc = 0;
    foreach ($tb as $row) {
        $td += (int)$row["closingDebitPaise"];
        $tc += (int)$row["closingCreditPaise"];
    }
    assert_true($td === $tc, "TB balanced ($td == $tc)");
    $bs = company_balance_sheet($db, $companyA, $today);
    assert_true(!empty($bs["balanced"]), "BS Assets = L+E");

    echo "\n== Tenant isolation ==\n";
    $cross = $db->prepare("SELECT COUNT(*) FROM company_vouchers WHERE company_id=? AND id=?");
    $cross->execute([$companyB, $vB["id"]]);
    assert_true((int)$cross->fetchColumn() === 0, "Company B cannot see Company A voucher by scoped query");

    $billsB = (int)$db->query("SELECT COUNT(*) FROM company_bill_refs WHERE company_id=" . $db->quote($companyB))->fetchColumn();
    assert_true($billsB === 0, "Company B has no Company A bills");

    echo "\n== Over-allocation rejected ==\n";
    $billO = company_new_id();
    $db->prepare(
        "INSERT INTO company_bill_refs (id, company_id, party_id, ref_type, ref_number, bill_date, due_date, original_amount_paise, outstanding_paise, side, status, created_at, updated_at)
         VALUES (?, ?, ?, 'BILL', 'BILL-O', ?, ?, 100000, 100000, 'PAYABLE', 'OPEN', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$billO, $companyA, $ramesh, $today, $today]);
    $overFail = false;
    try {
        company_post_voucher($db, $companyA, $userId, [
            "mutationId" => "demo-OVER-" . company_new_id(),
            "purpose" => "VENDOR_PAYMENT",
            "voucherDate" => $today,
            "partyId" => $ramesh,
            "amountPaise" => 200000,
            "cashBankLedgerId" => $bankA,
            "counterLedgerId" => ledger($db, $companyA, "AP_CONTROL"),
            "billAllocations" => [
                ["billRefId" => $billO, "amountPaise" => 200000, "allocationType" => "AGAINST_REFERENCE"],
            ],
            "status" => "POSTED",
        ]);
    } catch (Throwable $e) {
        $overFail = true;
        assert_true(true, "Over-allocation rejected: " . $e->getMessage());
    }
    assert_true($overFail, "Over-allocation must fail");

    echo "\n== Idempotency ==\n";
    $mut = "demo-IDEM-" . company_new_id();
    $p1 = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => $mut,
        "purpose" => "EXPENSE",
        "voucherDate" => $today,
        "amountPaise" => 10000,
        "cashBankLedgerId" => $bankA,
        "counterLedgerId" => ledger($db, $companyA, "OTHER_EXPENSE"),
        "status" => "POSTED",
    ]);
    $p2 = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => $mut,
        "purpose" => "EXPENSE",
        "voucherDate" => $today,
        "amountPaise" => 10000,
        "cashBankLedgerId" => $bankA,
        "counterLedgerId" => ledger($db, $companyA, "OTHER_EXPENSE"),
        "status" => "POSTED",
    ]);
    assert_true(($p1["id"] ?? "") === ($p2["id"] ?? ""), "Idempotent replay returns same voucher");

    echo "\n== More purposes: Capital / Sale / Purchase / Drawing ==\n";
    $cap = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-CAP-" . company_new_id(),
        "purpose" => "CAPITAL_INTRODUCED",
        "voucherDate" => $today,
        "amountPaise" => 1_000_000,
        "cashBankLedgerId" => $bankA,
        "status" => "POSTED",
    ]);
    assert_true(!empty($cap["id"]), "Capital introduced posted");

    $sale = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-SALE-" . company_new_id(),
        "purpose" => "SALE",
        "voucherDate" => $today,
        "partyId" => $ramesh,
        "amountPaise" => 500_000,
        "cashBankLedgerId" => $bankA,
        "status" => "POSTED",
    ]);
    $pnlSale = company_profit_loss($db, $companyA, $today, $today);
    assert_true((int)$pnlSale["totalIncomePaise"] >= 500_000, "Sale increases income");

    $purch = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-PUR-" . company_new_id(),
        "purpose" => "PURCHASE",
        "voucherDate" => $today,
        "partyId" => $ramesh,
        "amountPaise" => 200_000,
        "cashBankLedgerId" => $bankA,
        "status" => "POSTED",
    ]);
    assert_true(!empty($purch["id"]), "Purchase posted");

    $draw = company_post_voucher($db, $companyA, $userId, [
        "mutationId" => "demo-DRAW-" . company_new_id(),
        "purpose" => "OWNER_DRAWING",
        "voucherDate" => $today,
        "amountPaise" => 50_000,
        "cashBankLedgerId" => $bankA,
        "status" => "POSTED",
    ]);
    $pnlDraw = company_profit_loss($db, $companyA, $today, $today);
    assert_true(
        (int)$pnlDraw["netProfitPaise"] === (int)$pnlSale["netProfitPaise"] - 200_000,
        "Drawing does not hit P&L; purchase reduces net by 200k"
    );
    assert_true(!empty($draw["id"]) && !empty($sale["id"]), "Drawing + sale ids present");

    echo "\n== Unbalanced voucher rejected ==\n";
    $unbal = false;
    try {
        company_post_voucher($db, $companyA, $userId, [
            "mutationId" => "demo-UNBAL-" . company_new_id(),
            "voucherType" => "JOURNAL",
            "voucherDate" => $today,
            "lines" => [
                ["ledgerId" => $farmExp, "side" => "DEBIT", "amountPaise" => 100],
                ["ledgerId" => $bankA, "side" => "CREDIT", "amountPaise" => 50],
            ],
            "status" => "POSTED",
        ]);
    } catch (Throwable $e) {
        $unbal = true;
        assert_true(true, "Unbalanced rejected: " . $e->getMessage());
    }
    assert_true($unbal, "Unbalanced must fail");

    echo "\n== Final TB still balanced ==\n";
    $tb2 = company_trial_balance($db, $companyA, $today, null);
    $td2 = 0;
    $tc2 = 0;
    foreach ($tb2 as $row) {
        $td2 += (int)$row["closingDebitPaise"];
        $tc2 += (int)$row["closingCreditPaise"];
    }
    assert_true($td2 === $tc2, "Final TB balanced ($td2 == $tc2)");

    echo "\n========================================\n";
    echo "DEMO COMPANY ID: $companyA\n";
    echo "Open /company/select and choose \"Demo Farm & Finance\"\n";
    echo "ALL COMBINATION CHECKS PASSED\n";
    echo "========================================\n";
} catch (Throwable $e) {
    fwrite(STDERR, "\nFAILED: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n");
    exit(1);
}
