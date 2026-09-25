<?php
declare(strict_types=1);
/**
 * Apply company SQL migrations in order.
 *
 * Usage:
 *   php scripts/company/apply-migration.php              # all company migrations
 *   php scripts/company/apply-migration.php --list        # print order only
 *   php scripts/company/apply-migration.php --only=file   # single file basename
 *
 * Rollback: there are NO down-migrations for company schema.
 * Rollback = restore from mysqldump backup (see docs/company/RUNBOOK.md).
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";

$migrationsDir = __DIR__ . "/../../sql/migrations";

/** Ordered company migrations — apply exactly in this sequence. */
$ORDER = [
    "20260923_company_core.sql",
    "20260923_company_indexes.sql",
    "20260923_company_reversal_fk.sql",
    "20260923_company_bill_on_account.sql",
    "20260924_company_perf_indexes.sql",
];

$args = array_slice($argv, 1);
if (in_array("--list", $args, true)) {
    foreach ($ORDER as $i => $f) {
        echo ($i + 1) . ". $f\n";
    }
    echo "ROLLBACK: restore from backup (no down-migrations).\n";
    exit(0);
}

$only = null;
foreach ($args as $a) {
    if (str_starts_with($a, "--only=")) {
        $only = basename(substr($a, 7));
    }
}
$files = $only ? [$only] : $ORDER;

function apply_sql_file(PDO $db, string $path): array {
    $sql = file_get_contents($path);
    if ($sql === false) {
        throw new RuntimeException("Cannot read $path");
    }
    $lines = preg_split("/\r\n|\n|\r/", $sql) ?: [];
    $buf = "";
    $statements = [];
    foreach ($lines as $line) {
        $trim = ltrim($line);
        if (str_starts_with($trim, "--")) {
            continue;
        }
        $buf .= $line . "\n";
        if (str_ends_with(rtrim($line), ";")) {
            $stmt = trim($buf);
            $buf = "";
            if ($stmt !== "" && $stmt !== ";") {
                $statements[] = $stmt;
            }
        }
    }
    if (trim($buf) !== "") {
        $statements[] = trim($buf);
    }

    $ok = 0;
    $fail = 0;
    $errors = [];
    foreach ($statements as $i => $stmt) {
        try {
            $db->exec($stmt);
            $ok++;
        } catch (Throwable $e) {
            $msg = $e->getMessage();
            // Tolerant re-run: duplicate index / already exists
            if (
                stripos($msg, "Duplicate") !== false
                || stripos($msg, "already exists") !== false
                || stripos($msg, "Duplicate key name") !== false
            ) {
                $ok++;
                continue;
            }
            $fail++;
            $errors[] = "FAIL #$i: $msg";
        }
    }
    return ["ok" => $ok, "fail" => $fail, "errors" => $errors];
}

$db = db_conn();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$totalFail = 0;
foreach ($files as $file) {
    $path = $migrationsDir . DIRECTORY_SEPARATOR . $file;
    if (!is_file($path)) {
        fwrite(STDERR, "MISSING $file\n");
        $totalFail++;
        continue;
    }
    echo "APPLY $file …\n";
    $r = apply_sql_file($db, $path);
    echo "  statements ok={$r["ok"]} fail={$r["fail"]}\n";
    foreach ($r["errors"] as $e) {
        fwrite(STDERR, "  $e\n");
    }
    $totalFail += $r["fail"];
}

$tables = $db->query("SHOW TABLES LIKE 'company_%'")->fetchAll(PDO::FETCH_COLUMN);
sort($tables);
echo "company_tables=" . count($tables) . "\n";
echo $totalFail === 0 ? "MIGRATION PASS\n" : "MIGRATION FAIL fail=$totalFail\n";
echo "NOTE: company migrations have no DOWN scripts. Rollback = restore from backup.\n";
exit($totalFail > 0 ? 1 : 0);
