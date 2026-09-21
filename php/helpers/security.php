<?php

/**
 * security.php — CORS, rate limiting, and IP utilities.
 *
 * Rate limiting now uses MySQL (api_rate_limits table) instead of a JSON file.
 * MySQL atomic INSERT … ON DUPLICATE KEY UPDATE prevents race conditions under
 * concurrent traffic. The old file-based approach had a read-write race that
 * allowed unlimited requests in high-concurrency scenarios.
 */

require_once __DIR__ . "/../config/env.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/http.php";

$GLOBALS["SV_IN_MEMORY_RATE_LIMIT"] = $GLOBALS["SV_IN_MEMORY_RATE_LIMIT"] ?? [];

// ============================================================================
// CORS
// ============================================================================

function cors_allowed_origins(): array {
    $raw = env_value("CORS_ALLOWED_ORIGINS", "");
    if ($raw === null || trim($raw) === "") {
        return [];
    }
    $parts = array_map("trim", explode(",", $raw));
    return array_values(array_filter($parts, static fn($v) => $v !== ""));
}

function apply_cors_headers(): void {
    $appEnv = strtolower((string)(env_value("APP_ENV", "development") ?? "development"));
    $origin = (string)($_SERVER["HTTP_ORIGIN"] ?? "");
    $allowed = cors_allowed_origins();

    $localHost = parse_url($origin, PHP_URL_HOST);
    $localScheme = parse_url($origin, PHP_URL_SCHEME);
    $localDevelopment = $appEnv !== "production" && in_array($localHost, ["localhost", "127.0.0.1", "[::1]"], true) && in_array($localScheme, ["http", "https"], true);
    if ($origin !== "" && (in_array($origin, $allowed, true) || $localDevelopment)) header("Access-Control-Allow-Origin: " . $origin);
    header("Vary: Origin");

    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-Id, X-CSRF-Token, X-Razorpay-Signature, X-Razorpay-Event-Id");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Credentials: true");
}

function apply_security_headers(): void {
    header("X-Frame-Options: DENY");
    header("X-Content-Type-Options: nosniff");
    header("Referrer-Policy: strict-origin-when-cross-origin");
    header("Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(self \"https://checkout.razorpay.com\" \"https://api.razorpay.com\")");
    header("Content-Security-Policy: default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://checkout.razorpay.com; connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com; object-src 'none'; upgrade-insecure-requests");
    if (strtolower((string)(env_value("APP_ENV", "development") ?? "development")) === "production") {
        header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
    }
}

// ============================================================================
// CLIENT IP
// Handles reverse-proxy headers (Cloudflare, Nginx, Apache mod_proxy).
// ============================================================================

function client_ip(): string {
    $remote = (string)($_SERVER["REMOTE_ADDR"] ?? "unknown");
    $trusted = array_filter(array_map("trim", explode(",", (string)env_value("TRUSTED_PROXY_IPS", ""))));
    if (!in_array($remote, $trusted, true)) return $remote;
    // Walk from the trusted edge inward; never accept a client-supplied leftmost value.
    foreach (array_reverse(explode(",", (string)($_SERVER["HTTP_X_FORWARDED_FOR"] ?? ""))) as $value) {
        $ip = trim($value);
        if (!filter_var($ip, FILTER_VALIDATE_IP)) return $remote;
        if (!in_array($ip, $trusted, true)) return $ip;
    }
    return $remote;
}

// ============================================================================
// RATE LIMITING — MySQL-based (atomic, concurrent-safe)
//
// Uses INSERT … ON DUPLICATE KEY UPDATE hit_count = hit_count + 1
// so the counter increment is a single atomic operation.
// Window expiry resets the counter on the first hit after the window passes.
// ============================================================================

/**
 * Check and increment a rate limit bucket.
 *
 * @param string $bucket         Logical bucket name (e.g. "auth_login")
 * @param int    $maxHits        Maximum allowed hits per window
 * @param int    $windowSeconds  Window size in seconds
 */
