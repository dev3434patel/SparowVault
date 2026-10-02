<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

try {
    $method = strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET"));
    if ($method !== "GET" && $method !== "POST") {
        json_error("Method not allowed", 405);
        exit;
    }
    company_items_dispatch();
} catch (Throwable $e) {
    company_handle_exception($e);
}
