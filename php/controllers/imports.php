<?php

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/utils.php";
require_once __DIR__ . "/../helpers/security.php";
require_once __DIR__ . "/../helpers/cloud_payload.php";
require_once __DIR__ . "/../helpers/finance_events.php";
require_once __DIR__ . "/../helpers/money_paise.php";

function imports_transactions_bulk(): void {
    rate_limit_guard("imports_transactions", 20, 60);
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401, "UNAUTHORIZED");
        return;
    }
    $body = require_json_body();
    $rows = $body["rows"] ?? null;
    if (!is_array($rows)) {
        json_error("rows is required", 422, "VALIDATION_ERROR");
        return;
    }

    $db = db_conn();
    $created = 0;
    $rejected = [];
    foreach ($rows as $idx => $row) {
        if (!is_array($row)) {
            $rejected[] = ["index" => $idx, "reason" => "Row is not an object"];
            continue;
        }
        $type = trim((string)($row["type"] ?? ""));
        $date = trim((string)($row["date"] ?? ""));
        try {
            if (array_key_exists("amountPaise", $row)) {
                cloud_validate_integer_paise_field($row, "amountPaise");
                $amountPaise = (int)$row["amountPaise"];
                if ($amountPaise < 1) {
                    throw new InvalidArgumentException("amountPaise must be positive");
                }
            } else {
                $amountPaise = cloud_parse_money_input_to_paise($row["amount"] ?? null, "amount", false, false);
            }
        } catch (Throwable) {
            $rejected[] = ["index" => $idx, "reason" => "Invalid amount"];
            continue;
        }
        if (!in_array($type, ["income", "expense"], true) || $date === "") {
            $rejected[] = ["index" => $idx, "reason" => "Invalid required fields (amount/type/date)"];
            continue;
        }

        $id = is_string($row["id"] ?? null) && trim((string)$row["id"]) !== "" ? (string)$row["id"] : uid("txn");
        $nowIso = now_iso();
        $payload = $row;
        $payload["id"] = $id;
        $payload["userId"] = $auth["id"];
        $payload["updatedAt"] = (string)($payload["updatedAt"] ?? $nowIso);
        $payload["createdAt"] = (string)($payload["createdAt"] ?? $nowIso);
        $payload["isDeleted"] = (int)($payload["isDeleted"] ?? 0);
        $payload["version"] = (int)($payload["version"] ?? 1);
        $payload["amountPaise"] = $amountPaise;
        $payload["amount"] = cloud_paise_to_rupee_amount($amountPaise);
        if (!isset($payload["paymentMode"]) || !is_string($payload["paymentMode"])) {
            $payload["paymentMode"] = "upi";
        }
        if (!isset($payload["merchantOrPerson"]) || !is_string($payload["merchantOrPerson"])) {
            $payload["merchantOrPerson"] = "";
        }
        if (!isset($payload["description"]) || !is_string($payload["description"])) {
            $payload["description"] = "";
        }
        if (!isset($payload["tags"]) || !is_array($payload["tags"])) {
            $payload["tags"] = [];
        }
        if (!isset($payload["notes"]) || !is_string($payload["notes"])) {
            $payload["notes"] = "";
        }
        if (!isset($payload["billAvailable"])) {
            $payload["billAvailable"] = 0;
        }
        if (!isset($payload["gstApplicable"])) {
            $payload["gstApplicable"] = 0;
        }
        if (!isset($payload["taxFlag"])) {
            $payload["taxFlag"] = 0;
        }
        try {
            cloud_validate_entity_for_collection($auth["id"], "transactions", $payload);
            cloud_validate_money_fields("transactions", $payload);
        } catch (InvalidArgumentException $e) {
            $rejected[] = ["index" => $idx, "reason" => $e->getMessage()];
            continue;
        }

        try {
            [$sql, $params] = cloud_ccr_build_upsert(
                $auth["id"],
                "transactions",
                $id,
                $payload,
                date("Y-m-d H:i:s", strtotime((string)$payload["updatedAt"])),
                ((int)$payload["isDeleted"] === 1) ? date("Y-m-d H:i:s") : null,
                uid("row"),
            );
        } catch (InvalidArgumentException $e) {
            $rejected[] = ["index" => $idx, "reason" => $e->getMessage()];
            continue;
        }
        $st = $db->prepare($sql);
        $st->execute($params);
        finance_events_sync_transaction_safe($db, $auth["id"], $payload);
        $created++;
    }

    json_ok([
        "imported" => $created,
        "rejectedCount" => count($rejected),
        "rejected" => $rejected,
    ]);
}
