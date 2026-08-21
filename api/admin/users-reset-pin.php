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
    $newPin = (string)($body["newPin"] ?? "");
    if ($userId === "" || $newPin === "") {
        json_error("userId and newPin are required", 422, "VALIDATION_ERROR");
        return;
    }
    admin_reset_user_pin($userId, $newPin);
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
