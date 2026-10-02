<?php

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/payments.php";
require_once __DIR__ . "/../helpers/audit.php";
require_once __DIR__ . "/../helpers/app.php";
require_once __DIR__ . "/../helpers/observability.php";
require_once __DIR__ . "/../helpers/validate.php";
require_once __DIR__ . "/../helpers/validator.php";
require_once __DIR__ . "/../helpers/money_paise.php";
require_once __DIR__ . "/../helpers/billing.php";
require_once __DIR__ . "/../helpers/user_audit.php";

function decimal_inr_to_paise(string $amount): int {
    return cloud_parse_money_input_to_paise($amount, "amount", true, false);
}

function user_effective_features(string $userId, ?array $subscription): array {
    $global = flag_get_map();
    if (!$subscription || !isset($subscription["plan_id"])) {
        return $global;
    }
    $db = db_conn();
    $st = $db->prepare("SELECT feature_key, is_enabled, limit_value FROM plan_features WHERE plan_id = ?");
    $st->execute([$subscription["plan_id"]]);
    while ($row = $st->fetch()) {
        $key = (string)$row["feature_key"];
        $enabled = ((int)$row["is_enabled"] === 1);
        if ($row["limit_value"] !== null) {
            $global[$key] = $enabled ? (int)$row["limit_value"] : false;
            continue;
        }
        $global[$key] = ($global[$key] ?? true) && $enabled;
    }
    return $global;
}

function subscription_period_end_sql(string $interval): string {
    return $interval === "yearly"
        ? "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 365 DAY)"
        : "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY)";
}

function subscription_period_days(string $interval): int {
    return $interval === "yearly" ? 365 : 30;
}

function subscriptions_list_plans(): void {
    $db = db_conn();
    $st = $db->prepare("SELECT id, code, name, description, price_inr, billing_interval, trial_days FROM plans WHERE is_active = 1 ORDER BY price_inr ASC");
    $st->execute();
    $plans = $st->fetchAll();
    foreach ($plans as &$plan) {
        $ft = $db->prepare("SELECT feature_key, is_enabled, limit_value, limit_unit FROM plan_features WHERE plan_id = ?");
        $ft->execute([$plan["id"]]);
        $plan["features"] = [];
        while ($row = $ft->fetch()) {
            $plan["features"][$row["feature_key"]] = [
                "isEnabled" => ((int)$row["is_enabled"]) === 1,
                "limitValue" => $row["limit_value"] !== null ? (int)$row["limit_value"] : null,
                "limitUnit" => $row["limit_unit"],
            ];
        }
    }
    json_ok($plans);
}

