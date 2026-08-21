<?php
/**
 * Phase 13 — daily retention sweeper.
 *
 * Schedules:
 *   - hard-delete users.soft-deleted rows older than 30 days (deleted_at)
 *   - clean login_attempts > 7 days
 *   - clean api_rate_limits > 1 day
 *   - clean webhook_events older than 90 days IF processing_status='processed'
 *   - clean user_audit_logs older than 730 days (configurable)
 *
 * Usage:
 *   php scripts/retention-sweeper.php [--dry-run]
 *   Cron example: 0 3 * * *  php /var/www/sparowvault/scripts/retention-sweeper.php
 *
 * Logs every run to retention_jobs.
 */
declare(strict_types=1);

require_once __DIR__ . "/../php/config/env.php";
require_once __DIR__ . "/../php/config/db.php";

$dryRun = in_array("--dry-run", $argv, true);

$db = db_conn();

function start_job(PDO $db, string $key): int {
    $db->prepare("INSERT INTO retention_jobs (job_key, started_at, status) VALUES (?, UTC_TIMESTAMP(), 'running')")->execute([$key]);
    return (int)$db->lastInsertId();
}
function finish_job(PDO $db, int $id, int $rows, string $status = "ok", ?string $err = null): void {
    $db->prepare("UPDATE retention_jobs SET finished_at = UTC_TIMESTAMP(), rows_swept = ?, status = ?, error_message = ? WHERE id = ?")
       ->execute([$rows, $status, $err, $id]);
}

$totals = [];
$tasks = [
    ["users_hard_delete",     "DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < (UTC_TIMESTAMP() - INTERVAL 30 DAY)"],
    ["login_attempts_sweep",  "DELETE FROM login_attempts WHERE updated_at < (UTC_TIMESTAMP() - INTERVAL 7 DAY)"],
    ["rate_limits_sweep",     "DELETE FROM api_rate_limits WHERE updated_at < (UTC_TIMESTAMP() - INTERVAL 1 DAY)"],
    ["webhook_events_sweep",  "DELETE FROM webhook_events WHERE processing_status = 'processed' AND created_at < (UTC_TIMESTAMP() - INTERVAL 90 DAY)"],
    ["user_audit_logs_sweep", "DELETE FROM user_audit_logs WHERE created_at < (UTC_TIMESTAMP() - INTERVAL 730 DAY)"],
    ["soft_deleted_rows_sweep", "DELETE FROM cloud_collection_rows WHERE deleted_at IS NOT NULL AND deleted_at < (UTC_TIMESTAMP() - INTERVAL 30 DAY)"],
];

foreach ($tasks as [$key, $sql]) {
    $jobId = start_job($db, $key);
    try {
        if ($dryRun) {
            $countSql = preg_replace('/^DELETE FROM/i', "SELECT COUNT(*) AS c FROM", $sql);
            $st = $db->query($countSql);
            $c = (int)$st->fetch()["c"];
            finish_job($db, $jobId, $c, "ok", "dry-run only");
            $totals[$key] = $c;
            fwrite(STDOUT, "  {$key}: {$c} rows (dry-run)\n");
        } else {
            $st = $db->prepare($sql);
            $st->execute();
            $c = $st->rowCount();
            finish_job($db, $jobId, $c, "ok");
            $totals[$key] = $c;
            fwrite(STDOUT, "  {$key}: {$c} rows swept\n");
        }
    } catch (Throwable $e) {
        finish_job($db, $jobId, 0, "failed", substr($e->getMessage(), 0, 1024));
        fwrite(STDERR, "  {$key}: FAILED — " . $e->getMessage() . "\n");
        $totals[$key] = -1;
    }
}

fwrite(STDOUT, "\nRetention sweeper complete. Totals: " . json_encode($totals) . "\n");
exit(0);
