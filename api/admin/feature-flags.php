<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/admin.php";
try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method === "GET") admin_feature_flags_get();
    elseif ($method === "PUT" || $method === "POST") admin_feature_flags_put();
    else json_error("Method not allowed", 405);
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
