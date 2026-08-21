<?php
/**
 * /api/auth/account.php
 *
 * Phase 1 — DPDP Act 2023 / GDPR Article 17 right-to-erasure endpoint.
 *
 * DELETE with { pin, reason? } in the JSON body deletes the authenticated
 * account: cancels subscriptions, soft-deletes the user row, audit-logs
 * the action. Cascading hard-delete of cloud_collection_rows is preserved
 * for admin tooling so finance / compliance can reconcile within the
 * retention window before the row is purged.
 */
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/account.php";

try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method !== "DELETE" && $method !== "POST") {
        json_error("Use DELETE (or POST) with { pin } in the body", 405, "METHOD_NOT_ALLOWED");
        exit;
    }
    account_delete();
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
