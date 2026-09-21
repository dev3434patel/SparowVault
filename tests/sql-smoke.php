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

function run_sql_file(string $sql): void {
    $mysqli = new mysqli(
        (string)$GLOBALS["sv_sql_host"],
        (string)$GLOBALS["sv_sql_user"],
        (string)$GLOBALS["sv_sql_pass"],
        (string)$GLOBALS["sv_sql_db"],
        (int)$GLOBALS["sv_sql_port"]
    );
    if ($mysqli->connect_error) {
        throw new RuntimeException("mysqli connect failed: " . $mysqli->connect_error);
    }
    $mysqli->set_charset("utf8mb4");
    if (!$mysqli->multi_query($sql)) {
        throw new RuntimeException("SQL import failed: " . $mysqli->error);
    }
    do {
        if ($result = $mysqli->store_result()) {
            $result->free();
        }
    } while ($mysqli->more_results() && $mysqli->next_result());
    if ($mysqli->errno) {
        throw new RuntimeException("SQL import failed: " . $mysqli->error);
    }
    $mysqli->close();
}

$GLOBALS["sv_sql_host"] = $host;
$GLOBALS["sv_sql_port"] = (int)$port;
$GLOBALS["sv_sql_user"] = $user;
$GLOBALS["sv_sql_pass"] = $pass;

try {
    $pdo->exec("CREATE DATABASE " . quote_ident($dbName) . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE " . quote_ident($dbName));
    $GLOBALS["sv_sql_db"] = $dbName;

    $sqlPath = __DIR__ . "/../sql/HOSTING_READY_CLEAN_IMPORT.sql";
    $sql = file_get_contents($sqlPath);
    if ($sql === false || trim($sql) === "") {
        throw new RuntimeException("Unable to read HOSTING_READY_CLEAN_IMPORT.sql");
    }
    run_sql_file($sql);

    $required = [
        "users",
        "cloud_collection_rows",
        "financial_events",
        "financial_effects",
        "financial_mutation_keys",
        "plans",
        "plan_features",
        "plan_prices",
        "subscriptions",
        "payments",
        "schema_version",
        "user_security_recovery",
        "user_policy_acceptances",
        "user_audit_logs",
    ];
    $existing = $pdo->query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
    )->fetchAll(PDO::FETCH_COLUMN);
    $existingLc = array_map("strtolower", $existing);
    foreach ($required as $table) {
        if (!in_array(strtolower($table), $existingLc, true)) {
            throw new RuntimeException("Missing required table: {$table}");
        }
    }

    $tables = count($existing);
    $schema = $pdo->query("SELECT version_key FROM schema_version WHERE version_key = 'hosting_ready_clean_v3'")->fetch();
    $admin = $pdo->query("SELECT username, role, is_active, pin_hash, pin_salt, must_change_pin FROM users WHERE username = 'admin' LIMIT 1")->fetch();
    $plans = (int)$pdo->query("SELECT COUNT(*) AS c FROM plans")->fetch()["c"];
    $prices = (int)$pdo->query("SELECT COUNT(*) AS c FROM plan_prices")->fetch()["c"];

    if (!$schema) {
        throw new RuntimeException("schema_version seed missing (hosting_ready_clean_v3)");
    }
    if (!$admin || $admin["role"] !== "admin" || (int)$admin["is_active"] !== 1) {
        throw new RuntimeException("admin seed missing or invalid");
    }
    if ((int)$admin["must_change_pin"] !== 1) {
        throw new RuntimeException("admin seed must_change_pin should be 1");
    }
    if (!password_verify("12345678:" . $admin["pin_salt"], $admin["pin_hash"])) {
        throw new RuntimeException("admin seed PIN does not verify");
    }
    if ($plans < 4) {
        throw new RuntimeException("plan seed incomplete");
    }
    if ($prices < 4) {
        throw new RuntimeException("plan_prices seed incomplete");
    }

    run_sql_file($sql);

    echo "SQL_SMOKE_OK database={$dbName} tables={$tables} plans={$plans} prices={$prices} admin=verified idempotent=yes\n";
} finally {
    if (str_starts_with($dbName, "sv_audit_")) {
        $pdo->exec("DROP DATABASE IF EXISTS " . quote_ident($dbName));
    }
}
