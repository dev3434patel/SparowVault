<?php
declare(strict_types=1);

require_once __DIR__ . "/../helpers/company/phase_sv_pure.php";

function golden_assert(bool $ok, string $message): void {
    if (!$ok) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok {$message}\n";
}

$split = company_cost_allocation_split(10000, [
    ["costCentreId" => "cc-a", "amountPaise" => 6000],
    ["costCentreId" => "cc-b", "amountPaise" => 4000],
]);
golden_assert($split["allocatedPaise"] === 10000, "allocation sums to 10000");
golden_assert($split["voucherTotalPaise"] === 10000, "voucher total stays 10000");

$sale = company_invoice_then_settlement("sale", 10000, 1800, 5000);
golden_assert($sale["receivableOrPayable"] === 11800, "receivable 11800");
golden_assert($sale["outstanding"] === 6800, "outstanding 6800");
golden_assert($sale["revenue"] === 10000 && $sale["revenueAfterSettlement"] === 10000, "revenue unchanged");

$cheque = company_cheque_match_effect(25000, 150);
golden_assert($cheque["cashPostedAgain"] === 0 && $cheque["feeIsExplicitVoucher"] === true, "cheque match posts no extra cash");

$stock = company_apply_weighted_average(company_stock_state(), "buy", 10, 100);
$stock = company_apply_weighted_average($stock, "sell", 4, 150);
golden_assert($stock["qty"] === 6 && $stock["value"] === 600 && $stock["cogs"] === 400, "weighted average qty 6 value 600 cogs 400");
golden_assert($stock["stockLedger"] === "STOCK", "STOCK control ledger");
$collected = company_customer_collection($stock, 600);
golden_assert($collected["revenue"] === $stock["revenue"] && $collected["cogs"] === $stock["cogs"], "collection does not repeat revenue or COGS");

$payroll = company_payroll_preview(30000);
golden_assert($payroll["expense"] === 31800 && $payroll["netPayable"] === 26000, "payroll expense 31800 net 26000");
golden_assert($payroll["rates"] === "unverified", "payroll rates unverified");
$payment = company_payroll_payment_lines($payroll);
golden_assert($payment["repeatsSalaryExpense"] === false, "payroll payment does not expense salary twice");

$gst = company_gst_workbench("validated", "export");
golden_assert($gst["state"] === "exported" && $gst["filed"] === false && $gst["irn"] === null, "GST export is not filed");

$group = company_group_management_totals(
    [["companyId" => "a", "total" => 100], ["companyId" => "b", "total" => 40]],
    [["fromCompanyId" => "a", "toCompanyId" => "b", "amount" => 15]]
);
golden_assert($group["managementTotal"] === 125 && $group["statutoryConsolidation"] === false, "group management total");

$token = "plain-token-once";
$hash = company_invite_token_hash($token);
$once = company_invite_token_consume(["token_hash" => $hash, "used_at" => null], $token);
$twice = company_invite_token_consume(["token_hash" => $hash, "used_at" => "2026-09-30"], $token);
golden_assert($once["ok"] === true && $twice["ok"] === false, "invite token is one-use");

golden_assert(company_owner_count_after_role_change([["id" => "m1", "roles" => ["OWNER"]]], "m1", "VIEWER") === 0, "last owner");
golden_assert(company_normalize_party_type("organization") === "ORGANIZATION", "organization party");
golden_assert(company_document_download_status(true, true, false) === 404, "missing document file is 404");
golden_assert(company_document_hosting_status(262145) === "BLOCKED_EXTERNAL", "large document hosting blocked");
golden_assert(company_backup_uses_server_dump() === false, "backup is not a server dump");
$stripped = company_backup_strip_secrets(["display_name" => "Acme", "pin" => "1234"]);
golden_assert(!isset($stripped["pin"]) && $stripped["display_name"] === "Acme", "backup strips pin");
golden_assert(company_recurring_template_draft([])["status"] === "DRAFT", "recurring template defaults to draft");
golden_assert(company_recurring_run_decision("2026-09-01", null, true)["reason"] === "IDEMPOTENT", "recurring runner is idempotent");
golden_assert(company_recurring_run_decision("2026-09-01", null, false)["bankPayment"] === false, "due date is not a bank payment");
$plan = company_reimbursement_plan(5000);
golden_assert($plan["singleDatabaseTransaction"] === false && $plan["companyPayable"] === 5000, "reimbursement is two legs");
golden_assert(company_bridge_transition("proposed", "fail") === "retry", "bridge retry is visible");

try {
    company_org_subscription_from_fixture(["source" => "razorpay", "subject" => "company_org_subscriptions", "planCode" => "x"]);
    golden_assert(false, "live razorpay must throw");
} catch (InvalidArgumentException $e) {
    golden_assert(str_contains($e->getMessage(), "untested"), "live razorpay untested");
}

echo "PHP company phase goldens passed\n";
