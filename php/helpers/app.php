<?php

require_once __DIR__ . "/../config/env.php";
require_once __DIR__ . "/../config/db.php";

function app_env(): string {
    return strtolower((string)(env_value("APP_ENV", "development") ?? "development"));
}

function require_env_values(array $keys, bool $strict = false): void {
    $missing = [];
    foreach ($keys as $key) {
        $val = env_value($key);
        if (!is_string($val) || trim($val) === "") {
            $missing[] = $key;
        }
    }
    if (count($missing) > 0 && $strict) {
        throw new RuntimeException("Missing required environment variables: " . implode(", ", $missing));
    }
}

/**
 * Phase 1 — well-known JWT secrets that have ever appeared in the repo or in
 * docs / release bundles. Refusing them in production prevents an operator
 * accidentally booting with a copy-pasted example secret.
 *
 * Add the SHA-256 of any compromised secret to keep the rest of the file
 * deployable while invalidating that specific value.
 */
function known_bad_jwt_secret_hashes(): array {
    return [
        // Pre-Phase-1 release example; hash only so the secret never ships again.
        "2082136e025932ee36f73ba8dcbc11d052a85c3822fd1481119be467c9e1b0a2",
        "057ba03d4f615f051988281f2ae9fb9c5d1f157f7d3ae36327a7d35e3f769506",
        "e152e4bfd53c587f5bd3fdaaa5e5c6088dbdd0deeedd170e26118ef80da8c1d1",
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        "7eb3060e7c5b38bc336378edfb94feb96d700f1bf72759ab4be453b9d6f462aa",
        "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b",
        "c7a6f9dd98748e8569077d19d8453a037365c4e27167229fd4193b7ea084b71b",
        "37a8eec1ce19687d724f86df8a2e0c2e11b07f2ad05449f4d0c0385f441f2e21",
        "50d858e0985ecc7f60418aaf0cc5ab587f42c2570a884095a9e8ccacccca4ac2",
        "fe04359a499858bd7a82ebe62437c1e78dcb740efc92ef774954a2ef2d465e60",
        // .env.test.example CLOUD_JWT_SECRET=test-only-please-rotate (PHASE_10 denylist)
        "db8df61b1150b1038ede772dc50763d16a3ae2d61340c2710fe2a5ab611de718",
    ];
}

/**
 * Phase 1 — hard fail in production when any launch-blocking secret is
 * missing or known-bad. Called by validate_runtime_config().
 */
function require_safe_production_secrets(): void {
    if (app_env() !== "production") {
        return;
    }
    $jwt = (string)(env_value("CLOUD_JWT_SECRET", "") ?? "");
    if ($jwt === "") {
        throw new RuntimeException("Refusing to boot: CLOUD_JWT_SECRET is empty in APP_ENV=production. See docs/production-secrets.md.");
    }
    if (strlen($jwt) < 32) {
        throw new RuntimeException("Refusing to boot: CLOUD_JWT_SECRET is too short (<32 chars). Generate with: openssl rand -hex 64.");
    }
    $hashed = hash("sha256", $jwt);
    if (in_array($hashed, known_bad_jwt_secret_hashes(), true)) {
        throw new RuntimeException("Refusing to boot: CLOUD_JWT_SECRET matches a known example/default value. Rotate immediately. See docs/production-secrets.md.");
    }
    $dbPass = env_value("DB_PASS", "");
    $databaseUrl = env_value("DATABASE_URL", "");
    if (($databaseUrl === null || $databaseUrl === "") && ($dbPass === null || $dbPass === "")) {
        throw new RuntimeException("Refusing to boot: DB_PASS is empty in APP_ENV=production. Set a real database password.");
    }
}

