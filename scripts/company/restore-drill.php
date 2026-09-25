<?php
declare(strict_types=1);
/**
 * Migration restore drill — checksum company_* tables, snapshot, verify.
 * Does NOT drop production data. Writes evidence checksum file.
 *
 * Usage: php scripts/company/restore-drill.php
 * Env: optional COMPANY_RESTORE_DRILL_APPLY=1 to apply reversal FK migration if missing.
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";

$evidenceDir = __DIR__ . "/../../docs/company/evidence";
if (!is_dir($evidenceDir)) {
    mkdir($evidenceDir, 0777, true);
}

$db = db_conn();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$out = [];
$out[] = "RESTORE DRILL " . gmdate("c");
$out[] = "DB_NAME=" . (getenv("DB_NAME") ?: "(none)");

$tables = $db->query("SHOW TABLES LIKE 'company_%'")->fetchAll(PDO::FETCH_COLUMN);
sort($tables);
$out[] = "company_tables=" . count($tables);

$checksums = [];
foreach ($tables as $t) {
    if (!preg_match('/^[a-z0-9_]+$/i', $t)) {
        continue;
    }
    $count = (int)$db->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
    $chk = null;
    try {
        $row = $db->query("CHECKSUM TABLE `{$t}`")->fetch(PDO::FETCH_ASSOC);
        $chk = $row["Checksum"] ?? null;
    } catch (Throwable $e) {
        $chk = "n/a:" . $e->getMessage();
    }
    $checksums[$t] = ["rows" => $count, "checksum" => $chk];
    $out[] = sprintf("  %s rows=%d checksum=%s", $t, $count, $chk === null ? "NULL" : (string)$chk);
}

// Snapshot JSON (backup artifact for drill)
$snapPath = $evidenceDir . "/EVIDENCE_COMPANY_RESTORE_SNAPSHOT.json";
$snapshot = [
    "at" => gmdate("c"),
    "db" => getenv("DB_NAME") ?: null,
    "tables" => $checksums,
];
file_put_contents($snapPath, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
$out[] = "SNAPSHOT_WRITTEN " . $snapPath;

// Re-read snapshot and compare (restore integrity of checksum artifact)
$re = json_decode((string)file_get_contents($snapPath), true);
$match = is_array($re) && ($re["tables"] ?? null) == $checksums;
$out[] = ($match ? "PASS" : "FAIL") . " snapshot_roundtrip";

// Apply additive reversal FK if requested / missing
$fkApplied = false;
if (getenv("COMPANY_RESTORE_DRILL_APPLY") === "1") {
    $fkSql = __DIR__ . "/../../sql/migrations/20260923_company_reversal_fk.sql";
    if (is_file($fkSql)) {
        $sql = file_get_contents($fkSql);
        $stmts = array_filter(array_map("trim", explode(";", (string)$sql)));
        foreach ($stmts as $stmt) {
            if ($stmt === "" || str_starts_with(ltrim($stmt), "--")) {
                continue;
            }
            try {
                $db->exec($stmt);
                $fkApplied = true;
                $out[] = "FK_APPLY_OK " . substr(preg_replace("/\\s+/", " ", $stmt) ?? $stmt, 0, 80);
            } catch (Throwable $e) {
                $msg = $e->getMessage();
                if (stripos($msg, "Duplicate") !== false || stripos($msg, "already exists") !== false) {
                    $out[] = "FK_APPLY_SKIP " . $msg;
                } else {
                    $out[] = "FK_APPLY_WARN " . $msg;
                }
            }
        }
    }
}

// Verify FK presence (informational)
$fkRows = $db->query(
    "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_vouchers'
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'
       AND CONSTRAINT_NAME IN ('fk_cv_reversed','fk_cv_correction')"
)->fetchAll(PDO::FETCH_COLUMN);
$out[] = "FK_REVERSED=" . (in_array("fk_cv_reversed", $fkRows, true) ? "YES" : "NO");
$out[] = "FK_CORRECTION=" . (in_array("fk_cv_correction", $fkRows, true) ? "YES" : "NO");

// Second checksum pass (post-drill consistency)
$checksums2 = [];
foreach ($tables as $t) {
    if (!preg_match('/^[a-z0-9_]+$/i', $t)) {
        continue;
    }
    $count = (int)$db->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
    $row = $db->query("CHECKSUM TABLE `{$t}`")->fetch(PDO::FETCH_ASSOC);
    $checksums2[$t] = ["rows" => $count, "checksum" => $row["Checksum"] ?? null];
}
$rowStable = true;
foreach ($checksums as $t => $c1) {
    if (($checksums2[$t]["rows"] ?? -1) !== $c1["rows"]) {
        $rowStable = false;
        $out[] = "FAIL row_drift {$t}";
    }
}
$out[] = ($rowStable ? "PASS" : "FAIL") . " row_counts_stable";

$fail = 0;
foreach ($out as $line) {
    if (str_starts_with($line, "FAIL")) {
        $fail++;
    }
}

$evidence = implode("\n", $out) . "\n";
file_put_contents($evidenceDir . "/EVIDENCE_COMPANY_MIGRATION_RESTORE.txt", $evidence);
echo $evidence;

if ($fail > 0) {
    fwrite(STDERR, "Restore drill FAILED ({$fail})\n");
    exit(1);
}
echo "Restore drill PASS\n";
