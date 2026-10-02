<?php
declare(strict_types=1);

/**
 * Pure company-book rules for SV14–SV29.
 * Currency amounts are whatever integer unit the caller passes (the goldens use the spec's whole units).
 * Persisted vouchers store paise. STOCK is the inventory control ledger.
 * Costing method: weighted average.
 *
 * BLOCKED_EXTERNAL (not done here):
 * - durable document hosting beyond the local metadata cap
 * - live bank cheque feeds
 * - GST portal filing and IRN
 * - verified statutory payroll rates
 * - live Razorpay delivery
 */

function company_owner_count_after_role_change(array $members, string $membershipId, string $nextRole): int {
    $nextRole = strtoupper($nextRole);
    $count = 0;
    $seen = false;
    foreach ($members as $member) {
        if (!is_array($member)) {
            continue;
        }
        $isTarget = (string)($member["id"] ?? "") === $membershipId;
        if ($isTarget) {
            $seen = true;
        }
        $roles = $isTarget ? [$nextRole] : (array)($member["roles"] ?? []);
        foreach ($roles as $role) {
            if (strtoupper((string)$role) === "OWNER") {
                $count++;
                break;
            }
        }
    }
    if (!$seen && $nextRole === "OWNER") {
        $count++;
    }
    return $count;
}

function company_invite_token_hash(string $token): string {
    return hash("sha256", $token);
}

/**
 * One-use check. Does not store the raw token.
 *
 * @param array{token_hash:string,used_at?:string|null} $stored
 * @return array{ok:bool,error:?string}
 */
function company_invite_token_consume(array $stored, string $token): array {
    $hash = company_invite_token_hash($token);
    if (!hash_equals((string)($stored["token_hash"] ?? ""), $hash)) {
        return ["ok" => false, "error" => "TOKEN_MISMATCH"];
    }
    if (!empty($stored["used_at"])) {
        return ["ok" => false, "error" => "TOKEN_USED"];
    }
    return ["ok" => true, "error" => null];
}

function company_normalize_party_type(string $raw): string {
    $value = strtoupper(trim($raw));
    if ($value === "" || $value === "PERSON") {
        return "PERSON";
    }
    if (in_array($value, ["ORGANIZATION", "ORGANISATION", "BUSINESS", "ORG"], true)) {
        return "ORGANIZATION";
    }
    throw new InvalidArgumentException("partyType must be PERSON or ORGANIZATION");
}

/**
 * Allocations describe the line. They are not added to the voucher total.
 *
 * @param list<array<string,mixed>> $parts
 * @return array{linePaise:int,allocatedPaise:int,voucherTotalPaise:int,parts:list<array{costCentreId:string,amountPaise:int}>}
 */
function company_cost_allocation_split(int $lineAmount, array $parts): array {
    if ($lineAmount <= 0) {
        throw new InvalidArgumentException("Line amount must be positive");
    }
    $sum = 0;
    $out = [];
    foreach ($parts as $part) {
        if (!is_array($part)) {
            throw new InvalidArgumentException("Invalid allocation");
        }
        $amount = (int)($part["amountPaise"] ?? $part["amount"] ?? 0);
        $costCentreId = (string)($part["costCentreId"] ?? "");
        if ($costCentreId === "" || $amount <= 0) {
            throw new InvalidArgumentException("Allocation needs a cost centre and a positive amount");
        }
        $sum += $amount;
        $out[] = ["costCentreId" => $costCentreId, "amountPaise" => $amount];
    }
    if ($out !== [] && $sum !== $lineAmount) {
        throw new InvalidArgumentException("Cost allocations must sum to the line amount");
    }
    return [
        "linePaise" => $lineAmount,
        "allocatedPaise" => $sum,
        "voucherTotalPaise" => $lineAmount,
        "parts" => $out,
    ];
}

function company_document_relative_key(string $companyId, string $docId): string {
    if (!preg_match('/^[A-Za-z0-9_-]{1,191}$/', $companyId) || !preg_match('/^[A-Za-z0-9_-]{1,191}$/', $docId)) {
        throw new InvalidArgumentException("Invalid document key");
    }
    return "storage/company-documents/{$companyId}/{$docId}";
}

function company_document_key_outside_public_web(string $key): bool {
    if (str_contains($key, "..")) {
        return false;
    }
    if (str_starts_with($key, "public/") || str_starts_with($key, "api/") || str_starts_with($key, "/")) {
        return false;
    }
    return str_starts_with($key, "storage/company-documents/");
}

