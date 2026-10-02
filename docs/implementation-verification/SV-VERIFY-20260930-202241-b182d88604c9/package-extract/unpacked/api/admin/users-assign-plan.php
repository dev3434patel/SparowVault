<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/admin.php";
try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") {
        json_error("Method not allowed", 405);
        exit;
    }
    $body = require_json_body();
    $userId = (string)($body["userId"] ?? "");
    $planId = (int)($body["planId"] ?? 0);
    if ($userId === "") {
        json_error("userId is required", 422, "VALIDATION_ERROR");
        return;
    }
    admin_assign_plan($userId, $planId);
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
