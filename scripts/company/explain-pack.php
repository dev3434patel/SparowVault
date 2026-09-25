<?php
declare(strict_types=1);
/**
 * PHASE_08 — EXPLAIN pack for 8 hot company queries on a ≥100k-voucher dataset.
 * Applies sql/migrations/20260924_company_perf_indexes.sql then re-EXPLAINs.
 *
 * Exit 0 iff every query uses an index (no full table scan on large fact tables).
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";

$db = db_conn();
$logPath = __DIR__ . "/../../docs/company/audit/raw/PHASE_08.log";
@mkdir(dirname($logPath), 0777, true);

function log_line(string $path, string $line): void {
    echo $line . "\n";
    file_put_contents($path, $line . "\n", FILE_APPEND);
}

file_put_contents($logPath, "PHASE_08 EXPLAIN " . gmdate("c") . "\n", FILE_APPEND);

$row = $db->query(
    "SELECT company_id, COUNT(*) AS c FROM company_vouchers WHERE deleted_at IS NULL
     GROUP BY company_id ORDER BY c DESC LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    log_line($logPath, "FAIL no company_vouchers data");
    exit(1);
}
$companyId = (string)$row["company_id"];
$voucherCount = (int)$row["c"];
$totalV = (int)$db->query("SELECT COUNT(*) FROM company_vouchers WHERE deleted_at IS NULL")->fetchColumn();
log_line($logPath, "dataset company=$companyId vouchers_in_company=$voucherCount total_vouchers=$totalV");
if ($totalV < 100000 && $voucherCount < 10000) {
    log_line($logPath, "WARN dataset below 100k total — continuing with largest company only");
}

$today = gmdate("Y-m-d");
$from = gmdate("Y-m-d", strtotime("-90 days"));
$partyId = (string)($db->query(
    "SELECT id FROM company_parties WHERE company_id=" . $db->quote($companyId) . " AND deleted_at IS NULL LIMIT 1"
)->fetchColumn() ?: "");

/** @return list<array<string,mixed>> */
function explain_rows(PDO $db, string $sql, array $params = []): array {
    $st = $db->prepare("EXPLAIN " . $sql);
    $st->execute($params);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

function plan_uses_index(array $rows, array $factTables): array {
    $bad = [];
    foreach ($rows as $r) {
        $table = (string)($r["table"] ?? "");
        $type = strtolower((string)($r["type"] ?? ""));
        $key = (string)($r["key"] ?? "");
        $extra = (string)($r["Extra"] ?? "");
        if ($table === "" || $table === null) continue;
        // Derived/subquery aliases — skip soft checks
        if (str_starts_with($table, "<") || $table === "derived") continue;
        $isFact = false;
        foreach ($factTables as $ft) {
            if ($table === $ft || str_contains($table, $ft)) {
                $isFact = true;
                break;
            }
        }
        if (!$isFact) continue;
        if ($type === "all" || ($key === "" && $type !== "system" && $type !== "const")) {
            $bad[] = "table=$table type=$type key=" . ($key ?: "NULL") . " extra=$extra";
        }
    }
    return $bad;
}

$queries = [
    "voucher_list_filters" => [
        "sql" => "SELECT v.id, v.voucher_number, v.voucher_type, v.voucher_date, v.status
                  FROM company_vouchers v
                  WHERE v.company_id = ? AND v.deleted_at IS NULL
                    AND v.voucher_date >= ? AND v.voucher_date <= ?
                    AND v.status = 'POSTED'
                  ORDER BY v.voucher_date DESC, v.voucher_number DESC
                  LIMIT 100",
        "params" => [$companyId, $from, $today],
        "facts" => ["company_vouchers", "v"],
    ],
    "party_balance" => [
        "sql" => "SELECT party_id, side, SUM(outstanding_paise) AS outstanding_paise
                  FROM company_bill_refs
                  WHERE company_id = ? AND status IN ('OPEN','PARTIAL') AND outstanding_paise > 0
                  GROUP BY party_id, side",
        "params" => [$companyId],
        "facts" => ["company_bill_refs"],
    ],
    "bills_ageing" => [
        "sql" => "SELECT b.id, b.party_id, b.outstanding_paise, b.due_date, b.bill_date
                  FROM company_bill_refs b
                  INNER JOIN company_parties p ON p.id = b.party_id AND p.company_id = b.company_id
                  WHERE b.company_id = ? AND b.side = 'PAYABLE' AND b.status IN ('OPEN','PARTIAL')
                    AND b.outstanding_paise > 0 AND b.bill_date <= ?
                  ORDER BY b.due_date ASC
                  LIMIT 500",
        "params" => [$companyId, $today],
        "facts" => ["company_bill_refs", "b", "company_parties", "p"],
    ],
    "trial_balance" => [
        "sql" => "SELECT lg.id, COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) AS debit_paise
                  FROM company_ledgers lg
                  LEFT JOIN company_voucher_lines l ON l.ledger_id = lg.id AND l.company_id = lg.company_id
                  LEFT JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
                    AND v.status = 'POSTED' AND v.deleted_at IS NULL AND v.voucher_date <= ?
                  WHERE lg.company_id = ? AND lg.deleted_at IS NULL
                  GROUP BY lg.id
                  LIMIT 500",
        "params" => [$today, $companyId],
        "facts" => ["company_voucher_lines", "l", "company_vouchers", "v", "company_ledgers", "lg"],
    ],
    "profit_loss" => [
        "sql" => "SELECT lg.id, g.nature,
                         COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_paise ELSE 0 END), 0) AS credit_paise
                  FROM company_ledgers lg
                  INNER JOIN company_account_groups g ON g.id = lg.group_id AND g.company_id = lg.company_id
                  INNER JOIN company_voucher_lines l ON l.ledger_id = lg.id AND l.company_id = lg.company_id
                  INNER JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
                  WHERE lg.company_id = ? AND g.nature IN ('INCOME','EXPENSE')
                    AND v.status = 'POSTED' AND v.deleted_at IS NULL
                    AND v.voucher_date >= ? AND v.voucher_date <= ?
                    AND lg.deleted_at IS NULL
                  GROUP BY lg.id, g.nature",
        "params" => [$companyId, $from, $today],
        "facts" => ["company_voucher_lines", "l", "company_vouchers", "v"],
    ],
    "balance_sheet" => [
        "sql" => "SELECT lg.id, g.nature,
                         COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) AS debit_paise
                  FROM company_ledgers lg
                  INNER JOIN company_account_groups g ON g.id = lg.group_id AND g.company_id = lg.company_id
                  LEFT JOIN company_voucher_lines l ON l.ledger_id = lg.id AND l.company_id = lg.company_id
                  LEFT JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
                    AND v.status = 'POSTED' AND v.deleted_at IS NULL AND v.voucher_date <= ?
                  WHERE lg.company_id = ? AND g.nature IN ('ASSET','LIABILITY','EQUITY')
                    AND lg.deleted_at IS NULL
                  GROUP BY lg.id, g.nature",
        "params" => [$today, $companyId],
        "facts" => ["company_voucher_lines", "l", "company_vouchers", "v"],
    ],
    "search" => [
        "sql" => "SELECT id, voucher_number, voucher_type, voucher_date, status
                  FROM company_vouchers
                  WHERE company_id = ? AND deleted_at IS NULL
                    AND (voucher_number LIKE ? OR narration LIKE ?)
                  ORDER BY voucher_date DESC
                  LIMIT 50",
        "params" => [$companyId, "PAY-%", "%expense%"],
        "facts" => ["company_vouchers"],
    ],
    "audit_log" => [
        "sql" => "SELECT id, action, entity_type, entity_id, created_at
                  FROM company_audit_logs
                  WHERE company_id = ? AND created_at >= ? AND created_at <= ?
                  ORDER BY created_at DESC
                  LIMIT 100",
        "params" => [$companyId, $from . " 00:00:00", $today . " 23:59:59"],
        "facts" => ["company_audit_logs"],
    ],
];

