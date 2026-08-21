<?php
/**
 * Admin PIN reset / seed.
 *
 * Phase 1 hardening:
 *   - Refuses to run in APP_ENV=production unless --force is passed.
 *   - Sets users.must_change_pin = 1 so the admin UI forces a PIN change
 *     before any other admin action.
 *   - Prints the audit fingerprint so the operator can correlate logs.
 *
 * Usage:
 *   php scripts/reset_admin_pin.php [pin] [username] [--force]
 *
 * Examples:
 *   php scripts/reset_admin_pin.php 12345678 admin            # dev only
 *   php scripts/reset_admin_pin.php 87654321 admin --force    # prod
 */
declare(strict_types=1);

require_once __DIR__ . "/../php/config/env.php";
require_once __DIR__ . "/../php/config/db.php";

$argvCopy = $argv;
array_shift($argvCopy);

$force = false;
$argvCopy = array_values(array_filter($argvCopy, function ($v) use (&$force) {
    if ($v === "--force") { $force = true; return false; }
    return true;
}));

$pin      = $argvCopy[0] ?? "12345678";
$username = $argvCopy[1] ?? "admin";

$appEnv = strtolower((string)($_ENV["APP_ENV"] ?? getenv("APP_ENV") ?? "development"));
if ($appEnv === "production" && !$force) {
    fwrite(STDERR, "Refusing to run in APP_ENV=production without --force.\n");
    fwrite(STDERR, "Resetting an admin PIN in production should be a deliberate, audited action.\n");
    fwrite(STDERR, "Re-run with: php scripts/reset_admin_pin.php <new-pin> <username> --force\n");
    exit(2);
}

if (!preg_match('/^\d{4,8}$/', $pin)) {
    fwrite(STDERR, "Refusing: PIN must be 4-8 digits.\n");
    exit(2);
}

// Phase 1: per-user salt, never the literal string "seed".
$salt = bin2hex(random_bytes(16));
$hash = password_hash($pin . ":" . $salt, PASSWORD_BCRYPT, ["cost" => 12]);

$pdo = db_conn();

// must_change_pin is only present after the Phase 1 migration. Fall back to
// the legacy column set when it is missing so old hosts can still seed an
// admin while migrating.
$hasMustChange = false;
try {
    $check = $pdo->query("SELECT must_change_pin FROM users LIMIT 0");
    $hasMustChange = $check !== false;
} catch (Throwable) {
    $hasMustChange = false;
}

if ($hasMustChange) {
    $st = $pdo->prepare(
        "UPDATE users
            SET pin_hash         = ?,
                pin_salt         = ?,
                role             = 'admin',
                is_active        = 1,
                must_change_pin  = 1,
                updated_at       = UTC_TIMESTAMP()
          WHERE username         = ?"
    );
} else {
    $st = $pdo->prepare(
        "UPDATE users
            SET pin_hash   = ?,
                pin_salt   = ?,
                role       = 'admin',
                is_active  = 1,
                updated_at = UTC_TIMESTAMP()
          WHERE username   = ?"
    );
}
$st->execute([$hash, $salt, $username]);

$verify = $pdo->prepare("SELECT pin_hash, pin_salt, role, is_active" . ($hasMustChange ? ", must_change_pin" : "") . " FROM users WHERE username = ? LIMIT 1");
$verify->execute([$username]);
$row = $verify->fetch();
$verified = is_array($row)
    && (string)$row["role"] === "admin"
    && (int)$row["is_active"] === 1
    && password_verify($pin . ":" . (string)$row["pin_salt"], (string)$row["pin_hash"]);

echo "updated_rows=" . $st->rowCount() . PHP_EOL;
echo "username=" . $username . PHP_EOL;
echo "pin_verified=" . ($verified ? "yes" : "no") . PHP_EOL;
if ($hasMustChange) {
    echo "must_change_pin=" . ((isset($row["must_change_pin"]) && (int)$row["must_change_pin"] === 1) ? "yes" : "no") . PHP_EOL;
} else {
    echo "must_change_pin=unsupported_schema (run sql/migrations/phase_01_security.sql)" . PHP_EOL;
}
echo "app_env=" . $appEnv . PHP_EOL;
echo "salt_fingerprint=" . substr(hash("sha256", $salt), 0, 12) . PHP_EOL;

if (!$verified) {
    fwrite(STDERR, "Admin PIN reset verification failed.\n");
    exit(1);
}
