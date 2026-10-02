<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method === "GET") {
        company_parties_get();
    } elseif ($method === "PATCH" || $method === "PUT") {
        company_parties_update();
    } elseif ($method === "DELETE") {
        company_parties_delete();
    } elseif ($method === "POST") {
        // category / role attach
        company_party_categories_upsert();
    } else {
        json_error("Method not allowed", 405);
    }
} catch (Throwable $e) {
    company_handle_exception($e);
}
