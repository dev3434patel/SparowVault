<?php

require_once __DIR__ . "/env.php";

function db_conn(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $databaseUrl = env_value("DATABASE_URL");
    if ($databaseUrl !== null && str_starts_with($databaseUrl, "mysql://")) {
        $parts = parse_url($databaseUrl);
        if ($parts === false) {
            throw new RuntimeException("Invalid DATABASE_URL format.");
        }
        $host = $parts["host"] ?? "127.0.0.1";
        $port = isset($parts["port"]) ? (string) $parts["port"] : "3306";
        $dbName = isset($parts["path"]) ? ltrim($parts["path"], "/") : "";
        $user = isset($parts["user"]) ? urldecode($parts["user"]) : "";
        $pass = isset($parts["pass"]) ? urldecode($parts["pass"]) : "";
        $dsn = sprintf("mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4", $host, $port, $dbName);
    } else {
        $dsn = db_dsn();
        $user = env_value("DB_USER", "");
        $pass = env_value("DB_PASS", "");
    }

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

