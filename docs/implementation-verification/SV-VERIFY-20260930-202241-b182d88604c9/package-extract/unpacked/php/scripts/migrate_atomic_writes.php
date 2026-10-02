<?php
/** Additive migration only; explicit database confirmation prevents targeting the wrong environment. */
if (PHP_SAPI !== "cli") { http_response_code(403); exit; }
require_once __DIR__ . "/../config/db.php";

$options = getopt("", ["database:", "apply"]);
$db = db_conn();
$database = (string)$db->query("SELECT DATABASE()")->fetchColumn();
if (($options["database"] ?? "") !== $database || !array_key_exists("apply", $options)) {
    fwrite(STDERR, "No changes applied. Run with --database=EXACT_DATABASE_NAME --apply after reviewing the target and backup.\n");
    exit(2);
}
$root = dirname(__DIR__, 2);
$migration = $root . "/sql/migrations/20260910_atomic_writes.sql";
if (!is_file($migration)) $migration = $root . "/20260910_atomic_writes.sql";
$sql = file_get_contents($migration);
if ($sql === false) throw new RuntimeException("Migration file is missing");
$db->exec($sql);
foreach (["financial_write_receipts", "financial_entity_tombstones"] as $table) {
    $db->query("SELECT 1 FROM " . $table . " LIMIT 0");
}
echo "Atomic-write metadata migration verified for " . $database . ". Existing financial rows were not changed.\n";