function rate_limit_guard(string $bucket, int $maxHits, int $windowSeconds): void {
    $ip      = client_ip();
    $key     = $bucket . "|" . $ip;
    $now     = time();
    $nowDt   = gmdate("Y-m-d H:i:s", $now);
    $winStart = gmdate("Y-m-d H:i:s", $now - $windowSeconds);

    try {
        $db = db_conn();

        // Atomically upsert the rate limit row.
        // If the window has expired (window_start < now - windowSeconds),
        // reset the counter; otherwise increment.
        $sql = "
            INSERT INTO api_rate_limits (bucket_key, hit_count, window_start, updated_at)
            VALUES (?, 1, ?, ?)
            ON DUPLICATE KEY UPDATE
              hit_count    = IF(window_start < ?, 1, hit_count + 1),
              window_start = IF(window_start < ?, ?, window_start),
              updated_at   = ?
        ";
        $st = $db->prepare($sql);
        $st->execute([$key, $nowDt, $nowDt, $winStart, $winStart, $nowDt, $nowDt]);

        // Read back the current count for this window
        $sel = $db->prepare(
            "SELECT hit_count FROM api_rate_limits WHERE bucket_key = ? LIMIT 1"
        );
        $sel->execute([$key]);
        $row = $sel->fetch();
        $count = (int)($row["hit_count"] ?? 0);

        if ($count > $maxHits) {
            json_error("Rate limit exceeded. Try again later.", 429, "RATE_LIMITED");
            exit;
        }
    } catch (Throwable $e) {
        error_log("[rate_limit_guard] Storage unavailable");
        json_error("Security checks are temporarily unavailable. Try again later.", 503, "SECURITY_UNAVAILABLE");
        exit;
    }
}

function rate_limit_guard_memory(string $bucket, int $maxHits, int $windowSeconds): void {
    $ip = client_ip();
    $key = $bucket . "|" . $ip;
    $now = time();
    $store = $GLOBALS["SV_IN_MEMORY_RATE_LIMIT"] ?? [];
    $entry = $store[$key] ?? null;
    if (!is_array($entry) || !isset($entry["windowStart"]) || !isset($entry["hits"])) {
        $entry = ["windowStart" => $now, "hits" => 0];
    }
    if (($now - (int)$entry["windowStart"]) >= $windowSeconds) {
        $entry["windowStart"] = $now;
        $entry["hits"] = 0;
    }
    $entry["hits"] = (int)$entry["hits"] + 1;
    $store[$key] = $entry;
    $GLOBALS["SV_IN_MEMORY_RATE_LIMIT"] = $store;
    if ((int)$entry["hits"] > $maxHits) {
        json_error("Rate limit exceeded. Try again later.", 429, "RATE_LIMITED");
        exit;
    }
}

/**
 * Clean up expired rate limit rows. Call from a maintenance task or
 * low-traffic endpoint. Prevents the api_rate_limits table from growing.
 */
function rate_limit_cleanup(int $olderThanSeconds = 3600): void {
    try {
        $db  = db_conn();
        $cutoff = gmdate("Y-m-d H:i:s", time() - $olderThanSeconds);
        $db->prepare("DELETE FROM api_rate_limits WHERE updated_at < ?")->execute([$cutoff]);
    } catch (Throwable) {
        // Non-critical — ignore
    }
}

// ============================================================================
// CSRF (vNext Phase L) — double-submit cookie + header for mutating requests
// ============================================================================

function csrf_token_cookie_name(): string {
    return "sv_csrf";
}

function csrf_issue_token(): string {
    $token = bin2hex(random_bytes(32));
    $secure = strtolower((string)(env_value("APP_ENV", "development") ?? "development")) === "production";
    setcookie(csrf_token_cookie_name(), $token, [
        "expires" => time() + 86400,
        "path" => "/",
        "secure" => $secure,
        "httponly" => false,
        "samesite" => "Lax",
    ]);
    return $token;
}

function csrf_read_cookie_token(): ?string {
    $v = $_COOKIE[csrf_token_cookie_name()] ?? null;
    return is_string($v) && $v !== "" ? $v : null;
}

function csrf_require_for_mutations(): void {
    $method = strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET"));
    if (!in_array($method, ["POST", "PUT", "PATCH", "DELETE"], true)) {
        return;
    }
    $cookie = csrf_read_cookie_token();
    $header = (string)($_SERVER["HTTP_X_CSRF_TOKEN"] ?? "");
    if ($cookie === null || $header === "" || !hash_equals($cookie, $header)) {
        json_error("CSRF validation failed", 403, "CSRF_FAILED");
        exit;
    }
}
