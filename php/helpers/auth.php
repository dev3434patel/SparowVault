<?php

require_once __DIR__ . "/http.php";
require_once __DIR__ . "/../config/db.php";

function jwt_secret(): string {
    $secret = $_ENV["CLOUD_JWT_SECRET"] ?? getenv("CLOUD_JWT_SECRET");
    if (!is_string($secret) || $secret === "") {
        throw new RuntimeException("Missing required environment variable: CLOUD_JWT_SECRET");
    }
    return $secret;
}

function jwt_expires_in_seconds(): int {
    $value = $_ENV["CLOUD_JWT_EXPIRES_IN"] ?? getenv("CLOUD_JWT_EXPIRES_IN") ?: "7d";
    if (!is_string($value) || $value === "") return 604800;
    if (preg_match('/^(\d+)([smhd])$/', $value, $m) !== 1) return 604800;
    $num = (int)$m[1];
    $unit = $m[2];
    return match ($unit) {
        "s" => $num,
        "m" => $num * 60,
        "h" => $num * 3600,
        default => $num * 86400,
    };
}

function jwt_issuer(): string {
    return (string)(($_ENV["APP_BASE_URL"] ?? getenv("APP_BASE_URL")) ?: "sparowvault");
}

function jwt_audience(): string {
    return "sparowvault-api";
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    $padded = strtr($data, '-_', '+/');
    $padLen = strlen($padded) % 4;
    if ($padLen > 0) {
        $padded .= str_repeat('=', 4 - $padLen);
    }
    $decoded = base64_decode($padded, true);
    return $decoded === false ? "" : $decoded;
}

function sign_cloud_token(array $payload): string {
    $now = time();
    $exp = $now + jwt_expires_in_seconds();
    $header = ["alg" => "HS256", "typ" => "JWT"];
    $claims = array_merge($payload, [
        "iat" => $now,
        "nbf" => $now - 5,
        "exp" => $exp,
        "iss" => jwt_issuer(),
        "aud" => jwt_audience(),
    ]);
    $h = base64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES));
    $p = base64url_encode(json_encode($claims, JSON_UNESCAPED_SLASHES));
    $sig = hash_hmac("sha256", $h . "." . $p, jwt_secret(), true);
    return $h . "." . $p . "." . base64url_encode($sig);
}

function verify_cloud_token(string $token): array {
    $parts = explode(".", $token);
    if (count($parts) !== 3) {
        throw new RuntimeException("Invalid cloud token");
    }
    [$h, $p, $s] = $parts;
    $header = json_decode(base64url_decode($h), true);
    if (!is_array($header)) {
        throw new RuntimeException("Invalid cloud token");
    }
    if (($header["alg"] ?? null) !== "HS256") {
        throw new RuntimeException("Invalid cloud token");
    }
    if (isset($header["typ"]) && (string)$header["typ"] !== "JWT") {
        throw new RuntimeException("Invalid cloud token");
    }
    $expected = base64url_encode(hash_hmac("sha256", $h . "." . $p, jwt_secret(), true));
    if (!hash_equals($expected, $s)) {
        throw new RuntimeException("Invalid cloud token");
    }
    $claims = json_decode(base64url_decode($p), true);
    if (!is_array($claims)) {
        throw new RuntimeException("Invalid cloud token");
    }
    $now = time();
    foreach (["iat", "nbf", "exp", "iss", "aud", "userId", "username"] as $requiredClaim) {
        if (!array_key_exists($requiredClaim, $claims)) {
            throw new RuntimeException("Invalid cloud token");
        }
    }
    if ((string)$claims["iss"] !== jwt_issuer() || (string)$claims["aud"] !== jwt_audience()) {
        throw new RuntimeException("Invalid cloud token");
    }
    if ((int)$claims["nbf"] > $now + 30 || (int)$claims["iat"] > $now + 30 || (int)$claims["exp"] < $now) {
        throw new RuntimeException("Invalid cloud token");
    }
    return $claims;
}

function auth_cookie_secure(): bool {
    $env = strtolower((string)(($_ENV["APP_ENV"] ?? getenv("APP_ENV")) ?: "development"));
    $https = strtolower((string)($_SERVER["HTTPS"] ?? "")) === "on";
    $forwarded = strtolower((string)($_SERVER["HTTP_X_FORWARDED_PROTO"] ?? "")) === "https";
    return $env === "production" || $https || $forwarded;
}

function set_auth_cookie(string $token): void {
    setcookie("sv_auth", $token, [
        "expires" => time() + jwt_expires_in_seconds(),
        "path" => "/",
        "secure" => auth_cookie_secure(),
        "httponly" => true,
        "samesite" => "Lax",
    ]);
}

function clear_auth_cookie(): void {
    setcookie("sv_auth", "", [
        "expires" => time() - 3600,
        "path" => "/",
        "secure" => auth_cookie_secure(),
        "httponly" => true,
        "samesite" => "Lax",
    ]);
}

