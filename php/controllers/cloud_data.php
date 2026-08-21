<?php

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/utils.php";
require_once __DIR__ . "/../helpers/validator.php";
require_once __DIR__ . "/../helpers/money_paise.php";
require_once __DIR__ . "/../helpers/cloud_payload.php";
require_once __DIR__ . "/../helpers/finance_events.php";
require_once __DIR__ . "/../helpers/user_audit.php";
require_once __DIR__ . "/../helpers/household_auth.php";
require_once __DIR__ . "/../helpers/mutation_idempotency.php";

function cloud_patch_denied_fields(): array {
    return ["id", "userId", "createdAt"];
}

function cloud_patch_has_denied_field(array $patch): ?string {
    $denied = cloud_patch_denied_fields();
    foreach ($patch as $key => $_value) {
        if (in_array((string)$key, $denied, true)) {
            return (string)$key;
        }
    }
    return null;
}

function cloud_audit_transaction_change(string $userId, string $actionKey, array $before, array $after): void {
    $entityId = is_string($after["id"] ?? null)
        ? (string)$after["id"]
        : (is_string($before["id"] ?? null) ? (string)$before["id"] : "");
    if ($entityId === "") return;
    user_audit_log($userId, $actionKey, "transaction", $entityId, $before, $after);
}

function cloud_audit_sensitive_collection_change(string $userId, string $collection, string $actionKey, array $before, array $after): void {
    if ($collection === "cards") {
        user_audit_log($userId, $actionKey, "card", (string)($after["id"] ?? $before["id"] ?? ""), $before, $after);
    } elseif ($collection === "loans") {
        user_audit_log($userId, $actionKey, "loan", (string)($after["id"] ?? $before["id"] ?? ""), $before, $after);
    }
}

function cloud_sync_pull(): void {
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }

    $collections = [];
    foreach (cloud_collections() as $c) $collections[$c] = [];

    $db = db_conn();
    $st = $db->prepare("SELECT collection_name, entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC");
    $st->execute([$auth["id"]]);
    while ($row = $st->fetch()) {
        $collection = (string)$row["collection_name"];
        if (!array_key_exists($collection, $collections)) continue;
        $payload = decode_payload($row["payload"]);
        $payload["id"] = $row["entity_id"];
        $collections[$collection][] = $payload;
    }
    json_ok(["collections" => $collections]);
}

function cloud_sync_push(): void {
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    csrf_require_for_mutations();

    $raw = file_get_contents("php://input");
    if ($raw === false) {
        json_error("Invalid sync payload", 400);
        return;
    }
    try {
        cloud_validate_sync_push_raw_size($raw);
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 413, "PAYLOAD_TOO_LARGE");
        return;
    }

    $body = json_decode($raw, true);
    if (!is_array($body)) {
        json_error("Invalid sync payload", 400);
        return;
    }

    $collections = $body["collections"] ?? null;
    if (!is_array($collections)) {
        json_error("Invalid sync payload", 400);
        return;
    }

    $db = db_conn();
    $upserted = 0;
    foreach ($collections as $collection => $rows) {
        if (!is_string($collection) || !is_cloud_collection($collection)) {
            json_error("Unknown or invalid collection: " . (is_string($collection) ? $collection : ""), 400, "INVALID_COLLECTION");
            return;
        }
        if (!is_array($rows)) {
            json_error("Invalid rows for collection " . $collection, 400, "INVALID_COLLECTION_ROWS");
            return;
        }
        foreach ($rows as $i => $row) {
            if (!is_array($row)) {
                continue;
            }
            $entityId = isset($row["id"]) && is_string($row["id"]) && $row["id"] !== "" ? $row["id"] : null;
            if ($entityId === null) {
                continue;
            }
            try {
                cloud_validate_entity_for_collection($auth["id"], $collection, $row);
                cloud_validate_money_fields($collection, $row);
            } catch (InvalidArgumentException $e) {
                json_error($e->getMessage(), 422, "VALIDATION_ERROR");
                return;
            }
            $updatedAt = isset($row["updatedAt"]) && is_string($row["updatedAt"]) ? strtotime($row["updatedAt"]) : false;
            $updatedDate = $updatedAt === false ? date("Y-m-d H:i:s") : date("Y-m-d H:i:s", $updatedAt);
            $isDeleted = (($row["isDeleted"] ?? 0) === 1 || ($row["isDeleted"] ?? false) === true);
            $id = uid("row");

            try {
                [$sql, $params] = cloud_ccr_build_upsert(
                    $auth["id"],
                    $collection,
                    $entityId,
                    $row,
                    $updatedDate,
                    $isDeleted ? date("Y-m-d H:i:s") : null,
                    $id,
                );
            } catch (InvalidArgumentException $e) {
                json_error($e->getMessage(), 422, "VALIDATION_ERROR");
                return;
            }

            $st = $db->prepare($sql);
            $st->execute($params);
            if ($collection === "transactions") {
                finance_events_sync_transaction_safe($db, $auth["id"], $row);
            }
            $upserted++;
        }
    }
    json_ok(["upserted" => $upserted]);
}

