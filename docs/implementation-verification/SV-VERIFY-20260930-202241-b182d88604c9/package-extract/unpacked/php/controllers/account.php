<?php

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/audit.php";
require_once __DIR__ . "/../helpers/user_audit.php";
require_once __DIR__ . "/../helpers/security.php";
require_once __DIR__ . "/../helpers/observability.php";

/**
 * Phase 1 — Account self-service: data export + account deletion.
 *
 * Compliance with DPDP Act 2023 (India) / GDPR Article 20 (export) and
 * Article 17 (erasure). Both endpoints require:
 *   - a valid Bearer JWT (authenticated user),
 *   - PIN re-entry in the request body — protects against a stolen token
 *     being used to mass-export or destroy a user's data.
 *
 * Rate-limited per (action, IP). Sensitive actions audit-log on success and
 * on failure.
 */

/**
 * Validate the user's PIN against the stored bcrypt hash. Returns the
 * authoritative `users` row on success (with PIN-hash fields stripped),
 * or null on mismatch.
 *
 * The PIN must come in the JSON body as `pin`. Returns null without an
 * exception so the caller can decide how to respond (we log + 401).
 */
function account_verify_pin_reentry(array $authUser, array $body): ?array {
    $pin = (string)($body["pin"] ?? "");
    if (!auth_valid_pin($pin)) {
        return null;
    }
    $row = user_auth_row_by_id($authUser["id"]);
    if (!$row) return null;
    $ok = verify_secret($pin . ":" . (string)$row["pin_salt"], (string)$row["pin_hash"]);
    return $ok ? $row : null;
}

/**
 * GET / POST /api/auth/data-export.php
 *
 * Returns a single JSON document containing every server-side row owned by
 * the authenticated user. Streams via json_ok so the SPA can offer a
 * "Download my data" button. Does NOT include other users' data nor
 * platform-wide settings.
 */
function account_data_export(): void {
    rate_limit_guard("account_data_export", 5, 3600);
    request_log("account_data_export");
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error("Unauthorized", 401, "UNAUTHORIZED");
        return;
    }
    $body = require_json_body();
    if (account_verify_pin_reentry($auth, $body) === null) {
        audit_log_action($auth["id"], $auth["role"], "ACCOUNT_DATA_EXPORT_PIN_FAILED", "user", $auth["id"], null, null);
        json_error("PIN re-entry required", 401, "PIN_REQUIRED");
        return;
    }

    $db = db_conn();

    // Profile
    $profileSt = $db->prepare(
        "SELECT id, username, display_name, role, is_active, last_login_at, created_at, updated_at,
                must_change_pin, deleted_at, deleted_reason
           FROM users WHERE id = ? LIMIT 1"
    );
    $profileSt->execute([$auth["id"]]);
    $profile = $profileSt->fetch();

    // All collection rows owned by this user (soft-deleted included so the
    // export is complete; receivers can filter on deleted_at if they want).
    $rowsSt = $db->prepare(
        "SELECT collection_name, entity_id, payload, updated_at, deleted_at, created_at
           FROM cloud_collection_rows
          WHERE user_id = ?"
    );
    $rowsSt->execute([$auth["id"]]);
    $collections = [];
    while ($row = $rowsSt->fetch()) {
        $collections[$row["collection_name"]][] = [
            "entityId" => (string)$row["entity_id"],
            "payload"  => json_decode((string)$row["payload"], true),
            "updatedAt" => $row["updated_at"],
            "deletedAt" => $row["deleted_at"],
            "createdAt" => $row["created_at"],
        ];
    }

    // Subscriptions + payments — billing trail.
    $subsSt = $db->prepare(
        "SELECT id, plan_id, status, trial_ends_at, current_period_start, current_period_end,
                cancel_at_period_end, cancelled_at, provider, provider_subscription_id,
                provider_customer_id, provider_order_id, created_at, updated_at
           FROM subscriptions WHERE user_id = ? ORDER BY id ASC"
    );
    $subsSt->execute([$auth["id"]]);
    $subscriptions = $subsSt->fetchAll();

    $paysSt = $db->prepare(
        "SELECT id, subscription_id, amount_inr, currency, expected_amount_paise,
                status, provider, provider_order_id, provider_payment_id,
                failure_reason, refund_id, paid_at, created_at, updated_at
           FROM payments WHERE user_id = ? ORDER BY id ASC"
    );
    $paysSt->execute([$auth["id"]]);
    $payments = $paysSt->fetchAll();

    // User-visible audit entries (where actor is them).
    $auditSt = $db->prepare(
        "SELECT action_key, entity_type, entity_id, ip_address, user_agent, created_at
           FROM audit_logs WHERE actor_user_id = ? ORDER BY id ASC LIMIT 5000"
    );
    try {
        $auditSt->execute([$auth["id"]]);
        $auditLogs = $auditSt->fetchAll();
    } catch (Throwable) {
        // audit_logs table may not exist in older schemas; export still succeeds.
        $auditLogs = [];
    }

    audit_log_action($auth["id"], $auth["role"], "ACCOUNT_DATA_EXPORTED", "user", $auth["id"], null, [
        "collection_count" => count($collections),
        "subscriptions"    => count($subscriptions),
        "payments"         => count($payments),
        "expires_at"       => gmdate("Y-m-d\\TH:i:s\\Z", time() + 3600),
    ]);
    user_audit_log($auth["id"], "DATA_EXPORT", "user", $auth["id"], null, [
        "collection_count" => count($collections),
        "expires_at" => gmdate("Y-m-d\\TH:i:s\\Z", time() + 3600),
    ]);

    json_ok([
        "exportVersion" => 1,
        "exportedAt"    => gmdate("Y-m-d\\TH:i:s\\Z"),
        "expiresAt"     => gmdate("Y-m-d\\TH:i:s\\Z", time() + 3600),
        "user"          => $profile ?: null,
        "collections"   => $collections,
        "subscriptions" => $subscriptions,
        "payments"      => $payments,
        "auditLogs"     => $auditLogs,
    ]);
}

