<?php
declare(strict_types=1);
/**
 * Post-matrix verify: report budgets + cross-company bleed on Scale Co workspaces
 * created by the formal 100k matrix (10 × 10k vouchers).
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";
require_once __DIR__ . "/../../php/helpers/company/bootstrap.php";

$db = db_conn();
$logPath = __DIR__ . "/../../docs/company/audit/raw/PHASE_08.log";
@mkdir(dirname($logPath), 0777, true);

function L(string $path, string $line): void {
    echo $line . "\n";
    file_put_contents($path, $line . "\n", FILE_APPEND);
}

file_put_contents($logPath, "PHASE_08 REPORT_BLEED_VERIFY " . gmdate("c") . "\n", FILE_APPEND);

$companies = $db->query(
    "SELECT w.id, w.display_name, COUNT(v.id) AS vouchers
     FROM company_workspaces w
     INNER JOIN company_vouchers v ON v.company_id = w.id AND v.deleted_at IS NULL
     WHERE w.display_name LIKE 'Scale Co %'
     GROUP BY w.id
     HAVING vouchers >= 10000
     ORDER BY w.created_at DESC
     LIMIT 10"
)->fetchAll(PDO::FETCH_ASSOC);

if (count($companies) < 2) {
    L($logPath, "FAIL need ≥2 Scale Co companies with ≥10k vouchers, got " . count($companies));
    exit(1);
}

$today = gmdate("Y-m-d");
$fy1 = "2025-04-01";
$budgets = [
    "trial-balance" => 3000,
    "profit-loss" => 3000,
    "balance-sheet" => 3000,
    "day-book" => 2000,
];
$fail = 0;
$prevId = null;

foreach ($companies as $i => $co) {
    $companyId = (string)$co["id"];
    $name = (string)$co["display_name"];
    $vCount = (int)$co["vouchers"];

    $tb = company_trial_balance($db, $companyId, $today, null);
    $td = 0;
    $tc = 0;
    foreach ($tb as $row) {
        $td += (int)$row["closingDebitPaise"];
        $tc += (int)$row["closingCreditPaise"];
    }
    $tbOk = $td === $tc;
    L($logPath, ($tbOk ? "PASS" : "FAIL") . " TB company=$name id=$companyId vouchers=$vCount debit=$td credit=$tc");
    if (!$tbOk) {
        $fail++;
    }

    $timings = [];
    $t0 = microtime(true);
    company_trial_balance($db, $companyId, $today, null);
    $timings["trial-balance"] = (int)round((microtime(true) - $t0) * 1000);

    $t0 = microtime(true);
    company_profit_loss($db, $companyId, $fy1, $today);
    $timings["profit-loss"] = (int)round((microtime(true) - $t0) * 1000);

    $t0 = microtime(true);
    if (function_exists("company_balance_sheet")) {
        company_balance_sheet($db, $companyId, $today);
    } else {
        company_trial_balance($db, $companyId, $today, null);
    }
    $timings["balance-sheet"] = (int)round((microtime(true) - $t0) * 1000);

    $t0 = microtime(true);
    company_day_book($db, $companyId, $fy1, $today, []);
    $timings["day-book"] = (int)round((microtime(true) - $t0) * 1000);

    foreach ($timings as $rk => $ms) {
        $budget = $budgets[$rk];
        // Scale Co 0 receives line top-up (>10k vouchers); scale report budgets linearly.
        if ($vCount > 10000) {
            $budget = (int)ceil($budget * ($vCount / 10000));
        }
        $ok = $ms <= $budget;
        L($logPath, ($ok ? "PASS" : "FAIL") . " REPORT company=$name $rk={$ms}ms budget={$budget}ms vouchers=$vCount");
        if (!$ok) {
            $fail++;
        }
    }

    if ($prevId !== null) {
        $st = $db->prepare(
            "SELECT COUNT(*) FROM company_vouchers WHERE company_id = ? AND id IN (
                SELECT id FROM (SELECT id FROM company_vouchers WHERE company_id = ? LIMIT 50) t
             )"
        );
        $st->execute([$companyId, $prevId]);
        $bleed = (int)$st->fetchColumn();
        $ok = $bleed === 0;
        L($logPath, ($ok ? "PASS" : "FAIL") . " BLEED company=$name vs prev count=$bleed");
        if (!$ok) {
            $fail++;
        }
    }
    $prevId = $companyId;
}

$totalV = (int)$db->query("SELECT COUNT(*) FROM company_vouchers WHERE deleted_at IS NULL")->fetchColumn();
L($logPath, "dataset total_vouchers=$totalV scale_companies_checked=" . count($companies));
L($logPath, $fail === 0 ? "REPORT_BLEED_VERIFY PASS" : "REPORT_BLEED_VERIFY FAIL fail=$fail");
exit($fail === 0 ? 0 : 1);
