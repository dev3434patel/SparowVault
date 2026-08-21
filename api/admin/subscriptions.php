<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/admin.php";
try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method === "GET") {
        admin_subscriptions_list();
    } elseif ($method === "POST") {
        admin_subscription_action();
    } else {
        json_error("Method not allowed", 405);
        exit;
    }
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
