<?php
/**
 * Phase 14 — billing fairness helpers.
 */
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/money_paise.php";

/**
 * Compute the start of the next period for a renewal.
 * Brief: "If user renews early: new_period_start = MAX(NOW(), current_period_end)".
 */
function billing_renewal_start(?string $currentPeriodEndUtc): string {
    $now = time();
    $endTs = is_string($currentPeriodEndUtc) ? strtotime($currentPeriodEndUtc) : false;
    $start = $endTs && $endTs > $now ? $endTs : $now;
    return gmdate("Y-m-d H:i:s", $start);
}

function billing_period_end_sql(string $interval, string $startUtc): string {
    // Returns a SQL expression that adds the interval to a literal datetime.
    // We do this server-side rather than via INTERVAL on column because the
    // base may be either now() (free renewal) or previous_period_end (fair).
    $days = ($interval === "yearly") ? 365 : 30;
    return sprintf("DATE_ADD('%s', INTERVAL %d DAY)", $startUtc, $days);
}

/**
 * Look up the active price for a plan at a given time. Falls back to plans.price_inr.
 */
function billing_active_price_paise(int $planId, string $atUtc = "now"): int {
    $db = db_conn();
    $when = gmdate("Y-m-d H:i:s", $atUtc === "now" ? time() : (int)strtotime($atUtc));
    try {
        $st = $db->prepare(
            "SELECT amount_paise FROM plan_prices
              WHERE plan_id = ? AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?)
              ORDER BY starts_at DESC LIMIT 1"
        );
        $st->execute([$planId, $when, $when]);
        $row = $st->fetch();
        if ($row && (int)$row["amount_paise"] > 0) return (int)$row["amount_paise"];
    } catch (Throwable) {
        // plan_prices table may not be present pre-migration
    }
    $st = $db->prepare("SELECT price_inr FROM plans WHERE id = ? LIMIT 1");
    $st->execute([$planId]);
    $row = $st->fetch();
    if (!$row) throw new RuntimeException("Unknown plan id {$planId}");
    return cloud_parse_money_input_to_paise($row["price_inr"], "price_inr", true, false);
}

/**
 * Effective numeric quotas for a user's active plan. Returns associative array,
 * e.g. ["max_transactions_per_month" => 500].
 */
function billing_user_quotas(string $userId): array {
    $db = db_conn();
    $st = $db->prepare(
        "SELECT pf.feature_key, pf.limit_value, pf.limit_unit
           FROM (
                SELECT plan_id
                  FROM subscriptions
                 WHERE user_id = ? AND status IN ('active','trial')
                 ORDER BY id DESC
                 LIMIT 1
           ) s
           JOIN plan_features pf ON pf.plan_id = s.plan_id
          WHERE pf.limit_value IS NOT NULL"
    );
    try {
        $st->execute([$userId]);
    } catch (Throwable) {
        return []; // pre-migration
    }
    $out = [];
    while ($row = $st->fetch()) {
        $out[$row["feature_key"]] = [
            "value" => $row["limit_value"] !== null ? (int)$row["limit_value"] : null,
            "unit"  => $row["limit_unit"],
        ];
    }
    return $out;
}

/**
 * Quick: is `feature_key` enabled (boolean) for this user's plan?
 */
/**
 * Active plan cap for new ledger transactions this calendar month (UTC).
 * null = unlimited; 0 = no new transactions allowed.
 */
function billing_max_transactions_per_month(string $userId): ?int {
    $db = db_conn();
    $st = $db->prepare(
        "SELECT pf.is_enabled, pf.limit_value
           FROM subscriptions s
           JOIN plan_features pf ON pf.plan_id = s.plan_id AND pf.feature_key = 'max_transactions_per_month'
          WHERE s.user_id = ? AND s.status IN ('active','trial')
          ORDER BY s.id DESC
          LIMIT 1"
    );
    try {
        $st->execute([$userId]);
    } catch (Throwable) {
        return null;
    }
    $row = $st->fetch();
    if (!$row) {
        return null;
    }
    if ((int)$row["is_enabled"] !== 1) {
        return 0;
    }
    if ($row["limit_value"] === null) {
        return null;
    }
    return (int)$row["limit_value"];
}

function billing_count_transactions_in_month(PDO $db, string $userId, string $monthYm): int {
    $st = $db->prepare(
        "SELECT COUNT(*) AS c
           FROM cloud_collection_rows
          WHERE user_id = ?
            AND collection_name = 'transactions'
            AND deleted_at IS NULL
            AND txn_month = ?
            AND COALESCE(JSON_EXTRACT(payload, '$.isDeleted'), 0) = 0"
    );
    $st->execute([$userId, $monthYm]);
    $row = $st->fetch();
    return $row ? (int)$row["c"] : 0;
}

function billing_user_has_feature(string $userId, string $featureKey): bool {
    $db = db_conn();
    $st = $db->prepare(
        "SELECT pf.is_enabled
           FROM subscriptions s
           JOIN plan_features pf ON pf.plan_id = s.plan_id
          WHERE s.user_id = ? AND s.status IN ('active','trial') AND pf.feature_key = ?
          ORDER BY s.id DESC LIMIT 1"
    );
    $st->execute([$userId, $featureKey]);
    $row = $st->fetch();
    return $row && (int)$row["is_enabled"] === 1;
}
