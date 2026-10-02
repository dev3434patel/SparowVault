<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

try {
    if (strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET")) !== "POST") {
        json_error("Method not allowed", 405);
        exit;
    }
    company_bridge_dispatch();
} catch (Throwable $e) {
    company_handle_exception($e);
}