function cloud_entity_list(string $collection): void {
    if (!is_cloud_collection($collection)) {
        json_error("Invalid collection", 400);
        return;
    }
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $userId = $_GET["userId"] ?? null;
    if (!is_string($userId) || $userId === "") {
        json_error("userId query is required", 400);
        return;
    }

    $db = db_conn();
    $st = $db->prepare("SELECT entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ? AND deleted_at IS NULL ORDER BY updated_at DESC");
    $st->execute([$auth["id"], $collection]);
    $out = [];
    while ($r = $st->fetch()) {
        $item = decode_payload($r["payload"]);
        $item["id"] = $r["entity_id"];
        if (($item["userId"] ?? null) === $userId && (($item["isDeleted"] ?? 0) !== 1)) {
            $out[] = $item;
        }
    }
    json_ok($out);
}

function cloud_entity_create(string $collection): void {
    if (!is_cloud_collection($collection)) {
        json_error("Invalid collection", 400);
        return;
    }
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $body = require_json_body();
    $userId = $body["userId"] ?? null;
    $data = $body["data"] ?? null;
    $idPrefix = isset($body["idPrefix"]) && is_string($body["idPrefix"]) ? $body["idPrefix"] : "ent";
    if (!is_string($userId) || $userId === "" || !is_array($data)) {
        json_error("userId and data are required", 400);
        return;
    }
    if ($userId !== $auth["id"]) {
        json_error("userId must match authenticated user", 403, "USER_MISMATCH");
        return;
    }

    $mutationId = "";
    if (isset($body["mutationId"]) && is_string($body["mutationId"])) {
        $mutationId = trim($body["mutationId"]);
    } elseif (isset($data["mutationId"]) && is_string($data["mutationId"])) {
        $mutationId = trim($data["mutationId"]);
    }

    $db = db_conn();
    if ($mutationId !== "") {
        $lookup = financial_mutation_lookup($db, $auth["id"], $mutationId);
        if ($lookup !== null && $lookup["hit"] === true && is_string($lookup["entityId"])) {
            $existing = cloud_get_row($auth["id"], $collection, $lookup["entityId"]);
            if ($existing) {
                $payload = decode_payload($existing["payload"]);
                $payload["id"] = $existing["entity_id"];
                json_ok($payload, 200);
                return;
            }
        }
    }

    $now = now_iso();
    $entity = $data;
    unset($entity["mutationId"]);
    $entity["id"] = (isset($data["id"]) && is_string($data["id"]) && $data["id"] !== "") ? $data["id"] : uid($idPrefix);
    $entity["userId"] = $userId;
    $entity["createdAt"] = isset($data["createdAt"]) && is_string($data["createdAt"]) ? $data["createdAt"] : $now;
    $entity["updatedAt"] = $now;
    $entity["isDeleted"] = (int)($data["isDeleted"] ?? 0);
    $entity["version"] = (int)($data["version"] ?? 1);
    $entity["tags"] = isset($data["tags"]) && is_array($data["tags"]) ? $data["tags"] : [];
    $entity["notes"] = isset($data["notes"]) && is_string($data["notes"]) ? $data["notes"] : "";

    try {
        cloud_validate_entity_for_collection($auth["id"], $collection, $entity);
        cloud_validate_money_fields($collection, $entity);
        cloud_enforce_household_write($db, $auth["id"], $collection, $entity);
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }

    try {
        [$sql, $params] = cloud_ccr_build_upsert(
            $auth["id"],
            $collection,
            $entity["id"],
            $entity,
            date("Y-m-d H:i:s", strtotime($entity["updatedAt"])),
            ((int)$entity["isDeleted"] === 1) ? date("Y-m-d H:i:s") : null,
            uid("row"),
        );
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    $st = $db->prepare($sql);
    $st->execute($params);
    if ($mutationId !== "") {
        try {
            financial_mutation_record($db, $auth["id"], $mutationId, $collection, $entity["id"], "create");
        } catch (Throwable) {
            $again = financial_mutation_lookup($db, $auth["id"], $mutationId);
            if ($again !== null && $again["hit"] === true && is_string($again["entityId"])) {
                $existing = cloud_get_row($auth["id"], $collection, $again["entityId"]);
                if ($existing) {
                    $payload = decode_payload($existing["payload"]);
                    $payload["id"] = $existing["entity_id"];
                    json_ok($payload, 200);
                    return;
                }
            }
        }
    }
    if ($collection === "transactions") {
        finance_events_sync_transaction_safe($db, $auth["id"], $entity);
    }
    cloud_audit_sensitive_collection_change($auth["id"], $collection, $collection . ".create", [], $entity);
    json_ok($entity, 201);
}

function cloud_entity_delete_bulk(string $collection): void {
    if (!is_cloud_collection($collection)) {
        json_error("Invalid collection", 400);
        return;
    }
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $body = json_input();
    $ids = $body["ids"] ?? null;
    if (is_array($ids) && count($ids) > 0) {
        $db = db_conn();
        $updated = 0;
        foreach ($ids as $idVal) {
            $id = is_string($idVal) ? trim($idVal) : "";
            if ($id === "") continue;
            $row = cloud_get_row($auth["id"], $collection, $id);
            if (!$row) continue;
            $current = decode_payload($row["payload"]);
            $next = $current;
            $next["isDeleted"] = 1;
            $next["updatedAt"] = now_iso();
            $next["version"] = (int)($current["version"] ?? 0) + 1;
            try {
                cloud_validate_entity_for_collection($auth["id"], $collection, $next);
                cloud_validate_money_fields($collection, $next);
            } catch (InvalidArgumentException $e) {
                json_error($e->getMessage(), 422, "VALIDATION_ERROR");
                return;
            }
            try {
                [$sql, $params] = cloud_ccr_build_update_by_table_id(
                    $next,
                    $collection,
                    date("Y-m-d H:i:s", strtotime($next["updatedAt"])),
                    date("Y-m-d H:i:s"),
                    $row["id"],
                );
            } catch (InvalidArgumentException $e) {
                json_error($e->getMessage(), 422, "VALIDATION_ERROR");
                return;
            }
            $up = $db->prepare($sql);
            $up->execute($params);
            if ($collection === "transactions") {
                finance_events_sync_transaction_safe($db, $auth["id"], $next);
                cloud_audit_transaction_change($auth["id"], "transaction.delete", $current, $next);
            }
            cloud_audit_sensitive_collection_change($auth["id"], $collection, $collection . ".delete", $current, $next);
            $updated++;
        }
        json_ok(["deleted" => $updated]);
        return;
    }
    $userId = $_GET["userId"] ?? null;
    if (!is_string($userId) || $userId === "") {
        json_error("userId query is required", 400);
        return;
    }

    $db = db_conn();
    $st = $db->prepare("SELECT id, payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ?");
    $st->execute([$auth["id"], $collection]);
    $ids = [];
    while ($r = $st->fetch()) {
        $payload = decode_payload($r["payload"]);
        if (($payload["userId"] ?? null) === $userId) $ids[] = $r["id"];
    }
    if (count($ids) > 0) {
        $placeholders = implode(",", array_fill(0, count($ids), "?"));
        $del = $db->prepare("DELETE FROM cloud_collection_rows WHERE id IN (" . $placeholders . ")");
        $del->execute($ids);
    }
    json_ok(["deleted" => count($ids)]);
}

function cloud_get_row(string $authUserId, string $collection, string $entityId): ?array {
    $db = db_conn();
    $st = $db->prepare("SELECT id, entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ? AND entity_id = ? LIMIT 1");
    $st->execute([$authUserId, $collection, $entityId]);
    $row = $st->fetch();
    return $row ?: null;
}

function cloud_entity_get_one(string $collection, string $id): void {
    if (!is_cloud_collection($collection)) {
        json_error("Invalid collection", 400);
        return;
    }
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $row = cloud_get_row($auth["id"], $collection, $id);
    if (!$row) {
        json_error("Entity not found", 404);
        return;
    }
    $item = decode_payload($row["payload"]);
    $item["id"] = $row["entity_id"];
    json_ok($item);
}

function cloud_entity_patch_one(string $collection, string $id): void {
    if (!is_cloud_collection($collection)) {
        json_error("Invalid collection", 400);
        return;
    }
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $body = require_json_body();
    $patch = $body["patch"] ?? null;
    if (!is_array($patch)) {
        json_error("patch is required", 400);
        return;
    }
    $deniedField = cloud_patch_has_denied_field($patch);
    if ($deniedField !== null) {
        json_error("Forbidden patch field: " . $deniedField, 422, "PATCH_FIELD_NOT_ALLOWED");
        return;
    }
    $row = cloud_get_row($auth["id"], $collection, $id);
    if (!$row) {
        json_error("Entity not found", 404);
        return;
    }
    $current = decode_payload($row["payload"]);
    $next = array_merge($current, $patch);
    $next["id"] = $id;
    $next["updatedAt"] = now_iso();
    $next["version"] = (int)($current["version"] ?? 0) + 1;
    try {
        cloud_validate_entity_for_collection($auth["id"], $collection, $next);
        cloud_validate_money_fields($collection, $next);
        cloud_enforce_household_write(db_conn(), $auth["id"], $collection, $next);
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    $deletedFlag = ((int)($next["isDeleted"] ?? 0) === 1);

    $db = db_conn();
    try {
        [$sql, $params] = cloud_ccr_build_update_by_table_id(
            $next,
            $collection,
            date("Y-m-d H:i:s", strtotime($next["updatedAt"])),
            $deletedFlag ? date("Y-m-d H:i:s") : null,
            $row["id"],
        );
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    $up = $db->prepare($sql);
    $up->execute($params);
    if ($collection === "transactions") {
        finance_events_sync_transaction_safe($db, $auth["id"], $next);
        cloud_audit_transaction_change(
            $auth["id"],
            $deletedFlag ? "transaction.delete" : "transaction.edit",
            $current,
            $next,
        );
    }
    cloud_audit_sensitive_collection_change($auth["id"], $collection, $deletedFlag ? $collection . ".delete" : $collection . ".edit", $current, $next);
    json_ok($next);
}

function cloud_entity_patch_many(string $collection): void {
    if (!is_cloud_collection($collection)) {
        json_error("Invalid collection", 400);
        return;
    }
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $body = require_json_body();
    $ids = $body["ids"] ?? null;
    $patch = $body["patch"] ?? null;
    if (!is_array($ids) || !is_array($patch) || count($ids) === 0) {
        json_error("ids and patch are required", 400, "INVALID_BATCH_PATCH");
        return;
    }
    $deniedField = cloud_patch_has_denied_field($patch);
    if ($deniedField !== null) {
        json_error("Forbidden patch field: " . $deniedField, 422, "PATCH_FIELD_NOT_ALLOWED");
        return;
    }

    $updated = [];
    foreach ($ids as $idVal) {
        $id = is_string($idVal) ? trim($idVal) : "";
        if ($id === "") continue;
        $row = cloud_get_row($auth["id"], $collection, $id);
        if (!$row) continue;
        $current = decode_payload($row["payload"]);
        $next = array_merge($current, $patch);
        $next["id"] = $id;
        $next["updatedAt"] = now_iso();
        $next["version"] = (int)($current["version"] ?? 0) + 1;
        try {
            cloud_validate_entity_for_collection($auth["id"], $collection, $next);
            cloud_validate_money_fields($collection, $next);
        } catch (InvalidArgumentException $e) {
            json_error($e->getMessage(), 422, "VALIDATION_ERROR");
            return;
        }
        $deletedFlag = ((int)($next["isDeleted"] ?? 0) === 1);

        $db = db_conn();
        try {
            [$sql, $params] = cloud_ccr_build_update_by_table_id(
                $next,
                $collection,
                date("Y-m-d H:i:s", strtotime($next["updatedAt"])),
                $deletedFlag ? date("Y-m-d H:i:s") : null,
                $row["id"],
            );
        } catch (InvalidArgumentException $e) {
            json_error($e->getMessage(), 422, "VALIDATION_ERROR");
            return;
        }
        $up = $db->prepare($sql);
        $up->execute($params);
        if ($collection === "transactions") {
            finance_events_sync_transaction_safe($db, $auth["id"], $next);
            cloud_audit_transaction_change(
                $auth["id"],
                $deletedFlag ? "transaction.delete" : "transaction.edit",
                $current,
                $next,
            );
        }
        cloud_audit_sensitive_collection_change($auth["id"], $collection, $deletedFlag ? $collection . ".delete" : $collection . ".edit", $current, $next);
        $updated[] = $next;
    }
    json_ok(["updated" => $updated, "count" => count($updated)]);
}

function cloud_entity_delete_one(string $collection, string $id): void {
    if (!is_cloud_collection($collection)) {
        json_error("Invalid collection", 400);
        return;
    }
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $row = cloud_get_row($auth["id"], $collection, $id);
    if (!$row) {
        json_error("Entity not found", 404);
        return;
    }
    $hard = (($_GET["hard"] ?? "") === "1");
    $db = db_conn();
    if ($hard) {
        $del = $db->prepare("DELETE FROM cloud_collection_rows WHERE id = ?");
        $del->execute([$row["id"]]);
        json_ok(["hardDeleted" => true]);
        return;
    }

    $current = decode_payload($row["payload"]);
    $next = $current;
    $next["isDeleted"] = 1;
    $next["updatedAt"] = now_iso();
    $next["version"] = (int)($current["version"] ?? 0) + 1;

    try {
        cloud_validate_entity_for_collection($auth["id"], $collection, $next);
        cloud_validate_money_fields($collection, $next);
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    try {
        [$sql, $params] = cloud_ccr_build_update_by_table_id(
            $next,
            $collection,
            date("Y-m-d H:i:s", strtotime($next["updatedAt"])),
            date("Y-m-d H:i:s"),
            $row["id"],
        );
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    $up = $db->prepare($sql);
    $up->execute($params);
    if ($collection === "transactions") {
        finance_events_sync_transaction_safe($db, $auth["id"], $next);
        cloud_audit_transaction_change($auth["id"], "transaction.delete", $current, $next);
    }
    cloud_audit_sensitive_collection_change($auth["id"], $collection, $collection . ".delete", $current, $next);
    json_ok($next);
}