function company_document_download_status(bool $authenticated, bool $metadataExists, bool $fileExists): int {
    if (!$authenticated) {
        return 401;
    }
    if (!$metadataExists || !$fileExists) {
        return 404;
    }
    return 200;
}

function company_document_hosting_status(int $sizeBytes): string {
    if ($sizeBytes > 262144) {
        return "BLOCKED_EXTERNAL";
    }
    return "local";
}

/**
 * Invoice and its receipt/payment are two vouchers. Tax here is arithmetic only.
 *
 * @return array<string,mixed>
 */
function company_invoice_then_settlement(string $kind, int $base, int $tax, int $settlement): array {
    if (!in_array($kind, ["sale", "purchase"], true)) {
        throw new InvalidArgumentException("kind must be sale or purchase");
    }
    if ($base < 0 || $tax < 0 || $settlement < 0) {
        throw new InvalidArgumentException("Amounts must be >= 0");
    }
    $balance = $base + $tax;
    if ($settlement > $balance) {
        throw new InvalidArgumentException("Settlement exceeds the invoice");
    }
    $revenue = $kind === "sale" ? $base : 0;
    $expense = $kind === "purchase" ? $base : 0;
    return [
        "kind" => $kind,
        "receivableOrPayable" => $balance,
        "outstanding" => $balance - $settlement,
        "revenue" => $revenue,
        "revenueAfterSettlement" => $revenue,
        "expense" => $expense,
        "expenseAfterSettlement" => $expense,
        "hypotheticalTax" => true,
        "settlementIsSeparateVoucher" => true,
    ];
}

/** Matching a posted cheque does not post cash again. A fee is its own voucher. */
function company_cheque_match_effect(int $postedCash, int $fee): array {
    if ($postedCash < 0 || $fee < 0) {
        throw new InvalidArgumentException("Amounts must be >= 0");
    }
    return [
        "postedCash" => $postedCash,
        "cashPostedAgain" => 0,
        "feeVoucherAmount" => $fee,
        "feeIsExplicitVoucher" => $fee > 0,
    ];
}

function company_recurring_template_draft(array $template): array {
    $template["status"] = "DRAFT";
    $template["bankPaymentOnDueDate"] = false;
    return $template;
}

/**
 * A due date is not a bank payment. A repeated key does not create a second draft.
 *
 * @return array{post:bool,reason:?string,status:string,bankPayment:bool}
 */
function company_recurring_run_decision(string $runDate, ?string $lockBefore, bool $alreadyRan): array {
    if ($alreadyRan) {
        return ["post" => false, "reason" => "IDEMPOTENT", "status" => "DRAFT", "bankPayment" => false];
    }
    if ($lockBefore !== null && $lockBefore !== "" && $runDate < $lockBefore) {
        return ["post" => false, "reason" => "PERIOD_LOCKED", "status" => "DRAFT", "bankPayment" => false];
    }
    return ["post" => true, "reason" => null, "status" => "DRAFT", "bankPayment" => false];
}

/** @return list<string> */
function company_backup_secret_key_list(): array {
    return [
        "pin", "password", "password_hash", "pin_hash", "passwd",
        "token", "token_hash", "invite_token", "secret", "api_key",
        "webhook_secret", "session_token", "request_hash", "response_json",
    ];
}

function company_backup_strip_secrets(array $row): array {
    $deny = array_flip(company_backup_secret_key_list());
    $out = [];
    foreach ($row as $key => $value) {
        if (isset($deny[strtolower((string)$key)])) {
            continue;
        }
        if (is_array($value)) {
            $value = company_backup_strip_secrets($value);
        }
        $out[$key] = $value;
    }
    return $out;
}

function company_backup_uses_server_dump(): bool {
    return false;
}

/** @param list<array<string,mixed>> $rows */
function company_backup_scope_ok(array $rows, string $companyId): bool {
    foreach ($rows as $row) {
        if (isset($row["company_id"]) && (string)$row["company_id"] !== $companyId) {
            return false;
        }
    }
    return true;
}

/** @return array{qty:int,value:int,cogs:int,revenue:int,method:string,stockLedger:string} */
function company_stock_state(): array {
    return [
        "qty" => 0,
        "value" => 0,
        "cogs" => 0,
        "revenue" => 0,
        "method" => "weighted-average",
        "stockLedger" => "STOCK",
    ];
}

