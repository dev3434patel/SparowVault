<?php
/**
 * /api/auth/logout.php
 *
 * Phase 1 — clears the httpOnly auth cookie used by cloud auth.
 */
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/cloud.php";

try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method !== "POST") {
        json_error("Use POST to log out", 405, "METHOD_NOT_ALLOWED");
        exit;
    }
    cloud_logout();
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
