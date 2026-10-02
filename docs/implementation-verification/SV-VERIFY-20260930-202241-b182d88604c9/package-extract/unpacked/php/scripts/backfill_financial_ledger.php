<?php
/**
 * Backfill financial_events / financial_effects from cloud_collection_rows (transactions).
 *
 * Usage:
 *   php php/scripts/backfill_financial_ledger.php
 *   php php/scripts/backfill_financial_ledger.php --user=USER_UUID
 *
 * Requires sql/migrations/phase_05_financial_ledger.sql applied.
 */

if (PHP_SAPI !== "cli") { http_response_code(403); exit; }
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/utils.php";
require_once __DIR__ . "/../helpers/finance_events.php";
require_once __DIR__ . "/../helpers/cloud_write.php";

$userFilter = null;
foreach ($argv as $arg) {
    if (str_starts_with($arg, "--user=")) {
        $userFilter = substr($arg, 7);
    }
}

$db = db_conn();
$sql = "SELECT user_id, entity_id, payload FROM cloud_collection_rows
        WHERE collection_name = 'transactions' AND deleted_at IS NULL";
$params = [];
if (is_string($userFilter) && $userFilter !== "") {
    $sql .= " AND user_id = ?";
    $params[] = $userFilter;
}
$st = $db->prepare($sql);
$st->execute($params);

$n = 0;
while ($r = $st->fetch()) {
    $uid = (string)$r["user_id"];
    $p = decode_payload($r["payload"]);
    if (!is_array($p) || (($p["isDeleted"] ?? 0) === 1)) {
        continue;
    }
    $p["id"] = (string)$r["entity_id"];
    $p["userId"] = $uid;
    try {
        cloud_write_atomic($db, $uid, ["operation" => "backfill", "id" => $p["id"]], function () use ($db, $uid, $p) {
            // Re-read under the same user lock as online writes; the scan may be stale.
            $current = cloud_write_row($db, $uid, "transactions", $p["id"]);
            if ($current) finance_events_sync_transaction($db, $uid, $current);
            return ["id" => $p["id"]];
        });
        $n++;
    } catch (Throwable $e) {
        fwrite(STDERR, "Skip {$p["id"]}: " . $e->getMessage() . "\n");
    }
}

echo "Backfilled {$n} transaction(s).\n";
