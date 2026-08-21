<?php

require_once __DIR__ . "/../php/config/env.php";
require_once __DIR__ . "/../php/config/db.php";

$dbHost = (string)(env_value("DB_HOST", "127.0.0.1") ?? "127.0.0.1");
$dbPort = (string)(env_value("DB_PORT", "3306") ?? "3306");
$dbName = (string)(env_value("DB_NAME", "") ?? "");
$dbUser = (string)(env_value("DB_USER", "") ?? "");
$dbPass = (string)(env_value("DB_PASS", "") ?? "");

if ($dbName === "" || $dbUser === "") {
    fwrite(STDERR, "Missing DB_NAME or DB_USER\n");
    exit(1);
}

$ts = gmdate("Ymd_His");
$outDir = __DIR__ . "/../backups";
if (!is_dir($outDir)) {
    mkdir($outDir, 0775, true);
}
$dumpFile = $outDir . "/db_" . $ts . ".sql";

$cmd = sprintf(
    'mysqldump -h %s -P %s -u %s %s %s > %s',
    escapeshellarg($dbHost),
    escapeshellarg($dbPort),
    escapeshellarg($dbUser),
    $dbPass !== "" ? '-p' . escapeshellarg($dbPass) : '',
    escapeshellarg($dbName),
    escapeshellarg($dumpFile)
);

exec($cmd, $output, $status);
if ($status !== 0) {
    fwrite(STDERR, "mysqldump failed or is unavailable; falling back to PDO SQL export\n");
    try {
        $db = db_conn();
        $fh = fopen($dumpFile, "wb");
        if ($fh === false) {
            throw new RuntimeException("Could not open backup file for writing");
        }
        fwrite($fh, "-- SparowVault PDO fallback backup\n");
        fwrite($fh, "-- Created at " . gmdate("c") . "\n\n");
        fwrite($fh, "SET FOREIGN_KEY_CHECKS=0;\n\n");

        $tables = [];
        $st = $db->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
        while ($row = $st->fetch(PDO::FETCH_NUM)) {
            if (isset($row[0]) && is_string($row[0]) && $row[0] !== "") {
                $tables[] = $row[0];
            }
        }

        foreach ($tables as $table) {
            $quotedTable = "`" . str_replace("`", "``", $table) . "`";
            $create = $db->query("SHOW CREATE TABLE " . $quotedTable)->fetch(PDO::FETCH_ASSOC);
            $createSql = $create["Create Table"] ?? null;
            if (!is_string($createSql) || $createSql === "") {
                continue;
            }
            fwrite($fh, "DROP TABLE IF EXISTS " . $quotedTable . ";\n");
            fwrite($fh, $createSql . ";\n\n");

            $rows = $db->query("SELECT * FROM " . $quotedTable);
            while ($record = $rows->fetch(PDO::FETCH_ASSOC)) {
                $cols = array_keys($record);
                $colSql = implode(", ", array_map(fn($c) => "`" . str_replace("`", "``", $c) . "`", $cols));
                $valSql = implode(", ", array_map(function ($v) use ($db) {
                    if ($v === null) return "NULL";
                    return $db->quote((string)$v);
                }, array_values($record)));
                fwrite($fh, "INSERT INTO " . $quotedTable . " (" . $colSql . ") VALUES (" . $valSql . ");\n");
            }
            fwrite($fh, "\n");
        }
        fwrite($fh, "SET FOREIGN_KEY_CHECKS=1;\n");
        fclose($fh);
    } catch (Throwable $e) {
        fwrite(STDERR, "Backup failed: " . $e->getMessage() . "\n");
        exit($status !== 0 ? $status : 1);
    }
}

echo "DB backup created: " . $dumpFile . PHP_EOL;
