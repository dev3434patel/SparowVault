<?php
declare(strict_types=1);
if (PHP_SAPI !== "cli") { http_response_code(403); exit; }
require_once __DIR__ . "/../php/helpers/app.php";
$destructive = destructive_database_target_decision();
if ($destructive["outcome"] !== "allowed") {
    fwrite(STDERR, $destructive["detail"] . PHP_EOL);
    exit(2);
}
require_once __DIR__ . "/../php/config/db.php";

// Backups contain credentials and financial records. Never put them in the web root.
umask(0077);
$config = $partial = $errorFile = $stem = null;
$published = false;
$exitCode = 0;
try {
    $directory = (string)(getenv("BACKUP_DIR") ?: "");
    $isAbsolute = str_starts_with($directory, "/") || (bool)preg_match('/^[A-Za-z]:[\\\\\\/]/', $directory);
    if ($directory === "" || !$isAbsolute) throw new RuntimeException("Set BACKUP_DIR to a private absolute directory outside the application/web root");
    if (!is_dir($directory) && !mkdir($directory, 0700, true)) throw new RuntimeException("Cannot create backup directory");
    $directory = realpath($directory);
    $root = realpath(__DIR__ . "/..");
    if (!$directory || !$root) throw new RuntimeException("Cannot resolve backup directory");
    $normDir = strtolower(str_replace("\\", "/", $directory));
    $normRoot = strtolower(str_replace("\\", "/", $root));
    if ($normDir === $normRoot || str_starts_with($normDir, $normRoot . "/")) throw new RuntimeException("Backup directory must be outside the application/web root");
    // Windows ACL privacy differs from Unix mode bits; enforce chmod 700 only where POSIX modes apply.
    if (DIRECTORY_SEPARATOR === "/" && (fileperms($directory) & 0077) !== 0) throw new RuntimeException("Backup directory must be private (chmod 700)");
    $db = db_conn();
    $database = (string)$db->query("SELECT DATABASE()")->fetchColumn();
    $check = $db->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE' AND engine <> 'InnoDB'");
    $check->execute([$database]);
    if ((int)$check->fetchColumn() !== 0) throw new RuntimeException("Consistent online snapshot requires InnoDB tables; use a maintenance-window backup for other engines");
    $url = env_value("DATABASE_URL");
    $parts = $url && str_starts_with($url, "mysql://") ? parse_url($url) : [];
    $host = $parts["host"] ?? env_value("DB_HOST", "127.0.0.1");
    $port = $parts["port"] ?? env_value("DB_PORT", "3306");
    $user = isset($parts["user"]) ? urldecode($parts["user"]) : env_value("DB_USER", "");
    $password = isset($parts["pass"]) ? urldecode($parts["pass"]) : env_value("DB_PASS", "");
    $escape = fn($value) => '"' . str_replace(["\\", '"', "\n", "\r"], ["\\\\", '\\"', '\\n', '\\r'], (string)$value) . '"';
    $config = tempnam($directory, ".client-");
    if (!$config || file_put_contents($config, "[client]\nhost=" . $escape($host) . "\nport=" . $escape($port) . "\nuser=" . $escape($user) . "\npassword=" . $escape($password) . "\nprotocol=tcp\n") === false) throw new RuntimeException("Cannot create private client configuration");
    $stem = $directory . "/db_" . gmdate("Ymd_His") . "_" . bin2hex(random_bytes(6));
    $partial = $stem . ".sql.part";
    $errorFile = $stem . ".stderr.part";
    $binary = (string)(getenv("MYSQLDUMP_BIN") ?: "mysqldump");
    $process = proc_open([$binary, "--defaults-extra-file=" . $config, "--single-transaction", "--quick", "--skip-lock-tables", "--hex-blob", "--routines", "--events", "--triggers", $database], [0 => ["pipe", "r"], 1 => ["file", $partial, "w"], 2 => ["file", $errorFile, "w"]], $pipes);
    if (!is_resource($process)) throw new RuntimeException("Cannot start mysqldump; set MYSQLDUMP_BIN");
    fclose($pipes[0]);
    $status = proc_close($process);
    if ($status !== 0 || !is_file($partial) || filesize($partial) === 0) throw new RuntimeException("Database snapshot failed (exit " . $status . "). Check dump-tool availability and privileges; no backup was published");
    $manifest = ["version" => 1, "database" => $database, "createdAt" => gmdate("c"), "file" => basename($stem . ".sql"), "sha256" => hash_file("sha256", $partial), "bytes" => filesize($partial), "consistentInnoDbSnapshot" => true, "encrypted" => false, "restoreVerified" => false];
    if (file_put_contents($stem . ".json.part", json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)) === false) throw new RuntimeException("Cannot write snapshot manifest");
    if (!rename($partial, $stem . ".sql") || !rename($stem . ".json.part", $stem . ".json")) throw new RuntimeException("Cannot publish snapshot and manifest");
    $published = true;
    echo json_encode(["backup" => $stem . ".sql", "manifest" => $stem . ".json", "encrypted" => false, "restoreVerified" => false], JSON_THROW_ON_ERROR) . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, "Backup failed: " . $error->getMessage() . PHP_EOL);
    $exitCode = 1;
} finally {
    $cleanup = [$config, $partial, $errorFile];
    if (!$published && $stem) $cleanup = array_merge($cleanup, [$stem . ".sql", $stem . ".json", $stem . ".json.part"]);
    foreach ($cleanup as $file) if ($file && is_file($file)) unlink($file);
}
exit($exitCode);
