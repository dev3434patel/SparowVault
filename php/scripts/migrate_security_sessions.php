<?php
if (PHP_SAPI !== "cli") { http_response_code(403); exit; }
require_once __DIR__ . "/../helpers/app.php";
$options = getopt("", ["database:", "apply"]);
$destructive = destructive_database_target_decision();
$requestedDatabase = (string)($options["database"] ?? "");
if ($destructive["outcome"] !== "allowed") {
    fwrite(STDERR, $destructive["detail"] . PHP_EOL);
    exit(2);
}
if (!destructive_database_name_allowed($requestedDatabase)) {
    fwrite(STDERR, "Refusing destructive runner: database is not allowlisted." . PHP_EOL);
    exit(2);
}
require_once __DIR__ . "/../config/db.php";
$db = db_conn();
$database = (string)$db->query("SELECT DATABASE()")->fetchColumn();
if (($options["database"] ?? "") !== $database || !array_key_exists("apply", $options)) {
    fwrite(STDERR, "No changes applied. Review backup and target, then pass --database=EXACT_NAME --apply.\n"); exit(2);
}
$root = dirname(__DIR__, 2);
$file = $root . "/sql/migrations/20260911_security_sessions.sql";
if (!is_file($file)) $file = $root . "/20260911_security_sessions.sql";
$db->exec(file_get_contents($file));
echo "Session/recovery migration applied to " . $database . ". Legacy sessions require login again.\n";