/**
 * DELETE /api/auth/account.php
 *
 * Soft-delete the user, cancel any active subscription, audit-log, and
 * effectively log them out. Hard-delete via FK cascade is intentionally
 * gated to admin tooling — we keep the row marked deleted so finance can
 * reconcile billing for at least the retention window.
 *
 * Body: { pin: "1234..." [, reason?: "self"] }
 */
function account_delete(): void {
    rate_limit_guard("account_delete", 5, 3600);
    request_log("account_delete");
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error("Unauthorized", 401, "UNAUTHORIZED");
        return;
    }
    $body = require_json_body();
    if (account_verify_pin_reentry($auth, $body) === null) {
        audit_log_action($auth["id"], $auth["role"], "ACCOUNT_DELETE_PIN_FAILED", "user", $auth["id"], null, null);
        json_error("PIN re-entry required", 401, "PIN_REQUIRED");
        return;
    }

    $reason = (string)($body["reason"] ?? "self");
    if (!preg_match('/^[a-z_]{3,40}$/', $reason)) $reason = "self";

    $db = db_conn();
    $db->beginTransaction();
    try {
        // Cancel active subscriptions — preserve the row for billing audit.
        $cancel = $db->prepare(
            "UPDATE subscriptions
                SET status                = IF(status IN ('active','trial','past_due','pending'), 'cancelled', status),
                    cancel_at_period_end  = 1,
                    cancelled_at          = COALESCE(cancelled_at, UTC_TIMESTAMP()),
                    updated_at            = UTC_TIMESTAMP()
              WHERE user_id = ?"
        );
        $cancel->execute([$auth["id"]]);
        $cancelledCount = $cancel->rowCount();

        // Soft-delete the user. Deactivate so any extant JWT denies on the
        // next request. The bcrypt PIN hash is zeroed so the row cannot be
        // reused to sign in even if is_active is re-enabled by an admin.
        $del = $db->prepare(
            "UPDATE users
                SET is_active       = 0,
                    deleted_at      = UTC_TIMESTAMP(),
                    deleted_reason  = ?,
                    pin_hash        = '',
                    pin_salt        = '',
                    updated_at      = UTC_TIMESTAMP()
              WHERE id = ? AND deleted_at IS NULL"
        );
        $del->execute([$reason, $auth["id"]]);
        if ($del->rowCount() === 0) {
            $db->rollBack();
            json_error("Account already deleted", 409, "ALREADY_DELETED");
            return;
        }

        audit_log_action($auth["id"], $auth["role"], "ACCOUNT_DELETED", "user", $auth["id"], null, [
            "reason"               => $reason,
            "subscriptions_closed" => $cancelledCount,
            "hard_delete_after"    => gmdate("Y-m-d\\TH:i:s\\Z", time() + 30 * 86400),
        ]);
        user_audit_log($auth["id"], "ACCOUNT_DELETION_REQUESTED", "user", $auth["id"], null, [
            "reason" => $reason,
            "subscriptionsClosed" => $cancelledCount,
            "hardDeleteAfter" => gmdate("Y-m-d\\TH:i:s\\Z", time() + 30 * 86400),
        ]);
        $db->commit();
        clear_auth_cookie();

        json_ok([
            "deleted"             => true,
            "subscriptionsClosed" => $cancelledCount,
            "hardDeleteAfter"     => gmdate("Y-m-d\\TH:i:s\\Z", time() + 30 * 86400),
            "policy"              => "soft-delete; cloud_collection_rows cascade on admin hard-delete",
        ]);
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}
