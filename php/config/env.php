<?php

$GLOBALS["SV_ENV_FILE_KEYS"] = $GLOBALS["SV_ENV_FILE_KEYS"] ?? [];

function read_env_file_value(string $path, string $targetKey): ?string {
    if (!is_file($path)) return null;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) return null;
    foreach ($lines as $line) {
        $trim = trim($line);
        if ($trim === "" || str_starts_with($trim, "#")) continue;
        $pos = strpos($trim, "=");
        if ($pos === false) continue;
        $key = trim(substr($trim, 0, $pos));
        if ($key !== $targetKey) continue;
        $val = trim(substr($trim, $pos + 1));
        if ((str_starts_with($val, "\"") && str_ends_with($val, "\"")) || (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
            $val = substr($val, 1, -1);
        }
        return $val;
    }
    return null;
}

function load_env_file(string $path, bool $overrideFileLoaded = false): void {
    if (!is_file($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) return;
    foreach ($lines as $line) {
        $trim = trim($line);
        if ($trim === "" || str_starts_with($trim, "#")) continue;
        $pos = strpos($trim, "=");
        if ($pos === false) continue;
        $key = trim(substr($trim, 0, $pos));
        $val = trim(substr($trim, $pos + 1));
        if ($key === "") continue;
        if (!preg_match('/^[A-Z_][A-Z0-9_]*$/', $key)) continue;
        if ((str_starts_with($val, "\"") && str_ends_with($val, "\"")) || (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
            $val = substr($val, 1, -1);
        }
        $fromLoadedFile = ($GLOBALS["SV_ENV_FILE_KEYS"][$key] ?? false) === true;
        if (getenv($key) === false || ($overrideFileLoaded && $fromLoadedFile)) {
            putenv($key . "=" . $val);
            $_ENV[$key] = $val;
            $GLOBALS["SV_ENV_FILE_KEYS"][$key] = true;
        }
    }
}

$projectRoot = dirname(__DIR__, 2);
$baseEnvPath = $projectRoot . "/.env";
$baseEnvSelectedFile = read_env_file_value($baseEnvPath, "APP_ENV_FILE");
load_env_file($baseEnvPath);
$selectedEnvFile = $baseEnvSelectedFile
    ?? $_ENV["APP_ENV_FILE"]
    ?? getenv("APP_ENV_FILE");
if (is_string($selectedEnvFile) && $selectedEnvFile !== "") {
    $selectedEnvFile = basename($selectedEnvFile);
    putenv("APP_ENV_FILE=" . $selectedEnvFile);
    $_ENV["APP_ENV_FILE"] = $selectedEnvFile;
    $GLOBALS["SV_ENV_FILE_KEYS"]["APP_ENV_FILE"] = true;
    load_env_file($projectRoot . "/" . $selectedEnvFile, true);
}
// Hosting fallback: if APP_ENV_FILE is not set, allow a dedicated .env.host file.
if ((!is_string($selectedEnvFile) || $selectedEnvFile === "") && is_file($projectRoot . "/.env.host")) {
    load_env_file($projectRoot . "/.env.host", true);
}

function env_value(string $key, ?string $default = null): ?string {
    $value = $_ENV[$key] ?? getenv($key);
    if ($value === false || $value === null || $value === "") {
        return $default;
    }
    return (string) $value;
}

function db_dsn(): string {
    $databaseUrl = env_value("DATABASE_URL");
    if ($databaseUrl !== null) {
        return $databaseUrl;
    }

    $host = env_value("DB_HOST");
    $port = env_value("DB_PORT", "3306");
    $name = env_value("DB_NAME");
    $user = env_value("DB_USER");
    $pass = env_value("DB_PASS", "");

    if ($host === null || $name === null || $user === null) {
        throw new RuntimeException("Database is not configured. Set DB_HOST, DB_NAME, DB_USER, DB_PASS or DATABASE_URL.");
    }

    return sprintf("mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4", $host, $port, $name);
}
