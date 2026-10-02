<?php
declare(strict_types=1);

require_once __DIR__ . "/../../../../php/helpers/company/phase_sv_pure.php";

function assert_same($actual, $expected, string $label): void {
    if ($actual !== $expected) {
        fwrite(STDERR, $label . " expected " . var_export($expected, true) . " got " . var_export($actual, true) . "\n");
        exit(1);
    }
}

/** @param array<string,int> $nets */
function debit_balance(array $nets, string $ledger): int {
    $net = (int)($nets[$ledger] ?? 0);
    return $net > 0 ? $net : 0;
}

/** @param array<string,int> $nets */
function credit_balance(array $nets, string $ledger): int {
    $net = (int)($nets[$ledger] ?? 0);
    return $net < 0 ? -$net : 0;
}

$reimburse = 750_000;
$first = company_reimbursement_commit($reimburse, false);
assert_same($first["post"], true, "reimbursement posts with the link");
assert_same($first["plan"]["companyPayable"], $reimburse, "company payable paise");
assert_same($first["plan"]["personalReceivable"], $reimburse, "personal receivable paise");
assert_same($first["plan"]["singleDatabaseTransaction"], false, "personal book stays a separate store");
$books = company_books_apply_lines([], $first["lines"]);
assert_same(credit_balance($books, "REIMBURSEMENT_PAYABLE"), $reimburse, "posted payable");
assert_same(debit_balance($books, "REIMBURSEMENT_EXPENSE"), $reimburse, "posted reimbursement expense");
assert_same(debit_balance($books, "SALARY_LEDGER"), 0, "salary is not debited");
assert_same(isset($books["SALARY_LEDGER"]), false, "salary ledger is absent");

$second = company_reimbursement_commit($reimburse, true);
assert_same($second["post"], false, "second reimbursement does not post");
assert_same($second["lines"], [], "second reimbursement has no lines");
assert_same($second["plan"]["singleDatabaseTransaction"], false, "second plan stays two stores");
$books = company_books_apply_lines($books, $second["lines"]);
assert_same(debit_balance($books, "REIMBURSEMENT_EXPENSE"), $reimburse, "second call does not add expense");
assert_same(credit_balance($books, "REIMBURSEMENT_PAYABLE"), $reimburse, "payable stays the reimbursement amount");

$salaryBlocked = false;
try {
    company_reimbursement_voucher_lines($reimburse, "SALARY_LEDGER");
} catch (InvalidArgumentException $e) {
    $salaryBlocked = str_contains($e->getMessage(), "salary");
}
assert_same($salaryBlocked, true, "salary ledger is rejected");

$chequePaise = 2_500_000;
$issued = company_cheque_issue_lines($chequePaise);
assert_same($issued["state"], "issued", "cheque issue state");
assert_same($issued["bankDelta"], 0, "issue bank delta");
$bank = company_books_apply_lines([], $issued["lines"]);
assert_same($bank["BANK"] ?? 0, 0, "issue leaves the bank unchanged");
assert_same($bank["BANK_PRIMARY"] ?? 0, 0, "issue does not use the bank ledger");
assert_same(credit_balance($bank, "UNCLEARED_CHEQUE"), $chequePaise, "issue credits uncleared cheques");
assert_same(debit_balance($bank, "OTHER_EXPENSE"), $chequePaise, "issue debits the payment");

$cleared = company_cheque_clear_lines("issued", $chequePaise);
assert_same($cleared["post"], true, "clear posts once");
assert_same($cleared["state"], "cleared", "clear state");
assert_same($cleared["cashPostedAgain"], 0, "clear is the first bank movement");
assert_same($cleared["bankDelta"], -$chequePaise, "clear bank delta");
$bank = company_books_apply_lines($bank, $cleared["lines"]);
assert_same(credit_balance($bank, "BANK"), $chequePaise, "clear moves the bank by the cheque");
assert_same(credit_balance($bank, "UNCLEARED_CHEQUE"), 0, "clear releases the uncleared liability");

