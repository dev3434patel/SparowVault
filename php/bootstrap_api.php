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

$path = parse_url($_SERVER["REQUEST_URI"] ?? "", PHP_URL_PATH);
$publicMutations = ["/api/auth/login.php", "/api/auth/admin-login.php", "/api/auth/register.php", "/api/cloud/login.php", "/api/cloud/register.php", "/api/payments/razorpay/webhook.php"];
if (!empty($_COOKIE["sv_auth"]) && !in_array($path, $publicMutations, true)) csrf_require_for_mutations();

$healthPaths = ["/api/health.php", "/api/healthz.php"];
if (!in_array($path, $healthPaths, true)) {
    try {
        validate_runtime_config();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 500, "ENV_VALIDATION_FAILED");
        exit;
    }
}
