<?php

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/app.php";
require_once __DIR__ . "/../helpers/audit.php";
require_once __DIR__ . "/../helpers/observability.php";
require_once __DIR__ . "/../helpers/validate.php";
require_once __DIR__ . "/../helpers/validator.php";
require_once __DIR__ . "/../helpers/security.php";

function admin_subscription_period_end_sql(string $interval): string {
    return $interval === "yearly"
        ? "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 365 DAY)"
        : "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY)";
}

function admin_dashboard(): void {
    rate_limit_guard("admin_api", 120, 60);
    $admin = auth_require_admin();
    request_log("admin_dashboard", ["adminId" => $admin["id"]]);
    $db = db_conn();
    $users = (int)$db->query("SELECT COUNT(*) AS c FROM users")->fetch()["c"];
    $activeSubs = (int)$db->query("SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active'")->fetch()["c"];
    $failedPayments = (int)$db->query("SELECT COUNT(*) AS c FROM payments WHERE status = 'failed'")->fetch()["c"];
    $mrr = (string)$db->query("SELECT COALESCE(SUM(p.price_inr), 0) AS mrr FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.status = 'active' AND p.billing_interval = 'monthly'")->fetch()["mrr"];
    $rateBucketCount = (int)$db->query("SELECT COUNT(*) AS c FROM api_rate_limits")->fetch()["c"];
    $recentAuditCount = (int)$db->query("SELECT COUNT(*) AS c FROM audit_logs WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)")->fetch()["c"];
    $recentPayments = (int)$db->query("SELECT COUNT(*) AS c FROM payments WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)")->fetch()["c"];
    json_ok([
        "users" => $users,
        "activeSubscriptions" => $activeSubs,
        "failedPayments" => $failedPayments,
        "mrrEstimateInr" => $mrr,
        "rateLimitBuckets" => $rateBucketCount,
        "recentAuditEvents24h" => $recentAuditCount,
        "payments24h" => $recentPayments,
        "actor" => $admin["username"],
    ]);
}

function admin_plans_list(): void {
    rate_limit_guard("admin_api", 120, 60);
    auth_require_admin();
    $db = db_conn();
    $st = $db->prepare("SELECT * FROM plans ORDER BY created_at DESC");
    $st->execute();
    json_ok($st->fetchAll());
}