$clearedAgain = company_cheque_clear_lines("cleared", $chequePaise);
assert_same($clearedAgain["post"], false, "second clear does not post");
assert_same($clearedAgain["lines"], [], "second clear has no lines");
assert_same($clearedAgain["bankDelta"], 0, "second clear bank delta");
assert_same($clearedAgain["cashPostedAgain"], 0, "second clear posts no cash");
$bank = company_books_apply_lines($bank, $clearedAgain["lines"]);
assert_same(credit_balance($bank, "BANK"), $chequePaise, "bank moved only once");

$matched = company_cheque_match_effect($chequePaise, 0, "cleared");
assert_same($matched["cashPostedAgain"], 0, "matching a cleared cheque posts no cash");
assert_same($matched["postedCash"], $chequePaise, "matched principal stays 2500000 paise");
assert_same($matched["state"], "cleared", "match sees the cleared state");
assert_same(credit_balance($bank, "BANK"), $chequePaise, "match leaves the bank where clear put it");

$fee = 15_000;
$feeMatch = company_cheque_match_effect($chequePaise, $fee, "cleared");
assert_same($feeMatch["cashPostedAgain"], 0, "a fee does not repost the cheque");
assert_same($feeMatch["feeIsExplicitVoucher"], true, "fee is its own voucher");
assert_same($feeMatch["feeVoucherAmount"], $fee, "fee amount is not the cheque");
$withFee = company_books_apply_lines($bank, company_cheque_fee_lines($fee));
assert_same(credit_balance($withFee, "BANK") - credit_balance($bank, "BANK"), $fee, "fee voucher moves only the fee");

$bought = company_stock_commit(["qty" => 0, "value" => 0, "cogs" => 0, "revenue" => 0], "buy", 2, 10_000);
$sold = company_stock_commit($bought["state"], "sell", 1, 15_000);
assert_same($sold["state"]["qty"], 1, "one unit remains");
assert_same($sold["state"]["value"], 10_000, "remaining stock value");
assert_same($sold["state"]["cogs"], 10_000, "item cogs");
assert_same($sold["state"]["revenue"], 15_000, "item revenue");
$stock = company_books_apply_lines([], $bought["lines"]);
$stock = company_books_apply_lines($stock, $sold["lines"]);
assert_same(debit_balance($stock, "STOCK"), 10_000, "STOCK net paise");
assert_same(debit_balance($stock, "COGS"), 10_000, "COGS paise");
assert_same($stock["BANK"] ?? 0, 0, "buy and sell do not move the bank");

$collected = company_stock_commit($sold["state"], "collect", 0, 0, 15_000);
assert_same($collected["state"]["value"], 10_000, "collection leaves stock value");
assert_same($collected["state"]["cogs"], 10_000, "collection leaves cogs");
assert_same($collected["state"]["revenue"], 15_000, "collection does not repeat revenue");
$stock = company_books_apply_lines($stock, $collected["lines"]);
assert_same(debit_balance($stock, "STOCK"), 10_000, "collection leaves STOCK");
assert_same(debit_balance($stock, "COGS"), 10_000, "collection leaves COGS");
assert_same(debit_balance($stock, "BANK"), 15_000, "collection debits the bank");
assert_same(credit_balance($stock, "AR_CONTROL"), 15_000, "collection credits the receivable");

$golden = company_apply_weighted_average(company_stock_state(), "buy", 10, 100);
$golden = company_apply_weighted_average($golden, "sell", 4, 150);
assert_same($golden["qty"], 6, "golden qty");
assert_same($golden["value"], 600, "golden value");
assert_same($golden["cogs"], 400, "golden cogs");
$goldenBuy = company_stock_commit(company_stock_state(), "buy", 10, 100);
$goldenSell = company_stock_commit($goldenBuy["state"], "sell", 4, 150);
assert_same($goldenSell["state"]["qty"], 6, "posted golden qty");
assert_same($goldenSell["state"]["value"], 600, "posted golden value");
assert_same($goldenSell["state"]["cogs"], 400, "posted golden cogs");
$goldenBooks = company_books_apply_lines([], $goldenBuy["lines"]);
$goldenBooks = company_books_apply_lines($goldenBooks, $goldenSell["lines"]);
assert_same(debit_balance($goldenBooks, "STOCK"), 600, "golden STOCK net");
assert_same(debit_balance($goldenBooks, "COGS"), 400, "golden COGS");

echo "phase-sv-oracle-repairs ok\n";
