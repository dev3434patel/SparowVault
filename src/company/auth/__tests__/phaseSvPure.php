<?php
declare(strict_types=1);

require_once __DIR__ . "/../../../../php/helpers/company/phase_sv_pure.php";

function assert_same($actual, $expected, string $label): void {
    if ($actual !== $expected) {
        fwrite(STDERR, $label . " expected " . var_export($expected, true) . " got " . var_export($actual, true) . "\n");
        exit(1);
    }
}

$split = company_cost_allocation_split(1000000, [
    ["costCentreId" => "a", "amountPaise" => 600000],
    ["costCentreId" => "b", "amountPaise" => 400000],
]);
assert_same($split["voucherTotalPaise"], 1000000, "voucher total");
assert_same($split["allocatedPaise"], 1000000, "allocated");

$invoice = company_invoice_then_settlement("sale", 1000000, 180000, 500000);
assert_same($invoice["receivableOrPayable"], 1180000, "receivable");
assert_same($invoice["outstanding"], 680000, "open");
assert_same($invoice["revenue"], 1000000, "revenue");

$stock = company_apply_weighted_average(company_stock_state(), "buy", 10, 100);
$stock = company_apply_weighted_average($stock, "sell", 4, 150);
assert_same($stock["qty"], 6, "qty");
assert_same($stock["value"], 600, "value");
assert_same($stock["cogs"], 400, "cogs");
$collected = company_customer_collection($stock, 600);
assert_same($collected["cogs"], 400, "cogs after collection");
assert_same($collected["revenue"], 600, "revenue after collection");

assert_same(company_payroll_action_permission("preview"), null, "payroll preview permission");
assert_same(company_payroll_action_permission("approve"), "create_journal", "payroll approve permission");
assert_same(company_payroll_action_permission("accrue"), "create_journal", "payroll accrue permission");
assert_same(company_payroll_action_permission("pay"), "create_journal", "payroll pay permission");

$pay = company_payroll_preview(30000);
assert_same($pay["expense"], 31800, "payroll expense");
assert_same($pay["netPayable"], 26000, "payroll net");
assert_same($pay["rates"], "unverified", "rates");

$gst = company_gst_workbench("validated", "export");
assert_same($gst["state"], "exported", "gst");
assert_same($gst["filed"], false, "filed");
$regimeBlocked = false;
try {
    company_gst_workbench("draft", "validate", "gstr-1");
} catch (InvalidArgumentException $e) {
    $regimeBlocked = str_contains($e->getMessage(), "Unsupported");
}
assert_same($regimeBlocked, true, "gst regime");

$cheque = company_cheque_match_effect(500000, 1000);
assert_same($cheque["cashPostedAgain"], 0, "cheque");
assert_same($cheque["feeIsExplicitVoucher"], true, "fee");

$books = [];
$reimburse = company_reimbursement_commit(750000, false);
assert_same($reimburse["post"], true, "reimburse post");
assert_same($reimburse["plan"]["singleDatabaseTransaction"], false, "reimburse stores");
assert_same($reimburse["plan"]["companyPayable"], 750000, "reimburse payable");
$books = company_books_apply_lines($books, $reimburse["lines"]);
assert_same($books["REIMBURSEMENT_PAYABLE"], -750000, "reimburse payable net");
assert_same($books["SALARY"] ?? 0, 0, "reimburse salary");
$again = company_reimbursement_commit(750000, true);
assert_same($again["post"], false, "reimburse once");
assert_same($again["lines"], [], "reimburse second lines");

