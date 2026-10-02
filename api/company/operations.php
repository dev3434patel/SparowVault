<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

$op = strtolower((string)($_GET["op"] ?? ""));
$map = [
    "profile" => "company_workspaces_update_dispatch",
    "role" => "company_memberships_set_role_dispatch",
    "invite-token" => "company_invite_tokens_dispatch",
    "ledger" => "company_ledgers_mutate_dispatch",
    "documents" => "company_documents_dispatch",
    "invoice" => "company_invoice_draft_dispatch",
    "recurring" => "company_recurring_dispatch",
    "groups" => "company_groups_dispatch",
    "bridge" => "company_bridge_dispatch",
    "subscription" => "company_org_subscription_dispatch",
    "gst" => "company_gst_dispatch",
    "payroll" => "company_payroll_dispatch",
    "cheque" => "company_cheque_dispatch",
];

try {
    if (!isset($map[$op])) {
        json_error("Unknown company operation", 404);
        exit;
    }
    $map[$op]();
} catch (Throwable $e) {
    company_handle_exception($e);
}
