<?php

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/payments.php";
require_once __DIR__ . "/../helpers/audit.php";
require_once __DIR__ . "/../helpers/observability.php";
require_once __DIR__ . "/../helpers/security.php";
require_once __DIR__ . "/../helpers/money_paise.php";
require_once __DIR__ . "/../helpers/billing.php";

/**
 * Razorpay webhook handler.
 *
 * Phase 1 security tightening:
 *   1. Verify signature on raw body (hash_equals, constant-time).
 *   2. Insert into webhook_events using event_id UNIQUE for idempotency.
 *   3. Look up payment by (provider_order_id, user_id) — owner check via
 *      payment.user_id is the source of truth, since the webhook is
 *      unauthenticated.
 *   4. Validate captured amount equals payments.expected_amount_paise and
 *      currency matches.
 *   5. Reject any UPDATE that touches zero rows.
 *   6. Activate subscription ONLY after all of the above hold.
 *
 * Rule 4 (no double-counting) honoured: each event_id is processed once, and
 * the payments table is the single source of truth for amount.
 */
function razorpay_webhook(): void {
    rate_limit_guard("payment_webhook", 300, 60);
    request_log("razorpay_webhook");

    $body = file_get_contents("php://input");
    if (!is_string($body)) {
        json_error("Invalid payload", 400, "INVALID_PAYLOAD");
        return;
    }
    $signature = (string)($_SERVER["HTTP_X_RAZORPAY_SIGNATURE"] ?? "");
    $payload = json_decode($body, true);
    if (!is_array($payload)) {
        json_error("Invalid JSON payload", 400, "INVALID_JSON");
        return;
    }

    $headerEventId = (string)($_SERVER["HTTP_X_RAZORPAY_EVENT_ID"] ?? "");
    $eventId = $headerEventId !== ""
        ? $headerEventId
        : (string)($payload["payload"]["payment"]["entity"]["id"] ?? $payload["event"] . "_" . substr(hash("sha256", $body), 0, 24));
    $eventType = (string)($payload["event"] ?? "unknown");
    $signatureOk = $signature !== "" && razorpay_verify_webhook_signature($body, $signature);

    $db = db_conn();
    // Step 2 — record the event up front. UNIQUE(event_id) blocks replays.
    try {
        $insert = $db->prepare(
            "INSERT INTO webhook_events
              (provider, event_id, event_type, signature_valid, payload_json, processing_status, created_at)
             VALUES ('razorpay', ?, ?, ?, ?, 'pending', UTC_TIMESTAMP())"
        );
        $insert->execute([$eventId, $eventType, $signatureOk ? 1 : 0, $body]);
    } catch (Throwable $e) {
        if (str_contains(strtolower($e->getMessage()), "duplicate")) {
            // Already processed — return success without doing work.
            json_ok(["idempotent" => true]);
            return;
        }
        throw $e;
    }

    if (!$signatureOk) {
        $up = $db->prepare("UPDATE webhook_events SET processing_status = 'failed', error_message = 'Invalid signature', processed_at = UTC_TIMESTAMP() WHERE event_id = ?");
        $up->execute([$eventId]);
        audit_log_action(null, "system", "PAYMENT_WEBHOOK_REJECTED_SIGNATURE", "webhook_event", $eventId, null, ["event_type" => $eventType]);
        json_error("Invalid webhook signature", 401, "INVALID_SIGNATURE");
        return;
    }

    // Step 3+4 — extract identifiers and amount from the event.
    $paymentEntity     = $payload["payload"]["payment"]["entity"] ?? [];
    $providerOrderId   = (string)($paymentEntity["order_id"] ?? "");
    $providerPaymentId = (string)($paymentEntity["id"] ?? "");
    $capturedAmount    = (int)($paymentEntity["amount"] ?? 0);     // paise
    $capturedCurrency  = strtoupper((string)($paymentEntity["currency"] ?? ""));
    $event             = strtolower($eventType);

    if ($providerOrderId === "") {
        // Non-payment event (e.g., subscription.charged) — record and exit cleanly.
        $db->prepare("UPDATE webhook_events SET processing_status = 'processed', processed_at = UTC_TIMESTAMP() WHERE event_id = ?")
           ->execute([$eventId]);
        json_ok(["processed" => true, "noop" => "no order_id"]);
        return;
    }

    try {
        $db->beginTransaction();

        // Load the OWNING payment row. This is the single source of truth for
        // (user_id, expected amount, currency). Lock for update.
        $find = $db->prepare(
            "SELECT id, user_id, subscription_id, status, currency, expected_amount_paise, amount_inr
               FROM payments
              WHERE provider = 'razorpay'
                AND provider_order_id = ?
              LIMIT 1
              FOR UPDATE"
        );
        $find->execute([$providerOrderId]);
        $payment = $find->fetch();

        if (!$payment) {
            $db->rollBack();
            $db->prepare("UPDATE webhook_events SET processing_status = 'failed', error_message = 'unknown order_id', processed_at = UTC_TIMESTAMP() WHERE event_id = ?")
               ->execute([$eventId]);
            audit_log_action(null, "system", "PAYMENT_WEBHOOK_UNKNOWN_ORDER", "webhook_event", $eventId, null, [
                "provider_order_id" => $providerOrderId,
            ]);
            json_error("Order not recognised", 404, "ORDER_NOT_FOUND");
            return;
        }

        $ownerUserId       = (string)$payment["user_id"];
        $expectedPaise     = (int)($payment["expected_amount_paise"] ?? 0);
        $storedCurrency    = strtoupper((string)($payment["currency"] ?? "INR"));
        $subscriptionRowId = $payment["subscription_id"] !== null ? (int)$payment["subscription_id"] : null;

        // Step 4 — for captured events, validate amount and currency match.
        if ($event === "payment.captured") {
            if ($expectedPaise <= 0) {
                // Legacy payment row created before expected_amount_paise existed.
                $expectedPaise = cloud_parse_money_input_to_paise($payment["amount_inr"], "amount_inr", false, false);
            }
            $amountOk   = $capturedAmount > 0 && $capturedAmount === $expectedPaise;
            $currencyOk = $capturedCurrency !== "" && $capturedCurrency === $storedCurrency;

            if (!$amountOk || !$currencyOk) {
                $db->rollBack();
                $db->prepare("UPDATE webhook_events SET processing_status = 'failed', error_message = ?, processed_at = UTC_TIMESTAMP() WHERE event_id = ?")
                   ->execute([
                       sprintf("amount_mismatch=%s currency_mismatch=%s captured=%d/%s expected=%d/%s",
                               $amountOk ? "0" : "1", $currencyOk ? "0" : "1",
                               $capturedAmount, $capturedCurrency,
                               $expectedPaise, $storedCurrency),
                       $eventId,
                   ]);
                audit_log_action($ownerUserId, "system", "PAYMENT_WEBHOOK_AMOUNT_MISMATCH", "payment", (string)$payment["id"], null, [
                    "provider_order_id" => $providerOrderId,
                    "captured_amount"   => $capturedAmount,
                    "captured_currency" => $capturedCurrency,
                    "expected_amount"   => $expectedPaise,
                    "expected_currency" => $storedCurrency,
                ]);
                json_error("Payment amount or currency does not match the original order", 400, "AMOUNT_MISMATCH");
                return;
            }

            // Step 5 — perform the update with (user_id, provider_order_id) so
            // we know we touched exactly the right row. rowCount() must be 1
            // OR 0-with-already-captured.
            $upPay = $db->prepare(
                "UPDATE payments
                    SET status              = 'captured',
                        provider_payment_id = ?,
                        captured_amount_paise = ?,
                        paid_at             = UTC_TIMESTAMP(),
                        updated_at          = UTC_TIMESTAMP()
                  WHERE id                  = ?
                    AND user_id             = ?
                    AND provider_order_id   = ?
                    AND status              IN ('created','authorized')"
            );
            $upPay->execute([$providerPaymentId, $capturedAmount, $payment["id"], $ownerUserId, $providerOrderId]);
            if ($upPay->rowCount() === 0 && (string)$payment["status"] !== "captured") {
                // Concurrent race or wrong state — refuse.
                $db->rollBack();
                $db->prepare("UPDATE webhook_events SET processing_status = 'failed', error_message = 'payment_update_zero_rows', processed_at = UTC_TIMESTAMP() WHERE event_id = ?")
                   ->execute([$eventId]);
                json_error("Payment could not be updated", 409, "PAYMENT_UPDATE_CONFLICT");
                return;
            }

            // Step 6 — activate subscription, but ONLY for this user. Same
            // (user_id, provider_order_id) guard.
            if ($subscriptionRowId !== null) {
                $upSub = $db->prepare(
                    "UPDATE subscriptions
                        SET status                = 'active',
                            updated_at            = UTC_TIMESTAMP()
                      WHERE id                    = ?
                        AND user_id               = ?
                        AND provider_order_id     = ?"
                );
                $upSub->execute([$subscriptionRowId, $ownerUserId, $providerOrderId]);
                if ($upSub->rowCount() === 0) {
                    $db->rollBack();
                    $db->prepare("UPDATE webhook_events SET processing_status = 'failed', error_message = 'subscription_update_zero_rows', processed_at = UTC_TIMESTAMP() WHERE event_id = ?")
                       ->execute([$eventId]);
                    audit_log_action($ownerUserId, "system", "PAYMENT_WEBHOOK_SUBSCRIPTION_NOT_FOUND", "subscription", (string)$subscriptionRowId, null, [
                        "provider_order_id" => $providerOrderId,
                    ]);
                    json_error("Subscription update failed", 409, "SUBSCRIPTION_UPDATE_CONFLICT");
                    return;
                }
            }
        } elseif ($event === "payment.failed") {
            $failureReason = (string)($paymentEntity["error_description"] ?? "payment_failed");
            $upPay = $db->prepare(
                "UPDATE payments
                    SET status              = 'failed',
                        provider_payment_id = ?,
                        failure_reason      = ?,
                        updated_at          = UTC_TIMESTAMP()
                  WHERE id                  = ?
                    AND user_id             = ?
                    AND provider_order_id   = ?"
            );
            $upPay->execute([$providerPaymentId, $failureReason, $payment["id"], $ownerUserId, $providerOrderId]);
            if ($subscriptionRowId !== null) {
                $db->prepare("UPDATE subscriptions SET status = 'past_due', updated_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ?")
                   ->execute([$subscriptionRowId, $ownerUserId]);
            }
        }

        $db->prepare("UPDATE webhook_events SET processing_status = 'processed', processed_at = UTC_TIMESTAMP(), error_message = NULL WHERE event_id = ?")
            ->execute([$eventId]);
        $db->commit();
        audit_log_action($ownerUserId, "system", "PAYMENT_WEBHOOK_PROCESSED", "webhook_event", $eventId, null, [
            "event_type"        => $eventType,
            "provider_order_id" => $providerOrderId,
        ]);
        json_ok(["processed" => true]);
    } catch (Throwable $e) {
        $db->rollBack();
        $db->prepare("UPDATE webhook_events SET processing_status = 'failed', error_message = ?, processed_at = UTC_TIMESTAMP() WHERE event_id = ?")
            ->execute([substr($e->getMessage(), 0, 1024), $eventId]);
        throw $e;
    }
}