function create_pin_salt(): string {
    return bin2hex(random_bytes(16));
}

function hash_secret(string $secret): string {
    return password_hash($secret, PASSWORD_BCRYPT, ["cost" => 12]);
}

function verify_secret(string $secret, string $hash): bool {
    return password_verify($secret, $hash);
}

function auth_pin_validation_error(string $pin): ?string {
    if (preg_match('/^\d{4,8}$/', $pin) !== 1) {
        return "PIN must be 4 to 8 digits";
    }
    $commonPins = ["0000", "1111", "1234", "123456", "9999"];
    if (in_array($pin, $commonPins, true)) {
        return "Choose a less common PIN";
    }
    if (preg_match('/^(19|20)\d{2}(0[1-9]|1[0-2])$/', $pin) === 1 || preg_match('/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2}$/', $pin) === 1) {
        return "Avoid date-like PINs";
    }
    $env = strtolower((string)(($_ENV["APP_ENV"] ?? getenv("APP_ENV")) ?: "development"));
    if ($env === "production" && strlen($pin) < 6) {
        return "Production PIN must be at least 6 digits";
    }
    return null;
}

function auth_valid_pin(string $pin): bool {
    return auth_pin_validation_error($pin) === null;
}

function require_cloud_user(): array {
    $token = get_bearer_token();
    if ($token === null) {
        throw new RuntimeException("Missing bearer token");
    }
    $claims = verify_cloud_token($token);
    return [
        "userId" => (string)($claims["userId"] ?? ""),
        "username" => (string)($claims["username"] ?? ""),
        "role" => (string)($claims["role"] ?? "user"),
    ];
}

function db_user_by_username(string $username): ?array {
    $db = db_conn();
    $st = $db->prepare("SELECT id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at FROM users WHERE username = ? LIMIT 1");
    $st->execute([$username]);
    $row = $st->fetch();
    return $row ?: null;
}

function db_user_by_id(string $id): ?array {
    $db = db_conn();
    $st = $db->prepare("SELECT id, username, display_name, role, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1");
    $st->execute([$id]);
    $row = $st->fetch();
    return $row ?: null;
}

function auth_require_active_user(): array {
    $claims = require_cloud_user();
    $user = db_user_by_id($claims["userId"]);
    if (!$user || ((int)$user["is_active"]) !== 1) {
        throw new RuntimeException("User is inactive or not found");
    }
    return [
        "id" => (string)$user["id"],
        "username" => (string)$user["username"],
        "displayName" => (string)$user["display_name"],
        "role" => (string)$user["role"],
    ];
}

function auth_require_admin(): array {
    $user = auth_require_active_user();
    if ($user["role"] !== "admin") {
        throw new RuntimeException("Admin access required");
    }
    return $user;
}

function user_auth_row_by_id(string $userId): ?array {
    $db = db_conn();
    $st = $db->prepare("SELECT id, username, display_name, pin_hash, pin_salt, role, is_active FROM users WHERE id = ? LIMIT 1");
    $st->execute([$userId]);
    $row = $st->fetch();
    return $row ?: null;
}

function login_throttle_status(string $username, string $ipAddress): array {
    $db = db_conn();
    $st = $db->prepare("SELECT attempt_count, locked_until FROM login_attempts WHERE username = ? AND ip_address = ? LIMIT 1");
    $st->execute([$username, $ipAddress]);
    $row = $st->fetch();
    if (!$row) {
        return ["blocked" => false, "attempts" => 0];
    }
    $lockedUntil = $row["locked_until"];
    if (is_string($lockedUntil) && $lockedUntil !== "" && strtotime($lockedUntil) > time()) {
        return ["blocked" => true, "attempts" => (int)$row["attempt_count"], "lockedUntil" => $lockedUntil];
    }
    return ["blocked" => false, "attempts" => (int)$row["attempt_count"]];
}

function record_login_failure(string $username, string $ipAddress): void {
    $db = db_conn();
    $status = login_throttle_status($username, $ipAddress);
    $nextCount = ((int)($status["attempts"] ?? 0)) + 1;
    $lockSeconds = $nextCount >= 5 ? min(1800, ($nextCount - 4) * 120) : 0;
    $lockedUntil = $lockSeconds > 0 ? gmdate("Y-m-d H:i:s", time() + $lockSeconds) : null;
    $st = $db->prepare(
        "INSERT INTO login_attempts (username, ip_address, attempt_count, locked_until, updated_at, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE attempt_count = VALUES(attempt_count), locked_until = VALUES(locked_until), updated_at = UTC_TIMESTAMP()"
    );
    $st->execute([$username, $ipAddress, $nextCount, $lockedUntil]);
}

function clear_login_failures(string $username, string $ipAddress): void {
    $db = db_conn();
    $st = $db->prepare("DELETE FROM login_attempts WHERE username = ? AND ip_address = ?");
    $st->execute([$username, $ipAddress]);
}