function admin_plans_upsert(): void {
    rate_limit_guard("admin_mutation", 60, 60);
    $admin = auth_require_admin();
    request_log("admin_plans_upsert", ["adminId" => $admin["id"]]);
    $body = require_json_body();
    try {
        $id = (int)($body["id"] ?? 0);
        $code = validate_string_field($body, "code", 2, 64, '/^[A-Z0-9_]+$/');
        $name = validate_string_field($body, "name", 2, 120);
        $priceInr = validate_decimal_string((string)($body["price_inr"] ?? "0.00"), "price_inr");
        $interval = validate_enum(trim((string)($body["billing_interval"] ?? "monthly")), ["monthly", "yearly"], "billing_interval");
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    $db = db_conn();
    if ($id > 0) {
        $before = $db->prepare("SELECT * FROM plans WHERE id = ? LIMIT 1");
        $before->execute([$id]);
        $old = $before->fetch() ?: null;
        $st = $db->prepare("UPDATE plans SET code = ?, name = ?, description = ?, price_inr = ?, billing_interval = ?, trial_days = ?, is_active = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?");
        $st->execute([$code, $name, $body["description"] ?? null, $priceInr, $interval, (int)($body["trial_days"] ?? 0), (int)($body["is_active"] ?? 1), $id]);
        audit_log_action($admin["id"], $admin["role"], "PLAN_UPDATED", "plan", (string)$id, $old, $body);
        json_ok(["id" => $id]);
        return;
    }
    $st = $db->prepare("INSERT INTO plans (code, name, description, price_inr, billing_interval, trial_days, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())");
    $st->execute([$code, $name, $body["description"] ?? null, $priceInr, $interval, (int)($body["trial_days"] ?? 0), (int)($body["is_active"] ?? 1)]);
    $newId = (int)$db->lastInsertId();
    audit_log_action($admin["id"], $admin["role"], "PLAN_CREATED", "plan", (string)$newId, null, $body);
    json_ok(["id" => $newId], 201);
}

function admin_settings_get(): void {
    rate_limit_guard("admin_api", 120, 60);
    auth_require_admin();
    json_ok(setting_get_map(false));
}

function admin_settings_put(): void {
    rate_limit_guard("admin_mutation", 60, 60);
    $admin = auth_require_admin();
    request_log("admin_settings_put", ["adminId" => $admin["id"]]);
    $body = require_json_body();
    if (count($body) === 0) {
        json_error("No settings provided", 422, "VALIDATION_ERROR");
        return;
    }
    $db = db_conn();
    foreach ($body as $key => $value) {
        if (!is_string($key) || trim($key) === "") continue;
        if (strlen($key) > 191 || preg_match('/^[a-z0-9_]+$/', $key) !== 1) continue;
        $st = $db->prepare("INSERT INTO app_settings (setting_key, setting_value, is_public, updated_by_user_id, updated_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_public = VALUES(is_public), updated_by_user_id = VALUES(updated_by_user_id), updated_at = UTC_TIMESTAMP()");
        $isPublic = in_array($key, ["app_title", "logo_url", "favicon_url", "support_email", "privacy_url", "terms_url", "theme_accent", "theme_primary"], true) ? 1 : 0;
        $st->execute([$key, json_encode($value, JSON_UNESCAPED_SLASHES), $isPublic, $admin["id"]]);
    }
    audit_log_action($admin["id"], $admin["role"], "BRANDING_UPDATED", "app_settings", "bulk", null, $body);
    json_ok(["updated" => true]);
}

function admin_feature_flags_get(): void {
    rate_limit_guard("admin_api", 120, 60);
    auth_require_admin();
    json_ok(flag_get_map());
}

function admin_feature_flags_put(): void {
    rate_limit_guard("admin_mutation", 60, 60);
    $admin = auth_require_admin();
    request_log("admin_feature_flags_put", ["adminId" => $admin["id"]]);
    $body = require_json_body();
    $db = db_conn();
    foreach ($body as $featureKey => $isEnabled) {
        if (!is_string($featureKey) || trim($featureKey) === "") continue;
        if (strlen($featureKey) > 191 || preg_match('/^[a-z0-9_]+$/', $featureKey) !== 1) continue;
        $st = $db->prepare("INSERT INTO feature_flags_global (feature_key, is_enabled, updated_by_user_id, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), updated_by_user_id = VALUES(updated_by_user_id), updated_at = UTC_TIMESTAMP()");
        $st->execute([$featureKey, $isEnabled ? 1 : 0, $admin["id"]]);
    }
    audit_log_action($admin["id"], $admin["role"], "FEATURE_TOGGLED", "feature_flags_global", "bulk", null, $body);
    json_ok(["updated" => true]);
}

function admin_users_list(): void {
    rate_limit_guard("admin_api", 120, 60);
    auth_require_admin();
    $db = db_conn();
    $st = $db->prepare("
        SELECT
            u.id,
            u.username,
            u.display_name,
            u.role,
            u.is_active,
            u.created_at,
            u.updated_at,
            s.status AS subscription_status,
            s.plan_id AS subscription_plan_id,
            p.code AS subscription_plan_code,
            p.name AS subscription_plan_name,
            s.current_period_end AS subscription_expires_at
        FROM users u
        LEFT JOIN (
            SELECT s1.*
            FROM subscriptions s1
            INNER JOIN (
                SELECT user_id, MAX(created_at) AS max_created_at
                FROM subscriptions
                GROUP BY user_id
            ) latest ON latest.user_id = s1.user_id AND latest.max_created_at = s1.created_at
        ) s ON s.user_id = u.id
        LEFT JOIN plans p ON p.id = s.plan_id
        ORDER BY u.created_at DESC
    ");
    $st->execute();
    json_ok($st->fetchAll());
}

function admin_subscriptions_list(): void {
    rate_limit_guard("admin_api", 120, 60);
    auth_require_admin();
    $db = db_conn();
    $st = $db->prepare("
        SELECT
            s.*,
            u.username,
            u.display_name,
            p.code AS plan_code,
            p.name AS plan_name,
            p.price_inr AS amount_inr,
            s.current_period_start AS started_at,
            s.current_period_end AS expires_at,
            s.scheduled_plan_id,
            s.scheduled_change_at,
            lp.status AS latest_payment_status,
            lp.provider_order_id AS latest_provider_order_id,
            lp.provider_payment_id AS latest_provider_payment_id,
            COALESCE(w.failed_webhook_count, 0) AS failed_webhook_count,
            w.latest_failed_webhook_at
        FROM subscriptions s
        JOIN users u ON u.id = s.user_id
        JOIN plans p ON p.id = s.plan_id
        LEFT JOIN (
            SELECT p1.*
            FROM payments p1
            JOIN (
                SELECT subscription_id, MAX(id) AS id
                FROM payments
                GROUP BY subscription_id
            ) x ON x.id = p1.id
        ) lp ON lp.subscription_id = s.id
        LEFT JOIN (
            SELECT JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.payload.payment.entity.order_id')) AS provider_order_id,
                   COUNT(*) AS failed_webhook_count,
                   MAX(processed_at) AS latest_failed_webhook_at
            FROM webhook_events
            WHERE processing_status = 'failed'
            GROUP BY provider_order_id
        ) w ON w.provider_order_id = s.provider_order_id
        ORDER BY s.created_at DESC
    ");
    $st->execute();
    json_ok($st->fetchAll());
}

function admin_subscription_action(): void {
    rate_limit_guard("admin_mutation", 60, 60);
    $admin = auth_require_admin();
    $body = require_json_body();
    $subscriptionId = (int)($body["subscriptionId"] ?? 0);
    $action = (string)($body["action"] ?? "");
    if ($subscriptionId <= 0 || !in_array($action, ["manual_extend", "cancel"], true)) {
        json_error("subscriptionId and valid action are required", 422, "VALIDATION_ERROR");
        return;
    }
    $db = db_conn();
    if ($action === "manual_extend") {
        $days = (int)($body["days"] ?? 0);
        if ($days <= 0 || $days > 366) {
            json_error("days must be between 1 and 366", 422, "VALIDATION_ERROR");
            return;
        }
        $st = $db->prepare(
            "UPDATE subscriptions
                SET current_period_end = DATE_ADD(COALESCE(current_period_end, UTC_TIMESTAMP()), INTERVAL ? DAY),
                    status = CASE WHEN status IN ('cancelled','expired') THEN 'active' ELSE status END,
                    updated_at = UTC_TIMESTAMP()
              WHERE id = ?"
        );
        $st->execute([$days, $subscriptionId]);
        if ($st->rowCount() === 0) {
            json_error("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
            return;
        }
        audit_log_action($admin["id"], $admin["role"], "SUBSCRIPTION_MANUAL_EXTEND", "subscription", (string)$subscriptionId, null, [
            "days" => $days,
            "reason" => (string)($body["reason"] ?? ""),
        ]);
        json_ok(["subscriptionId" => $subscriptionId, "extendedDays" => $days]);
        return;
    }

    $st = $db->prepare(
        "UPDATE subscriptions
            SET status = 'cancelled',
                cancel_at_period_end = 1,
                cancelled_at = UTC_TIMESTAMP(),
                updated_at = UTC_TIMESTAMP()
          WHERE id = ?"
    );
    $st->execute([$subscriptionId]);
    if ($st->rowCount() === 0) {
        json_error("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
        return;
    }
    audit_log_action($admin["id"], $admin["role"], "SUBSCRIPTION_ADMIN_CANCELLED", "subscription", (string)$subscriptionId, null, [
        "reason" => (string)($body["reason"] ?? ""),
    ]);
    json_ok(["subscriptionId" => $subscriptionId, "status" => "cancelled"]);
}

function admin_toggle_user_active(string $userId): void {
    rate_limit_guard("admin_mutation", 60, 60);
    $admin = auth_require_admin();
    if ($admin["id"] === $userId) {
        json_error("You cannot deactivate your own admin account", 409, "SELF_TOGGLE_BLOCKED");
        return;
    }
    $db = db_conn();
    $st = $db->prepare("UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = UTC_TIMESTAMP() WHERE id = ?");
    $st->execute([$userId]);
    audit_log_action($admin["id"], $admin["role"], "USER_TOGGLED", "user", $userId, null, ["toggled" => true]);
    json_ok(["updated" => $st->rowCount() > 0]);
}

/**
 * Admin sets a user's login PIN (does not require the old PIN).
 * Forces must_change_pin when the column exists so the user rotates on next login.
 */
function admin_reset_user_pin(string $userId, string $newPin): void {
    rate_limit_guard("admin_mutation", 30, 60);
    $admin = auth_require_admin();
    if ($userId === "") {
        json_error("userId is required", 422, "VALIDATION_ERROR");
        return;
    }
    $pinError = auth_pin_validation_error($newPin);
    if ($pinError !== null) {
        json_error($pinError, 422, "VALIDATION_ERROR");
        return;
    }
    $db = db_conn();
    $u = $db->prepare("SELECT id, role FROM users WHERE id = ? LIMIT 1");
    $u->execute([$userId]);
    $user = $u->fetch();
    if (!$user) {
        json_error("User not found", 404, "USER_NOT_FOUND");
        return;
    }
    if ((string)$user["role"] === "admin" && $admin["id"] !== $userId) {
        // Allow admin to reset another admin only if explicitly same role — still OK for support.
        // Keep audit trail; do not block peer admin resets.
    }
    $nextSalt = create_pin_salt();
    $nextHash = hash_secret($newPin . ":" . $nextSalt);
    $hasMustChange = false;
    try {
        $db->query("SELECT must_change_pin FROM users LIMIT 0");
        $hasMustChange = true;
    } catch (Throwable) {
        $hasMustChange = false;
    }
    if ($hasMustChange) {
        $db->prepare(
            "UPDATE users SET pin_hash = ?, pin_salt = ?, must_change_pin = 1, updated_at = UTC_TIMESTAMP() WHERE id = ? LIMIT 1"
        )->execute([$nextHash, $nextSalt, $userId]);
    } else {
        $db->prepare(
            "UPDATE users SET pin_hash = ?, pin_salt = ?, updated_at = UTC_TIMESTAMP() WHERE id = ? LIMIT 1"
        )->execute([$nextHash, $nextSalt, $userId]);
    }
    audit_log_action($admin["id"], $admin["role"], "USER_PIN_RESET_BY_ADMIN", "user", $userId, null, [
        "mustChangePin" => $hasMustChange,
        "byAdminId" => $admin["id"],
    ]);
    json_ok(["updated" => true, "mustChangePin" => $hasMustChange]);
}

function admin_assign_plan(string $userId, int $planId): void {
    rate_limit_guard("admin_mutation", 60, 60);
    $admin = auth_require_admin();
    if ($planId <= 0) {
        json_error("planId is required", 422, "VALIDATION_ERROR");
        return;
    }
    $db = db_conn();
    $u = $db->prepare("SELECT id FROM users WHERE id = ? LIMIT 1");
    $u->execute([$userId]);
    if (!$u->fetch()) {
        json_error("User not found", 404, "USER_NOT_FOUND");
        return;
    }
    $p = $db->prepare("SELECT id, billing_interval FROM plans WHERE id = ? AND is_active = 1 LIMIT 1");
    $p->execute([$planId]);
    $plan = $p->fetch();
    if (!$plan) {
        json_error("Plan not found", 404, "PLAN_NOT_FOUND");
        return;
    }
    $db->beginTransaction();
    try {
        $db->prepare("UPDATE subscriptions SET status = 'cancelled', updated_at = UTC_TIMESTAMP() WHERE user_id = ? AND status IN ('pending','active','past_due')")
            ->execute([$userId]);
        $periodEndSql = admin_subscription_period_end_sql((string)$plan["billing_interval"]);
        $db->prepare("INSERT INTO subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end, created_at, updated_at) VALUES (?, ?, 'active', 'razorpay', UTC_TIMESTAMP(), {$periodEndSql}, UTC_TIMESTAMP(), UTC_TIMESTAMP())")
            ->execute([$userId, $planId]);
        $subscriptionId = (int)$db->lastInsertId();
        $db->commit();
        audit_log_action($admin["id"], $admin["role"], "USER_PLAN_ASSIGNED", "subscription", (string)$subscriptionId, null, ["userId" => $userId, "planId" => $planId]);
        json_ok(["subscriptionId" => $subscriptionId]);
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}