$issued = company_cheque_issue_lines(2500000);
assert_same($issued["bankDelta"], 0, "cheque issue bank");
$books = company_books_apply_lines([], $issued["lines"]);
assert_same($books["BANK"] ?? 0, 0, "cheque issue bank net");
assert_same($books["UNCLEARED_CHEQUE"], -2500000, "cheque uncleared");
$cleared = company_cheque_clear_lines("issued", 2500000);
$books = company_books_apply_lines($books, $cleared["lines"]);
assert_same($books["BANK"], -2500000, "cheque clear bank");
assert_same($books["UNCLEARED_CHEQUE"], 0, "cheque cleared liability");
$secondClear = company_cheque_clear_lines("cleared", 2500000);
assert_same($secondClear["post"], false, "cheque clear once");
assert_same($secondClear["cashPostedAgain"], 0, "cheque clear cash");
$matched = company_cheque_match_effect(2500000, 0, "cleared");
assert_same($matched["cashPostedAgain"], 0, "cleared match");
$feeLines = company_cheque_fee_lines(100);
assert_same($feeLines[0]["ledger"] === "UNCLEARED_CHEQUE", false, "fee is not the principal");

$stockBefore = ["qty" => 0, "value" => 0, "cogs" => 0, "revenue" => 0];
$bought = company_stock_commit($stockBefore, "buy", 2, 10000);
$sold = company_stock_commit($bought["state"], "sell", 1, 15000);
$stockNets = company_books_apply_lines([], $bought["lines"]);
$stockNets = company_books_apply_lines($stockNets, $sold["lines"]);
assert_same($sold["state"]["qty"], 1, "audit stock qty");
assert_same($sold["state"]["value"], 10000, "audit stock value");
assert_same($stockNets["STOCK"], 10000, "audit STOCK net");
assert_same($stockNets["COGS"], 10000, "audit COGS");
$golden = company_stock_commit(["qty" => 0, "value" => 0, "cogs" => 0, "revenue" => 0], "buy", 10, 100);
$golden = company_stock_commit($golden["state"], "sell", 4, 150);
assert_same($golden["state"]["qty"], 6, "golden qty");
assert_same($golden["state"]["value"], 600, "golden value");
assert_same($golden["state"]["cogs"], 400, "golden cogs");
$collection = company_stock_commit($golden["state"], "collect", 0, 0, 600);
assert_same($collection["lines"][0]["ledger"], "BANK", "collection bank");
assert_same($collection["lines"][1]["ledger"], "AR_CONTROL", "collection receivable");

assert_same(company_backup_uses_server_dump(), false, "dump");
assert_same(company_recurring_template_draft([])["status"], "DRAFT", "draft");

$token = "abc";
$hash = company_invite_token_hash($token);
$once = company_invite_token_consume(["token_hash" => $hash, "used_at" => null], $token);
assert_same($once["ok"], true, "token");
$used = company_invite_token_consume(["token_hash" => $hash, "used_at" => "2026-01-01"], $token);
assert_same($used["ok"], false, "used token");

$blocked = company_books_change_impact(3, true, false);
assert_same($blocked["allowed"], false, "fy impact");
$allowed = company_books_change_impact(3, true, true);
assert_same($allowed["allowed"], true, "fy ack");
$fresh = company_books_change_impact(0, true, false);
assert_same($fresh["allowed"], true, "fy empty");

$preview = company_restore_preview([
    "companyId" => "source-co",
    "serverDump" => false,
    "sections" => ["ledgers" => [["company_id" => "source-co", "name" => "Cash"]]],
], "new-co");
assert_same($preview["writesSource"], false, "restore source");
assert_same($preview["applied"], false, "restore applied");
assert_same($preview["targetCompanyId"], "new-co", "restore target");

$plan = company_payroll_commit_plan($pay);
assert_same($plan["paymentRepeatsSalaryExpense"], false, "payroll payment");
assert_same($plan["compliant"], false, "payroll compliant");
assert_same($plan["payslip"]["net"], 26000, "payslip");
assert_same(company_payroll_rupees_to_paise(31800), 3180000, "payroll paise");

$tagged = company_party_tag_filter([
    ["tags" => ["farm"]],
    ["tags" => ["city"]],
], "farm");
assert_same(count($tagged), 1, "tag filter");

assert_same(company_normalize_branch_url("https://branch.example/a"), "https://branch.example/a", "branch url");
assert_same(company_normalize_item_kind("service"), "SERVICE", "item kind");

echo "phase-sv-pure ok\n";