/**
 * Weighted-average costing. STOCK stays the control ledger.
 *
 * @param array{qty:int,value:int,cogs:int,revenue:int,method?:string,stockLedger?:string} $state
 * @return array{qty:int,value:int,cogs:int,revenue:int,method:string,stockLedger:string}
 */
function company_apply_weighted_average(array $state, string $event, int $qty, int $unit): array {
    if ($qty <= 0 || $unit < 0) {
        throw new InvalidArgumentException("Quantity must be positive");
    }
    $next = [
        "qty" => (int)$state["qty"],
        "value" => (int)$state["value"],
        "cogs" => (int)$state["cogs"],
        "revenue" => (int)$state["revenue"],
        "method" => "weighted-average",
        "stockLedger" => "STOCK",
    ];
    if ($event === "buy") {
        $next["qty"] += $qty;
        $next["value"] += $qty * $unit;
        return $next;
    }
    if ($event === "sell") {
        if ($qty > $next["qty"] || $next["qty"] === 0 || $next["value"] % $next["qty"] !== 0) {
            throw new InvalidArgumentException("Sell quantity exceeds stock or average cost is not a whole unit");
        }
        $cogs = intdiv($next["value"], $next["qty"]) * $qty;
        $next["qty"] -= $qty;
        $next["value"] -= $cogs;
        $next["cogs"] += $cogs;
        $next["revenue"] += $qty * $unit;
        return $next;
    }
    throw new InvalidArgumentException("Stock event must be buy or sell");
}

/**
 * Customer collection hits bank and receivable only.
 *
 * @param array{qty:int,value:int,cogs:int,revenue:int} $state
 */
function company_customer_collection(array $state, int $amount): array {
    if ($amount <= 0) {
        throw new InvalidArgumentException("Collection amount must be positive");
    }
    return [
        "qty" => (int)$state["qty"],
        "value" => (int)$state["value"],
        "cogs" => (int)$state["cogs"],
        "revenue" => (int)$state["revenue"],
        "stockLedger" => "STOCK",
        "collection" => [
            "amount" => $amount,
            "repeatsRevenue" => false,
            "repeatsCogs" => false,
            "lines" => [
                ["ledger" => "BANK", "side" => "DEBIT", "amount" => $amount],
                ["ledger" => "AR_CONTROL", "side" => "CREDIT", "amount" => $amount],
            ],
        ],
    ];
}

/** @return array{state:string,filed:bool,irn:null,regime:string} */
function company_gst_workbench(string $state, string $action, string $regime = "hypothetical"): array {
    $regime = strtolower(trim($regime));
    if ($regime !== "hypothetical") {
        throw new InvalidArgumentException("Unsupported GST regime stays blocked. No IRN is issued.");
    }
    if ($action === "file") {
        throw new InvalidArgumentException("Exported is not filed. No IRN is issued.");
    }
    if ($action === "validate") {
        if ($state !== "draft") {
            throw new InvalidArgumentException("Validate starts from draft");
        }
        return ["state" => "validated", "filed" => false, "irn" => null, "regime" => $regime];
    }
    if ($action === "export") {
        if ($state !== "validated") {
            throw new InvalidArgumentException("Export starts from validated");
        }
        return ["state" => "exported", "filed" => false, "irn" => null, "regime" => $regime];
    }
    throw new InvalidArgumentException("Unknown GST action");
}

/**
 * Preview is a read. Approval, accrual, and payment write the books and need create_journal.
 * Membership alone is not that permission.
 */
function company_payroll_action_permission(string $action): ?string {
    $action = strtolower(trim($action));
    if ($action === "preview") {
        return null;
    }
    if (in_array($action, ["approve", "accrue", "pay"], true)) {
        return "create_journal";
    }
    throw new InvalidArgumentException("Payroll action must be preview, approve, accrue, or pay");
}

/** Synthetic gross 30000 only. Rates are unverified. */
function company_payroll_preview(int $gross): array {
    if ($gross !== 30000) {
        throw new InvalidArgumentException("Payroll preview uses synthetic gross 30000 only. Rates are unverified.");
    }
    $deductions = 3000 + 1000;
    $employer = 1800;
    return [
        "gross" => $gross,
        "employeeDeductions" => $deductions,
        "employer" => $employer,
        "expense" => $gross + $employer,
        "netPayable" => $gross - $deductions,
        "rates" => "unverified",
    ];
}

