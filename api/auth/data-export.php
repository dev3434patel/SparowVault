<?php
/**
 * /api/auth/data-export.php
 *
 * Phase 1 — DPDP Act 2023 / GDPR Article 20 data-portability endpoint.
 * Accepts POST (preferred — PIN re-entry in JSON body). GET is rejected
 * because we never want a PIN in URL or query-string.
 *
 * Body: { pin: "1234..." }
 */
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/account.php";

try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method !== "POST") {
        json_error("Use POST with { pin } in the body — GET would leak the PIN", 405, "METHOD_NOT_ALLOWED");
        exit;
    }
    account_data_export();
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
