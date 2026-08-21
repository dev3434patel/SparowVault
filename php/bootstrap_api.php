<?php
declare(strict_types=1);

require_once __DIR__ . "/helpers/request_id.php";
ensure_request_id();

require_once __DIR__ . "/helpers/security.php";
apply_cors_headers();
apply_security_headers();

if (($_SERVER["REQUEST_METHOD"] ?? "GET") === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/helpers/http.php";
require_once __DIR__ . "/helpers/app.php";

try {
    validate_runtime_config();
} catch (Throwable $e) {
    json_error($e->getMessage(), 500, "ENV_VALIDATION_FAILED");
    exit;
}