function subscriptions_create_order(): void {
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error("Unauthorized", 401, "UNAUTHORIZED");
        return;
    }
    request_log("subscriptions_create_order", ["userId" => $auth["id"]]);
    $body = require_json_body();
    try {
        validate_required_fields($body, ["planId"]);
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    $planId = (int)$body["planId"];
    if ($planId <= 0) {
        json_error("planId is required", 422, "VALIDATION_ERROR");
        return;
    }

    $db = db_conn();
    $st = $db->prepare("SELECT id, code, price_inr, billing_interval, trial_days FROM plans WHERE id = ? AND is_active = 1 LIMIT 1");
    $st->execute([$planId]);
    $plan = $st->fetch();
    if (!$plan) {
        json_error("Plan not found", 404, "PLAN_NOT_FOUND");
        return;
    }

    $amountPaise = billing_active_price_paise((int)$plan["id"]);
    $currentSt = $db->prepare(
        "SELECT s.id, s.plan_id, s.current_period_end, p.price_inr, p.billing_interval
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
          WHERE s.user_id = ? AND s.status = 'active'
          ORDER BY s.current_period_end DESC, s.id DESC
          LIMIT 1"
    );
    $currentSt->execute([$auth["id"]]);
    $current = $currentSt->fetch();
    if ($current && (int)$current["plan_id"] !== (int)$plan["id"]) {
        $currentAmountPaise = billing_active_price_paise((int)$current["plan_id"]);
        if ($amountPaise < $currentAmountPaise) {
            $db->prepare(
                "UPDATE subscriptions
                    SET scheduled_plan_id = ?, scheduled_change_at = current_period_end, updated_at = UTC_TIMESTAMP()
                  WHERE id = ? AND user_id = ?"
            )->execute([$plan["id"], $current["id"], $auth["id"]]);
            audit_log_action($auth["id"], $auth["role"], "SUBSCRIPTION_DOWNGRADE_SCHEDULED", "subscription", (string)$current["id"], null, [
                "scheduled_plan_id" => $plan["id"],
                "scheduled_change_at" => $current["current_period_end"],
            ]);
            json_ok([
                "scheduledDowngrade" => true,
                "message" => "Downgrade scheduled for your next renewal. No paid days are lost.",
                "scheduledPlanId" => (int)$plan["id"],
                "scheduledChangeAt" => $current["current_period_end"],
            ]);
            return;
        }
    }
    $receipt = "sub_" . $auth["id"] . "_" . time();
    $order = razorpay_request("POST", "orders", [
        "amount" => $amountPaise,
        "currency" => "INR",
        "receipt" => $receipt,
        "notes" => ["userId" => $auth["id"], "planId" => (string)$plan["id"]],
    ]);

    $db->beginTransaction();
    try {
        $renewalStart = billing_renewal_start($current["current_period_end"] ?? null);
        $days = subscription_period_days((string)$plan["billing_interval"]);
        $sub = $db->prepare(
            "INSERT INTO subscriptions
              (user_id, plan_id, status, provider, provider_order_id, current_period_start,
               current_period_end, previous_period_end, renewed_from_subscription_id, created_at, updated_at)
             VALUES (?, ?, 'pending', 'razorpay', ?, ?, DATE_ADD(?, INTERVAL {$days} DAY), ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
        );
        $sub->execute([
            $auth["id"],
            $plan["id"],
            $order["id"],
            $renewalStart,
            $renewalStart,
            $current["current_period_end"] ?? null,
            $current["id"] ?? null,
        ]);
        $subscriptionId = (int)$db->lastInsertId();

        // Phase 1 (D1): record (user_id, order_id, expected_amount_paise, currency, subscription_id)
        // so the webhook can verify ownership and amount before activating anything.
        $pay = $db->prepare(
            "INSERT INTO payments
              (user_id, subscription_id, amount_inr, currency, expected_amount_paise,
               status, provider, provider_order_id, created_at, updated_at)
             VALUES (?, ?, ?, 'INR', ?, 'created', 'razorpay', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
        );
        $pay->execute([
            $auth["id"],
            $subscriptionId,
            number_format($amountPaise / 100, 2, ".", ""),
            $amountPaise,
            $order["id"],
        ]);
        $paymentId = (int)$db->lastInsertId();
        $db->commit();

        audit_log_action($auth["id"], $auth["role"], "SUBSCRIPTION_ORDER_CREATED", "subscription", (string)$subscriptionId, null, ["provider_order_id" => $order["id"]]);
        json_ok([
            "order" => $order,
            "subscriptionId" => $subscriptionId,
            "paymentId" => $paymentId,
            "razorpayKeyId" => razorpay_key_id(),
        ], 201);
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}

function subscriptions_confirm_payment(): void {
    $auth = auth_require_active_user();
    request_log("subscriptions_confirm_payment", ["userId" => $auth["id"]]);
    $body = require_json_body();
    try {
        $orderId = validate_string_field($body, "razorpay_order_id", 10, 191, '/^[a-zA-Z0-9_]+$/');
        $paymentId = validate_string_field($body, "razorpay_payment_id", 10, 191, '/^[a-zA-Z0-9_]+$/');
        $signature = validate_string_field($body, "razorpay_signature", 20, 255, '/^[a-fA-F0-9]+$/');
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    if (!razorpay_verify_signature($orderId, $paymentId, $signature)) {
        json_error("Invalid payment signature", 401, "INVALID_SIGNATURE");
        return;
    }

    $db = db_conn();
    $db->beginTransaction();
    try {
        $ps = $db->prepare("SELECT id, subscription_id, status FROM payments WHERE provider_order_id = ? AND user_id = ? LIMIT 1");
        $ps->execute([$orderId, $auth["id"]]);
        $payment = $ps->fetch();
        if (!$payment) {
            $db->rollBack();
            json_error("Payment not found", 404, "PAYMENT_NOT_FOUND");
            return;
        }
        if ($payment["status"] === "captured") {
            $db->rollBack();
            json_ok(["message" => "Payment already confirmed"]);
            return;
        }
        $up = $db->prepare("UPDATE payments SET status = 'captured', provider_payment_id = ?, provider_signature = ?, paid_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?");
        $up->execute([$paymentId, $signature, $payment["id"]]);

        $su = $db->prepare(
            "UPDATE subscriptions
                SET status = 'active',
                    updated_at = UTC_TIMESTAMP()
              WHERE id = ?
                AND user_id = ?"
        );
        $su->execute([$payment["subscription_id"], $auth["id"]]);
        $db->commit();

        audit_log_action($auth["id"], $auth["role"], "SUBSCRIPTION_ACTIVATED", "subscription", (string)$payment["subscription_id"], null, ["provider_payment_id" => $paymentId]);
        json_ok(["status" => "active"]);
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}

function subscriptions_my(): void {
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error("Unauthorized", 401, "UNAUTHORIZED");
        return;
    }
    $db = db_conn();
    $st = $db->prepare("SELECT s.*, p.code AS plan_code, p.name AS plan_name FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1");
    $st->execute([$auth["id"]]);
    $subscription = $st->fetch();
    if (!$subscription) {
        json_ok(["subscription" => null, "effectiveFeatures" => flag_get_map()]);
        return;
    }
    $features = user_effective_features($auth["id"], $subscription);
    json_ok(["subscription" => $subscription, "effectiveFeatures" => $features]);
}

function subscriptions_cancel(): void {
    $auth = auth_require_active_user();
    request_log("subscriptions_cancel", ["userId" => $auth["id"]]);
    $body = require_json_body();
    $subscriptionId = (int)($body["subscriptionId"] ?? 0);
    if ($subscriptionId <= 0) {
        json_error("subscriptionId is required", 422, "VALIDATION_ERROR");
        return;
    }
    $db = db_conn();
    $up = $db->prepare("UPDATE subscriptions SET status = 'cancelled', cancel_at_period_end = 1, updated_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ?");
    $up->execute([$subscriptionId, $auth["id"]]);
    if ($up->rowCount() === 0) {
        json_error("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
        return;
    }
    audit_log_action($auth["id"], $auth["role"], "SUBSCRIPTION_CANCELLED", "subscription", (string)$subscriptionId, null, ["cancel_at_period_end" => 1]);
    user_audit_log($auth["id"], "SUBSCRIPTION_CANCELLED", "subscription", (string)$subscriptionId, null, ["cancel_at_period_end" => 1]);
    json_ok(["subscriptionId" => $subscriptionId, "status" => "cancelled"]);
}
