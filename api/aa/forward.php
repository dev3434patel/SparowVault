<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/aa.php";
try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") {
        header("Allow: POST");
        json_error("Method not allowed", 405, "METHOD_NOT_ALLOWED");
        exit;
    }
    aa_forward();
} catch (Throwable $error) {
    error_log("[aa_forward] " . get_class($error));
    json_error("Account Aggregator request failed. Nothing was imported.", 500, "AA_FORWARD_FAILED");
}
