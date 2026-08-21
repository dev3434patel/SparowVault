<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/policies.php";
try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "GET") {
        json_error("Method not allowed", 405); exit;
    }
    policies_current();
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
