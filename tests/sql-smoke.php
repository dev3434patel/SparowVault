<?php
declare(strict_types=1);

require_once __DIR__ . "/../php/config/env.php";

$host = env_value("DB_HOST", "127.0.0.1");
$port = env_value("DB_PORT", "3306");
$user = env_value("DB_USER", "root");
$pass = env_value("DB_PASS", "");
$dbName = "sv_audit_" . date("Ymd_His") . "_" . bin2hex(random_bytes(3));

$dsn = sprintf("mysql:host=%s;port=%s;charset=utf8mb4", $host, $port);
$pdo = new PDO($dsn, $user ?? "", $pass ?? "", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

function quote_ident(string $name): string {
    if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
        throw new RuntimeException("Unsafe identifier");
    }
    return "`" . $name . "`";
}

try {
    $pdo->exec("CREATE DATABASE " . quote_ident($dbName) . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE " . quote_ident($dbName));

    $sqlPath = __DIR__ . "/../sql/20260501_sql_only_full.sql";
    $sql = file_get_contents($sqlPath);
    if ($sql === false || trim($sql) === "") {
        throw new RuntimeException("Unable to read final SQL file");
    }
    $pdo->exec($sql);

    $tables = (int)$pdo->query("SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE()")->fetch()["c"];
    $schema = $pdo->query("SELECT version_key FROM schema_version WHERE version_key = '20260501_sql_only_full'")->fetch();
    $admin = $pdo->query("SELECT username, role, is_active, pin_hash, pin_salt FROM users WHERE username = 'admin' LIMIT 1")->fetch();

    if (!$schema) {
        throw new RuntimeException("schema_version seed missing");
    }
    if (!$admin || $admin["role"] !== "admin" || (int)$admin["is_active"] !== 1) {
        throw new RuntimeException("admin seed missing or invalid");
    }
    if (!password_verify("12345678:" . $admin["pin_salt"], $admin["pin_hash"])) {
        throw new RuntimeException("admin seed PIN does not verify");
    }

    echo "SQL_SMOKE_OK database={$dbName} tables={$tables} admin=verified\n";
} finally {
    if (str_starts_with($dbName, "sv_audit_")) {
        $pdo->exec("DROP DATABASE IF EXISTS " . quote_ident($dbName));
    }
}
