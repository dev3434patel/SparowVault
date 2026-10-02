<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

try {
    $method = strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET"));
    if ($method === "GET") {
        company_ledgers_list();
    } elseif ($method === "POST") {
        company_ledgers_mutate_dispatch();
    } else {
        json_error("Method not allowed", 405);
    }
} catch (Throwable $e) {
    company_handle_exception($e);
}
