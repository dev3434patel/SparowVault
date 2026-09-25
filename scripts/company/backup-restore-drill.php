<?php
declare(strict_types=1);
/**
 * Real mysqldump backup → DROP TEST DB → restore → checksum compare.
 * NEVER drops DB_NAME. Uses COMPANY_CERT_TEST_DB (default sparowvault_cert_restore).
 */
require_once __DIR__ . "/../../php/config/env.php";

$host = getenv("DB_HOST") ?: "127.0.0.1";
$user = getenv("DB_USER") ?: "root";
$pass = getenv("DB_PASS") ?: "";
$srcDb = getenv("DB_NAME") ?: "";
$testDb = getenv("COMPANY_CERT_TEST_DB") ?: "sparowvault_cert_restore";
$dumpBin = getenv("MYSQLDUMP_BIN") ?: "C:\\xampp\\mysql\\bin\\mysqldump.exe";
$mysqlBin = getenv("MYSQL_BIN") ?: "C:\\xampp\\mysql\\bin\\mysql.exe";

if ($srcDb === "" || strcasecmp($srcDb, $testDb) === 0) {
    fwrite(STDERR, "Refusing: DB_NAME must differ from COMPANY_CERT_TEST_DB\n");
    exit(1);
}
if (!is_file($dumpBin) || !is_file($mysqlBin)) {
    fwrite(STDERR, "mysqldump/mysql binaries missing\n");
    exit(2);
}

$outDir = getenv("COMPANY_CERT_EVIDENCE_DIR") ?: (__DIR__ . "/../../docs/company/final-certification/adhoc/raw");
if (!is_dir($outDir)) {
    mkdir($outDir, 0777, true);
}
$dumpFile = $outDir . DIRECTORY_SEPARATOR . "company_backup_" . date("Ymd_His") . ".sql";

function pdo_admin(string $host, string $user, string $pass, ?string $db = null): PDO {
    $dsn = "mysql:host={$host}" . ($db ? ";dbname={$db}" : "") . ";charset=utf8mb4";
    return new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
}

function company_checksums(PDO $db): array {
    $tables = $db->query("SHOW TABLES LIKE 'company_%'")->fetchAll(PDO::FETCH_COLUMN);
    sort($tables);
    $out = ["tables" => count($tables)];
    foreach ($tables as $t) {
        if (!preg_match('/^[a-z0-9_]+$/i', $t)) {
            continue;
        }
        $out[$t] = (int)$db->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
    }
    $dr = (int)$db->query(
        "SELECT COALESCE(SUM(l.amount_paise),0) FROM company_voucher_lines l
         INNER JOIN company_vouchers v ON v.id=l.voucher_id AND v.company_id=l.company_id
         WHERE v.status='POSTED' AND v.deleted_at IS NULL AND l.side='DEBIT'"
    )->fetchColumn();
    $cr = (int)$db->query(
        "SELECT COALESCE(SUM(l.amount_paise),0) FROM company_voucher_lines l
         INNER JOIN company_vouchers v ON v.id=l.voucher_id AND v.company_id=l.company_id
         WHERE v.status='POSTED' AND v.deleted_at IS NULL AND l.side='CREDIT'"
    )->fetchColumn();
    $out["posted_debit_paise"] = $dr;
    $out["posted_credit_paise"] = $cr;
    $out["tb_balanced"] = $dr === $cr ? 1 : 0;
    return $out;
}

$lines = [];
$lines[] = "BACKUP RESTORE DRILL " . gmdate("c");
$lines[] = "SRC_DB=$srcDb TEST_DB=$testDb";

$src = pdo_admin($host, $user, $pass, $srcDb);
$pre = company_checksums($src);
$lines[] = "PRE " . json_encode($pre);

$tables = $src->query("SHOW TABLES LIKE 'company_%'")->fetchAll(PDO::FETCH_COLUMN);
if ($tables === []) {
    fwrite(STDERR, "No company_* tables\n");
    exit(1);
}

$passPart = $pass === "" ? "" : "-p" . $pass;
$args = ["-h$host", "-u$user"];
if ($passPart !== "") {
    $args[] = $passPart;
}
$args[] = "--single-transaction";
$args[] = $srcDb;
foreach ($tables as $t) {
    $args[] = $t;
}
$cmd = escapeshellarg($dumpBin) . " " . implode(" ", array_map("escapeshellarg", $args));
// On Windows escapeshellarg quoting differs — build carefully
$cmd = '"' . $dumpBin . '" -h' . $host . ' -u' . $user . ($pass !== "" ? " -p" . $pass : "") .
    " --single-transaction " . $srcDb . " " . implode(" ", $tables);
$lines[] = "DUMP_CMD=" . preg_replace('/-p\S+/', '-p***', $cmd);

$descriptors = [1 => ["file", $dumpFile, "w"], 2 => ["pipe", "w"]];
$proc = proc_open($cmd, $descriptors, $pipes, null, null, ["bypass_shell" => false]);
$err = "";
if (is_resource($proc)) {
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    $code = proc_close($proc);
} else {
    $code = 1;
    $err = "proc_open failed";
}
if ($code !== 0 || !is_file($dumpFile) || filesize($dumpFile) < 200) {
    $lines[] = "DUMP_FAIL code=$code $err";
    file_put_contents($outDir . "/EVIDENCE_COMPANY_BACKUP_RESTORE.txt", implode("\n", $lines) . "\n");
    exit(1);
}
$size = filesize($dumpFile);
$hash = hash_file("sha256", $dumpFile);
$lines[] = "DUMP_OK SIZE=$size SHA256=$hash";

$admin = pdo_admin($host, $user, $pass, null);
$admin->exec("DROP DATABASE IF EXISTS `{$testDb}`");
$admin->exec("CREATE DATABASE `{$testDb}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$lines[] = "DESTROYED_AND_RECREATED $testDb";

$cmdRestore = '"' . $mysqlBin . '" -h' . $host . ' -u' . $user . ($pass !== "" ? " -p" . $pass : "") . " " . $testDb;
$lines[] = "RESTORE_CMD=" . preg_replace('/-p\S+/', '-p***', $cmdRestore);
$descriptors = [0 => ["file", $dumpFile, "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]];
$proc = proc_open($cmdRestore, $descriptors, $pipes);
$err = "";
if (is_resource($proc)) {
    $err = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $code = proc_close($proc);
} else {
    $code = 1;
}
$lines[] = "RESTORE_EXIT=$code " . substr($err, 0, 300);
if ($code !== 0) {
    file_put_contents($outDir . "/EVIDENCE_COMPANY_BACKUP_RESTORE.txt", implode("\n", $lines) . "\n");
    exit(1);
}

$dst = pdo_admin($host, $user, $pass, $testDb);
$post = company_checksums($dst);
$lines[] = "POST " . json_encode($post);

$match = true;
foreach ($pre as $k => $v) {
    if (($post[$k] ?? null) != $v) {
        $match = false;
        $lines[] = "MISMATCH $k";
    }
}
$ok = $match && (int)$pre["tb_balanced"] === 1;
$lines[] = ($ok ? "PASS" : "FAIL") . " backup_restore_checksum";
file_put_contents($outDir . "/EVIDENCE_COMPANY_BACKUP_RESTORE.txt", implode("\n", $lines) . "\n");
echo implode("\n", $lines) . "\n";
exit($ok ? 0 : 1);