function company_payroll_accrual_lines(array $preview): array {
    return [
        ["ledger" => "SALARY_LEDGER", "side" => "DEBIT", "amount" => (int)$preview["expense"]],
        ["ledger" => "STATUTORY_DEDUCTIONS", "side" => "CREDIT", "amount" => (int)$preview["employeeDeductions"]],
        ["ledger" => "EMPLOYER_LIABILITY", "side" => "CREDIT", "amount" => (int)$preview["employer"]],
        ["ledger" => "SALARY_PAYABLE", "side" => "CREDIT", "amount" => (int)$preview["netPayable"]],
    ];
}

/** Payment clears the payable. It does not debit salary expense again. */
function company_payroll_payment_lines(array $preview): array {
    return [
        "repeatsSalaryExpense" => false,
        "lines" => [
            ["ledger" => "SALARY_PAYABLE", "side" => "DEBIT", "amount" => (int)$preview["netPayable"]],
            ["ledger" => "BANK", "side" => "CREDIT", "amount" => (int)$preview["netPayable"]],
        ],
    ];
}

function company_bridge_transition(string $state, string $event): string {
    $allowed = [
        "proposed" => ["post_company" => "company_posted", "fail" => "retry"],
        "company_posted" => ["apply_personal" => "personal_applied", "fail" => "retry"],
        "personal_applied" => ["complete" => "completed", "fail" => "retry"],
        "retry" => ["post_company" => "company_posted", "apply_personal" => "personal_applied"],
        "completed" => [],
    ];
    if (!isset($allowed[$state][$event])) {
        throw new InvalidArgumentException("Bridge cannot move from {$state} on {$event}");
    }
    return $allowed[$state][$event];
}

/** One company payable and one personal receivable. Not one transaction across both stores. */
function company_reimbursement_plan(int $amount): array {
    if ($amount <= 0) {
        throw new InvalidArgumentException("Reimbursement amount must be positive");
    }
    return [
        "companyPayable" => $amount,
        "personalReceivable" => $amount,
        "singleDatabaseTransaction" => false,
        "stores" => ["mysql", "indexeddb"],
    ];
}

function company_org_subscription_from_fixture(array $fixture): array {
    if (($fixture["source"] ?? "") !== "local-fixture") {
        throw new InvalidArgumentException("Live Razorpay delivery is untested");
    }
    if (($fixture["subject"] ?? "") !== "company_org_subscriptions") {
        throw new InvalidArgumentException("Company billing subject is company_org_subscriptions");
    }
    $status = (string)($fixture["status"] ?? "TRIAL");
    if (!in_array($status, ["ACTIVE", "PAST_DUE", "CANCELLED", "TRIAL"], true)) {
        throw new InvalidArgumentException("Invalid subscription status");
    }
    $plan = trim((string)($fixture["planCode"] ?? ""));
    if ($plan === "") {
        throw new InvalidArgumentException("planCode required");
    }
    return [
        "subject" => "company_org_subscriptions",
        "planCode" => $plan,
        "status" => $status,
        "personalSubscriptionUntouched" => true,
        "source" => "local-fixture",
    ];
}

/**
 * Management sum only. Elimination runs when the caller matches a pair.
 * No statutory consolidation.
 *
 * @param list<array{companyId:string,total:int}> $companyTotals
 * @param list<array{fromCompanyId:string,toCompanyId:string,amount:int}> $matchedPairs
 */
function company_group_management_totals(array $companyTotals, array $matchedPairs): array {
    $sum = 0;
    $ids = [];
    foreach ($companyTotals as $row) {
        $sum += (int)$row["total"];
        $ids[(string)$row["companyId"]] = true;
    }
    $eliminated = 0;
    foreach ($matchedPairs as $pair) {
        $from = (string)($pair["fromCompanyId"] ?? "");
        $to = (string)($pair["toCompanyId"] ?? "");
        if ($from === "" || $to === "" || !isset($ids[$from], $ids[$to])) {
            throw new InvalidArgumentException("Elimination pair must be two companies in the group");
        }
        $eliminated += (int)$pair["amount"];
    }
    return [
        "managementTotal" => $sum - $eliminated,
        "eliminated" => $eliminated,
        "statutoryConsolidation" => false,
        "automaticElimination" => false,
    ];
}

/**
 * A financial-year or books-start change after postings needs an explicit impact acknowledgement.
 * The change does not rewrite posted vouchers.
 *
 * @return array{allowed:bool,postedVouchers:int,requiresAcknowledgement:bool}
 */
