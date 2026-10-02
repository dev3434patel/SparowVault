<?php
/**
 * TODO(release): delete after one production release once clients use workspace.php GET.
 * Deprecated compat shim — sets Deprecation header and delegates to canonical handler.
 */
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

header("Deprecation: true");
header("Sunset: Sat, 01 Nov 2026 00:00:00 GMT");
header("Link: </api/company/workspace.php>; rel=\"successor-version\"");
header("X-SparowVault-Deprecated-Endpoint: use GET /api/company/workspace.php");

try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "GET") {
        json_error("Method not allowed", 405);
        exit;
    }
    company_workspaces_get();
} catch (Throwable $e) {
    company_handle_exception($e);
}