function dump_explain(string $logPath, string $label, string $name, array $rows): void {
    log_line($logPath, "--- EXPLAIN $label $name ---");
    foreach ($rows as $r) {
        log_line(
            $logPath,
            sprintf(
                "  id=%s select_type=%s table=%s type=%s key=%s rows=%s Extra=%s",
                $r["id"] ?? "",
                $r["select_type"] ?? "",
                $r["table"] ?? "",
                $r["type"] ?? "",
                $r["key"] ?? "NULL",
                $r["rows"] ?? "",
                $r["Extra"] ?? ""
            )
        );
    }
}

$beforeFail = 0;
foreach ($queries as $name => $q) {
    $rows = explain_rows($db, $q["sql"], $q["params"]);
    dump_explain($logPath, "BEFORE", $name, $rows);
    $bad = plan_uses_index($rows, $q["facts"]);
    if ($bad) {
        $beforeFail++;
        log_line($logPath, "BEFORE_SCAN $name :: " . implode(" | ", $bad));
    } else {
        log_line($logPath, "BEFORE_OK $name");
    }
}

// Apply migration (tolerant of duplicate indexes)
$migration = file_get_contents(__DIR__ . "/../../sql/migrations/20260924_company_perf_indexes.sql");
$statements = array_filter(array_map("trim", preg_split('/;\s*\n/', $migration) ?: []));
foreach ($statements as $stmt) {
    if ($stmt === "" || str_starts_with($stmt, "--")) continue;
    // Strip leading comment lines
    $clean = preg_replace('/^--.*$/m', "", $stmt) ?? $stmt;
    $clean = trim($clean);
    if ($clean === "") continue;
    try {
        $db->exec($clean);
        log_line($logPath, "INDEX_OK " . substr(preg_replace('/\s+/', " ", $clean) ?? $clean, 0, 80));
    } catch (Throwable $e) {
        $msg = $e->getMessage();
        if (stripos($msg, "Duplicate") !== false || stripos($msg, "exists") !== false) {
            log_line($logPath, "INDEX_SKIP " . $msg);
        } else {
            // Fallback without IF NOT EXISTS for older MySQL
            $alt = preg_replace('/IF NOT EXISTS\s+/i', "", $clean) ?? $clean;
            try {
                $db->exec($alt);
                log_line($logPath, "INDEX_OK_ALT " . substr($alt, 0, 80));
            } catch (Throwable $e2) {
                if (stripos($e2->getMessage(), "Duplicate") !== false) {
                    log_line($logPath, "INDEX_SKIP " . $e2->getMessage());
                } else {
                    log_line($logPath, "INDEX_ERR " . $e2->getMessage());
                }
            }
        }
    }
}

