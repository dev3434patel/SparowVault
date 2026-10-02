<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method === "GET") {
        company_memberships_list();
    } elseif ($method === "POST") {
        company_memberships_invite();
    } elseif ($method === "PATCH") {
        company_memberships_set_role_dispatch();
    } else {
        json_error("Method not allowed", 405);
    }
} catch (Throwable $e) {
    company_handle_exception($e);
}
