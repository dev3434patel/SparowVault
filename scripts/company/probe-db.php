<?php
declare(strict_types=1);
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";

echo "DB_NAME=" . (getenv("DB_NAME") ?: "(none)") . PHP_EOL;
echo "DB_HOST=" . (getenv("DB_HOST") ?: "(none)") . PHP_EOL;

try {
    $db = db_conn();
    echo "CONNECTED\n";
    $r = $db->query("SHOW TABLES LIKE 'company_%'");
    $tables = $r->fetchAll(PDO::FETCH_COLUMN);
    echo "company_tables=" . count($tables) . PHP_EOL;
    foreach ($tables as $t) echo "  - $t\n";
} catch (Throwable $e) {
    echo "ERR: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
