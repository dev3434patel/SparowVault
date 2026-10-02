<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/aa.php";
try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "GET") {
        header("Allow: GET");
        json_error("Method not allowed", 405, "METHOD_NOT_ALLOWED");
        exit;
    }
    aa_status();
} catch (Throwable $error) {
    error_log("[aa_status] " . get_class($error));
    json_error("Account Aggregator status could not be checked. Nothing was imported.", 500, "AA_STATUS_FAILED");
}
