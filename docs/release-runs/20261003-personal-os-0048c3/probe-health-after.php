<?php
declare(strict_types=1);

require_once __DIR__ . "/../../../php/helpers/http.php";
require_once __DIR__ . "/../../../php/helpers/app.php";
require_once __DIR__ . "/../../../php/controllers/public_config.php";

function set_env(string $key, string $value): void {
    putenv($key . "=" . $value);
    $_ENV[$key] = $value;
}

function clear_env(string $key): void {
    putenv($key);
    unset($_ENV[$key]);
}

$mode = $argv[1] ?? "absent";
foreach (["DATABASE_URL", "DB_HOST", "DB_NAME", "DB_USER", "DB_PASS", "DB_PORT", "CLOUD_JWT_SECRET", "APP_ENV"] as $key) {
    clear_env($key);
}

if ($mode === "absent") {
    $_SERVER["REQUEST_URI"] = "/api/health.php";
    ob_start();
    $blocked = health_block_unready();
    $body = ob_get_clean();
    echo json_encode(["mode" => $mode, "blocked" => $blocked, "http" => http_response_code(), "body" => json_decode($body, true)], JSON_UNESCAPED_SLASHES), "\n";
    exit($blocked ? 0 : 1);
}

set_env("CLOUD_JWT_SECRET", "sv-rp01-probe-not-a-deployed-secret");
set_env("CLOUD_JWT_EXPIRES_IN", "2h");
set_env("DB_HOST", "127.0.0.1");
set_env("DB_USER", "root");
set_env("DB_PASS", "");
set_env("AUDIT_RUN_SENTINEL", "rp01-20261003-personal-os-0048c3");

if ($mode === "production-owner-decision") {
    set_env("APP_ENV", "production");
    set_env("DB_PORT", "1");
    set_env("DB_NAME", "sparowvault");
    $decision = health_configuration_decision();
    echo json_encode([
        "mode" => $mode,
        "decision" => $decision,
        "connected" => false,
        "destructive" => destructive_database_target_decision(),
    ], JSON_UNESCAPED_SLASHES), "\n";
    exit($decision["outcome"] === "ready" ? 0 : 1);
}

if ($mode === "db-down") {
    set_env("APP_ENV", "production");
    set_env("DB_PORT", "1");
    set_env("DB_NAME", "sparowvault_test");
    $_SERVER["REQUEST_URI"] = "/api/health.php";
    ob_start();
    health_check_get();
    $body = ob_get_clean();
    $decoded = json_decode($body, true);
    echo json_encode(["mode" => $mode, "http" => http_response_code(), "body" => $decoded], JSON_UNESCAPED_SLASHES), "\n";
    $status = $decoded["data"]["status"] ?? "";
    exit(http_response_code() === 200 || $status === "healthy" ? 1 : 0);
}

if ($mode === "production-live") {
    set_env("APP_ENV", "production");
    set_env("DB_PORT", "3306");
    set_env("DB_NAME", "sparowvault_test");
    $_SERVER["REQUEST_URI"] = "/api/health.php";
    ob_start();
    health_check_get();
    $body = ob_get_clean();
    $decoded = json_decode($body, true);
    echo json_encode(["mode" => $mode, "http" => http_response_code(), "body" => $decoded], JSON_UNESCAPED_SLASHES), "\n";
    exit((http_response_code() === 200 && ($decoded["data"]["status"] ?? "") === "healthy") ? 0 : 1);
}

fwrite(STDERR, "unknown mode\n");
exit(2);