function validate_runtime_config(): void {
    require_env_values(["CLOUD_JWT_SECRET", "CLOUD_JWT_EXPIRES_IN"], true);
    if (app_env() === "production") {
        require_env_values(["DB_HOST", "DB_NAME", "DB_USER"], true);
    }
    $razorpayEnabled = strtolower((string)(env_value("ENABLE_RAZORPAY", "false") ?? "false")) === "true";
    if (app_env() === "production" && $razorpayEnabled) {
        require_env_values(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"], true);
    }
    // Phase 1 — launch-blocker guard (last, so the env-missing errors above
    // surface first with clearer guidance).
    require_safe_production_secrets();
}

/**
 * Database name from DATABASE_URL or DB_*, or null when that target is absent.
 * Does not open a connection.
 */
function configured_database_name(): ?string {
    $databaseUrl = env_value("DATABASE_URL");
    if (is_string($databaseUrl) && str_starts_with($databaseUrl, "mysql://")) {
        $parts = parse_url($databaseUrl);
        if ($parts === false) {
            return null;
        }
        $name = isset($parts["path"]) ? rawurldecode(ltrim((string)$parts["path"], "/")) : "";
        $slash = strpos($name, "/");
        if ($slash !== false) {
            $name = substr($name, 0, $slash);
        }
        $name = trim($name);
        if ($name === "" || ($parts["host"] ?? "") === "") {
            return null;
        }
        return $name;
    }

    $name = env_value("DB_NAME");
    $host = env_value("DB_HOST");
    $user = env_value("DB_USER");
    if (!is_string($name) || trim($name) === "" || $host === null || $user === null) {
        return null;
    }
    return trim($name);
}

/**
 * Owner databases that destructive runners must reject before dump, truncate, or migrate.
 *
 * @return list<string>
 */
function destructive_database_forbidden_names(): array {
    return [
        "sparowvault",
        "sparowvault_current_schema",
        "sparowvault_final_merge",
        "sparowvault_final_sql_validate",
    ];
}

/**
 * Strict disposable allowlist: exact sparowvault_test, or a per-run name that contains "test".
 * The owner name sparowvault is never allowlisted.
 */
function destructive_database_name_allowed(?string $name): bool {
    if (!is_string($name)) {
        return false;
    }
    $trimmed = trim($name);
    if ($trimmed === "") {
        return false;
    }
    if (in_array(strtolower($trimmed), destructive_database_forbidden_names(), true)) {
        return false;
    }
    if (strcasecmp($trimmed, "sparowvault_test") === 0) {
        return true;
    }
    return stripos($trimmed, "test") !== false;
}

/**
 * Destructive runners call this before any dump, truncate, or migrate.
 * A missing per-run sentinel or a non-allowlisted name, including sparowvault, is refused.
 * This does not open a database connection.
 *
 * @return array{outcome: string, detail: string}
 */
function destructive_database_target_decision(?string $name = null): array {
    $target = $name ?? configured_database_name();
    if (!destructive_database_name_allowed($target)) {
        return [
            "outcome" => "refused",
            "detail" => "Refusing destructive runner: database is not allowlisted.",
        ];
    }
    $sentinel = trim((string)(env_value("AUDIT_RUN_SENTINEL", "") ?? ""));
    if ($sentinel === "") {
        return [
            "outcome" => "refused",
            "detail" => "Refusing destructive runner: per-run sentinel is missing.",
        ];
    }
    return ["outcome" => "allowed", "detail" => ""];
}

/**
 * Production readiness configuration only.
 * An empty secret or a missing database identity stays fail-closed.
 * Readiness does not require the substring "test" and does not refuse APP_ENV=production.
 * This does not open a connection. SELECT 1 and the required schema are checked by the caller.
 *
 * @return array{outcome: string, detail: string}
 */
function health_configuration_decision(): array {
    $secret = trim((string)(env_value("CLOUD_JWT_SECRET", "") ?? ""));
    $dbName = configured_database_name();
    if ($secret === "" || $dbName === null) {
        return [
            "outcome" => "not_configured",
            "detail" => "The process is not configured.",
        ];
    }
    return ["outcome" => "ready", "detail" => ""];
}

/**
 * Writes the health envelope and returns true when this process must not open a database.
 */
function health_block_unready(): bool {
    $decision = health_configuration_decision();
    if ($decision["outcome"] === "ready") {
        return false;
    }
    json_ok([
        "status" => $decision["outcome"] === "refused" ? "refused" : "not_configured",
        "detail" => $decision["detail"],
        "appEnv" => app_env(),
        "requestId" => (string)($_SERVER["REQUEST_ID"] ?? ""),
        "time" => gmdate("c"),
    ], 503);
    return true;
}

function setting_get_map(bool $publicOnly = false): array {
    $db = db_conn();
    if ($publicOnly) {
        $st = $db->prepare("SELECT setting_key, setting_value FROM app_settings WHERE is_public = 1");
        $st->execute();
    } else {
        $st = $db->prepare("SELECT setting_key, setting_value, is_public, updated_at FROM app_settings");
        $st->execute();
    }
    $out = [];
    while ($row = $st->fetch()) {
        $value = $row["setting_value"];
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $out[$row["setting_key"]] = json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        } else {
            $out[$row["setting_key"]] = $value;
        }
    }
    return $out;
}

function flag_get_map(): array {
    $db = db_conn();
    $st = $db->prepare("SELECT feature_key, is_enabled FROM feature_flags_global");
    $st->execute();
    $out = [];
    while ($row = $st->fetch()) {
        $out[$row["feature_key"]] = ((int)$row["is_enabled"]) === 1;
    }
    return $out;
}
