<?php
declare(strict_types=1);

/**
 * Probes health configuration without opening a database.
 * mode=absent clears the secret and database. mode=refused sets a non-test name.
 */
require_once __DIR__ . "/../../../php/helpers/http.php";
require_once __DIR__ . "/../../../php/helpers/app.php";

$mode = $argv[1] ?? "absent";

function clear_env(string $key): void {
    putenv($key);
    unset($_ENV[$key]);
}

if ($mode === "absent") {
    foreach (["CLOUD_JWT_SECRET", "CLOUD_JWT_EXPIRES_IN", "DATABASE_URL", "DB_HOST", "DB_NAME", "DB_USER", "DB_PASS"] as $key) {
        clear_env($key);
    }
} elseif ($mode === "refused") {
    clear_env("DATABASE_URL");
    putenv("CLOUD_JWT_SECRET=sv-repair-local-only-20261001-not-production");
    $_ENV["CLOUD_JWT_SECRET"] = "sv-repair-local-only-20261001-not-production";
    putenv("APP_ENV=test");
    $_ENV["APP_ENV"] = "test";
    putenv("DB_HOST=127.0.0.1");
    $_ENV["DB_HOST"] = "127.0.0.1";
    putenv("DB_PORT=1");
    $_ENV["DB_PORT"] = "1";
    putenv("DB_USER=audit");
    $_ENV["DB_USER"] = "audit";
    putenv("DB_NAME=sparowvault_owner_books");
    $_ENV["DB_NAME"] = "sparowvault_owner_books";
} else {
    fwrite(STDERR, "mode must be absent or refused\n");
    exit(2);
}

$_SERVER["REQUEST_URI"] = "/api/health.php";
ob_start();
$blocked = health_block_unready();
$body = ob_get_clean();
echo json_encode([
    "mode" => $mode,
    "blocked" => $blocked,
    "http" => http_response_code(),
    "body" => json_decode($body, true),
], JSON_UNESCAPED_SLASHES), "\n";
exit($blocked ? 0 : 1);
