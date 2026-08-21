<?php

declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Request-Id");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");

if (($_SERVER["REQUEST_METHOD"] ?? "GET") === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/routes.php";

try {
    dispatch_request();
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}