function company_books_change_impact(int $postedCount, bool $periodChanged, bool $acknowledged): array {
    if ($postedCount < 0) {
        throw new InvalidArgumentException("Posted voucher count cannot be negative");
    }
    $needs = $periodChanged && $postedCount > 0;
    if ($needs && !$acknowledged) {
        return ["allowed" => false, "postedVouchers" => $postedCount, "requiresAcknowledgement" => true];
    }
    return ["allowed" => true, "postedVouchers" => $postedCount, "requiresAcknowledgement" => false];
}

/** https or http only. Empty means no URL. */
function company_normalize_branch_url(mixed $url): ?string {
    if ($url === null) {
        return null;
    }
    $url = trim((string)$url);
    if ($url === "") {
        return null;
    }
    if (strlen($url) > 512 || !preg_match('#^https?://#i', $url)) {
        throw new InvalidArgumentException("Branch URL must start with http:// or https://");
    }
    return $url;
}

/**
 * Preview a backup into a new company. Does not write the source company.
 *
 * @param array<string,mixed> $pack
 * @return array{sourceCompanyId:string,targetCompanyId:string,writesSource:bool,applied:bool,sectionCounts:array<string,int>}
 */
function company_restore_preview(array $pack, string $newCompanyId): array {
    if (company_backup_uses_server_dump() || !empty($pack["serverDump"])) {
        throw new InvalidArgumentException("Restore refuses a server dump");
    }
    $source = (string)($pack["companyId"] ?? "");
    if ($source === "" || $newCompanyId === "" || $newCompanyId === $source) {
        throw new InvalidArgumentException("Restore preview needs a different company id");
    }
    $sections = is_array($pack["sections"] ?? null) ? $pack["sections"] : [];
    $counts = [];
    foreach ($sections as $name => $rows) {
        if (!is_array($rows)) {
            throw new InvalidArgumentException("Restore section must be a list");
        }
        if ($name !== "workspace" && !company_backup_scope_ok($rows, $source)) {
            throw new InvalidArgumentException("Restore preview refused a row from another company");
        }
        $counts[(string)$name] = count($rows);
    }
    return [
        "sourceCompanyId" => $source,
        "targetCompanyId" => $newCompanyId,
        "writesSource" => false,
        "applied" => false,
        "sectionCounts" => $counts,
    ];
}

/**
 * Approval stores accrual, a payslip, and a later payment.
 * The payment debits the payable. It does not debit salary expense again.
 *
 * @param array{gross:int,employeeDeductions:int,employer:int,expense:int,netPayable:int,rates:string} $preview
 */
function company_normalize_item_kind(string $kind): string {
    $kind = strtoupper(trim($kind));
    if (!in_array($kind, ["STOCK", "NON_STOCK", "SERVICE"], true)) {
        throw new InvalidArgumentException("Item kind must be STOCK, NON_STOCK, or SERVICE");
    }
    return $kind;
}

/** Synthetic rupees become paise at 100 paise per rupee. */
function company_payroll_rupees_to_paise(int $rupees): int {
    if ($rupees < 0) {
        throw new InvalidArgumentException("Payroll amount cannot be negative");
    }
    return $rupees * 100;
}

function company_payroll_commit_plan(array $preview): array {
    $payment = company_payroll_payment_lines($preview);
    $repeats = false;
    foreach ($payment["lines"] as $line) {
        if (($line["ledger"] ?? "") === "SALARY_LEDGER" && ($line["side"] ?? "") === "DEBIT") {
            $repeats = true;
        }
    }
    return [
        "approved" => true,
        "rates" => "unverified",
        "compliant" => false,
        "accrual" => company_payroll_accrual_lines($preview),
        "payslip" => [
            "gross" => (int)$preview["gross"],
            "deductions" => (int)$preview["employeeDeductions"],
            "net" => (int)$preview["netPayable"],
            "rates" => "unverified",
        ],
        "payment" => $payment,
        "paymentRepeatsSalaryExpense" => $repeats,
    ];
}

/**
 * @param list<array{tags?:list<string>}> $parties
 * @return list<array{tags?:list<string>}>
 */
function company_party_tag_filter(array $parties, string $tag): array {
    $needle = strtolower(trim($tag));
    if ($needle === "") {
        return array_values($parties);
    }
    $out = [];
    foreach ($parties as $party) {
        foreach ($party["tags"] ?? [] as $name) {
            if (strtolower((string)$name) === $needle) {
                $out[] = $party;
                break;
            }
        }
    }
    return $out;
}