$afterFail = 0;
foreach ($queries as $name => $q) {
    $rows = explain_rows($db, $q["sql"], $q["params"]);
    dump_explain($logPath, "AFTER", $name, $rows);
    $bad = plan_uses_index($rows, $q["facts"]);
    if ($bad) {
        $afterFail++;
        log_line($logPath, "AFTER_SCAN $name :: " . implode(" | ", $bad));
    } else {
        log_line($logPath, "AFTER_OK $name");
    }
}

// Cross-company bleed smoke: voucher from company A must not appear under company B filter
// (MariaDB rejects LIMIT inside IN-subquery unless wrapped in a derived table.)
$ids = $db->query(
    "SELECT company_id, COUNT(*) c FROM company_vouchers WHERE deleted_at IS NULL GROUP BY company_id ORDER BY c DESC LIMIT 2"
)->fetchAll(PDO::FETCH_ASSOC);
$bleedFail = false;
if (count($ids) >= 2) {
    $a = (string)$ids[0]["company_id"];
    $b = (string)$ids[1]["company_id"];
    $st = $db->prepare(
        "SELECT COUNT(*) FROM company_vouchers WHERE company_id = ? AND id IN (
            SELECT id FROM (SELECT id FROM company_vouchers WHERE company_id = ? LIMIT 20) t
         )"
    );
    $st->execute([$b, $a]);
    $bleed = (int)$st->fetchColumn();
    log_line($logPath, ($bleed === 0 ? "PASS" : "FAIL") . " cross-company-bleed count=$bleed");
    if ($bleed !== 0) {
        $bleedFail = true;
    }
}

$pass = $afterFail === 0 && !$bleedFail;
log_line($logPath, "EXPLAIN SUMMARY before_scans=$beforeFail after_scans=$afterFail " . ($pass ? "PASS" : "FAIL"));
exit($pass ? 0 : 1);
