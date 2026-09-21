<?php

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/utils.php";
require_once __DIR__ . "/../helpers/validator.php";
require_once __DIR__ . "/../helpers/money_paise.php";
require_once __DIR__ . "/../helpers/cloud_write.php";

function cloud_patch_denied_fields(): array {
    return ["id", "userId", "createdAt", "version"];
}

function cloud_patch_has_denied_field(array $patch): ?string {
    foreach (cloud_patch_denied_fields() as $field) if (array_key_exists($field, $patch)) return $field;
    return null;
}

function cloud_write_auth(string $collection): ?array {
    if (!is_cloud_collection($collection)) {
        json_error("Invalid collection", 400, "INVALID_COLLECTION");
        return null;
    }
    try { return auth_require_active_user(); }
    catch (Throwable $error) { json_error($error->getMessage(), 401, "UNAUTHORIZED"); return null; }
}

function cloud_sync_pull(): void {
    try { $auth = auth_require_active_user(); }
    catch (Throwable $error) { json_error($error->getMessage(), 401); return; }
    $collections = array_fill_keys(cloud_collections(), []);
    $st = db_conn()->prepare("SELECT collection_name, entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC");
    $st->execute([$auth["id"]]);
    while ($row = $st->fetch()) {
        if (!array_key_exists($row["collection_name"], $collections)) continue;
        $payload = decode_payload($row["payload"]);
        $payload["id"] = $row["entity_id"];
        $collections[$row["collection_name"]][] = $payload;
    }
    json_ok(["collections" => $collections]);
}

function cloud_sync_push(): void {
    try { $auth = auth_require_active_user(); }
    catch (Throwable $error) { json_error($error->getMessage(), 401); return; }
    csrf_require_for_mutations();
    $raw = file_get_contents("php://input");
    try { cloud_validate_sync_push_raw_size($raw === false ? "" : $raw); }
    catch (InvalidArgumentException $error) { json_error($error->getMessage(), 413, "PAYLOAD_TOO_LARGE"); return; }
    $body = json_decode($raw === false ? "" : $raw, true);
    if (!is_array($body) || !is_array($body["collections"] ?? null)) {
        json_error("Invalid sync payload", 400); return;
    }
    $db = db_conn();
    cloud_write_respond($auth["id"], [...$body, "operation" => "sync"], function () use ($db, $auth, $body) {
        $written = [];
        $seen = [];
        foreach ($body["collections"] as $collection => $rows) {
            if (!is_string($collection) || !is_cloud_collection($collection)) throw new CloudWriteException("Invalid collection", 400, "INVALID_COLLECTION");
            if (!is_array($rows) || !array_is_list($rows)) throw new CloudWriteException("Rows must be an array", 400, "INVALID_COLLECTION_ROWS");
            foreach ($rows as $next) {
                if (!is_array($next) || !is_string($next["id"] ?? null) || $next["id"] === "") throw new InvalidArgumentException("Every sync row requires an id");
                $id = $next["id"];
                $key = $collection . ":" . $id;
                if (isset($seen[$key])) throw new InvalidArgumentException("Duplicate entity in sync batch");
                $seen[$key] = true;
                cloud_validate_entity_for_collection($auth["id"], $collection, $next);
                $current = cloud_write_row($db, $auth["id"], $collection, $id);
                if ($current && cloud_write_hash($next) === cloud_write_hash($current)) continue;
                if ($current) cloud_write_check_version($current, $body["expectedVersions"][$collection][$id] ?? null, true);
                $next["version"] = $current ? (int)($current["version"] ?? 1) + 1 : 1;
                $next["updatedAt"] = now_iso();
                if ($current) $next["createdAt"] = $current["createdAt"];
                cloud_write_save($db, $auth["id"], $collection, $next, $current, true);
                $written[] = [$collection, $next];
            }
        }
        // Validate the final graph so transaction/parent rows can arrive in either order.
        foreach ($written as [$collection, $next]) {
            cloud_write_validate_references($db, $auth["id"], $collection, $next);
            if ((int)($next["isDeleted"] ?? 0) === 1) cloud_write_prevent_orphans($db, $auth["id"], $collection, $next["id"]);
            if ($collection === "transactions") finance_events_sync_transaction($db, $auth["id"], $next);
        }
        return ["upserted" => count($written)];
    });
}

function cloud_entity_list(string $collection): void {
    if (!($auth = cloud_write_auth($collection))) return;
    $userId = $_GET["userId"] ?? null;
    if (!is_string($userId) || $userId === "") { json_error("userId query is required", 400); return; }
    if ($userId !== $auth["id"]) { json_error("userId must match authenticated user", 403, "USER_MISMATCH"); return; }
    $st = db_conn()->prepare("SELECT entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ? AND deleted_at IS NULL ORDER BY updated_at DESC");
    $st->execute([$auth["id"], $collection]);
    $out = [];
    while ($row = $st->fetch()) {
        $item = decode_payload($row["payload"]);
        $item["id"] = $row["entity_id"];
        if (($item["userId"] ?? null) === $userId && (int)($item["isDeleted"] ?? 0) !== 1) $out[] = $item;
    }
    json_ok($out);
}

function cloud_entity_create(string $collection): void {
    if (!($auth = cloud_write_auth($collection))) return;
    $body = require_json_body();
    if (!is_string($body["userId"] ?? null) || !is_array($body["data"] ?? null)) { json_error("userId and data are required", 400); return; }
    if ($body["userId"] !== $auth["id"]) { json_error("userId must match authenticated user", 403, "USER_MISMATCH"); return; }
    $body["mutationId"] = $body["mutationId"] ?? $body["data"]["mutationId"] ?? "";
    $db = db_conn();
    cloud_write_respond($auth["id"], [...$body, "operation" => "create", "collection" => $collection], function () use ($db, $auth, $collection, $body) {
        $entity = $body["data"];
        unset($entity["mutationId"]);
        $entity["id"] = $entity["id"] ?? uid(is_string($body["idPrefix"] ?? null) ? $body["idPrefix"] : "ent");
        if (!is_string($entity["id"]) || $entity["id"] === "") throw new InvalidArgumentException("Invalid entity id");
        if (cloud_write_row($db, $auth["id"], $collection, $entity["id"])) throw new CloudWriteException("Entity already exists", 409, "ENTITY_EXISTS");
        $entity["userId"] = $auth["id"];
        $entity["createdAt"] = $entity["createdAt"] ?? now_iso();
        $entity["updatedAt"] = now_iso();
        $entity["isDeleted"] = (int)($entity["isDeleted"] ?? 0);
        $entity["version"] = 1;
        $entity["tags"] = $entity["tags"] ?? [];
        $entity["notes"] = $entity["notes"] ?? "";
        return cloud_write_save($db, $auth["id"], $collection, $entity);
    }, 201);
}

function cloud_get_row(string $authUserId, string $collection, string $entityId): ?array {
    $st = db_conn()->prepare("SELECT id, entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ? AND entity_id = ? LIMIT 1");
    $st->execute([$authUserId, $collection, $entityId]);
    return $st->fetch() ?: null;
}

function cloud_entity_get_one(string $collection, string $id): void {
    if (!($auth = cloud_write_auth($collection))) return;
    if (isset($_GET["userId"]) && $_GET["userId"] !== $auth["id"]) { json_error("userId must match authenticated user", 403, "USER_MISMATCH"); return; }
    $row = cloud_get_row($auth["id"], $collection, $id);
    if (!$row) { json_error("Entity not found", 404, "NOT_FOUND"); return; }
    $item = decode_payload($row["payload"]);
    $item["id"] = $row["entity_id"];
    json_ok($item);
}

function cloud_apply_patch(PDO $db, string $userId, string $collection, string $id, array $patch, $expected = null): array {
    $denied = cloud_patch_has_denied_field($patch);
    if ($denied) throw new CloudWriteException("Forbidden patch field: " . $denied, 422, "PATCH_FIELD_NOT_ALLOWED");
    $current = cloud_write_row($db, $userId, $collection, $id);
    if (!$current) throw new CloudWriteException("Entity not found", 404, "NOT_FOUND");
    cloud_write_check_version($current, $expected);
    $next = array_merge($current, $patch, ["id" => $id, "userId" => $userId, "updatedAt" => now_iso(), "version" => (int)($current["version"] ?? 1) + 1]);
    return cloud_write_save($db, $userId, $collection, $next, $current);
}

function cloud_entity_patch_one(string $collection, string $id): void {
    if (!($auth = cloud_write_auth($collection))) return;
    $body = require_json_body();
    if (!is_array($body["patch"] ?? null)) { json_error("patch is required", 400); return; }
    if (isset($body["userId"]) && $body["userId"] !== $auth["id"]) { json_error("userId must match authenticated user", 403, "USER_MISMATCH"); return; }
    cloud_write_respond($auth["id"], [...$body, "operation" => "patch", "collection" => $collection, "id" => $id],
        fn() => cloud_apply_patch(db_conn(), $auth["id"], $collection, $id, $body["patch"], $body["expectedVersion"] ?? null));
}

function cloud_entity_patch_many(string $collection): void {
    if (!($auth = cloud_write_auth($collection))) return;
    $body = require_json_body();
    if (!is_array($body["ids"] ?? null) || !$body["ids"] || !is_array($body["patch"] ?? null)) { json_error("ids and patch are required", 400, "INVALID_BATCH_PATCH"); return; }
    cloud_write_respond($auth["id"], [...$body, "operation" => "batch_patch", "collection" => $collection], function () use ($auth, $collection, $body) {
        $updated = [];
        foreach (array_unique($body["ids"]) as $id) {
            if (!is_string($id) || $id === "") throw new InvalidArgumentException("Invalid entity id");
            $updated[] = cloud_apply_patch(db_conn(), $auth["id"], $collection, $id, $body["patch"], $body["expectedVersions"][$id] ?? null);
        }
        return ["updated" => $updated, "count" => count($updated)];
    });
}

function cloud_entity_delete_one(string $collection, string $id): void {
    if (!($auth = cloud_write_auth($collection))) return;
    $body = json_input();
    $hard = ($_GET["hard"] ?? "") === "1";
    cloud_write_respond($auth["id"], [...$body, "operation" => $hard ? "hard_delete" : "delete", "collection" => $collection, "id" => $id], function () use ($auth, $collection, $id, $hard, $body) {
        if (!$hard) return cloud_apply_patch(db_conn(), $auth["id"], $collection, $id, ["isDeleted" => 1], $body["expectedVersion"] ?? null);
        cloud_write_hard_delete(db_conn(), $auth["id"], $collection, $id);
        return ["hardDeleted" => true];
    });
}

function cloud_entity_delete_bulk(string $collection): void {
    if (!($auth = cloud_write_auth($collection))) return;
    $body = json_input();
    $ids = $body["ids"] ?? null;
    $hard = $ids === null;
    if ($hard && ($_GET["userId"] ?? null) !== $auth["id"]) { json_error("userId must match authenticated user", 403, "USER_MISMATCH"); return; }
    if (!$hard && (!is_array($ids) || !$ids)) { json_error("ids must be a nonempty array", 400); return; }
    $db = db_conn();
    cloud_write_respond($auth["id"], [...$body, "operation" => $hard ? "hard_delete_all" : "batch_delete", "collection" => $collection], function () use ($auth, $collection, $ids, $hard, $db, $body) {
        if ($hard) {
            $st = $db->prepare("SELECT entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ?");
            $st->execute([$auth["id"], $collection]);
            $ids = [];
            foreach ($st->fetchAll() as $row) {
                cloud_enforce_household_write($db, $auth["id"], $collection, decode_payload($row["payload"]));
                $ids[] = $row["entity_id"];
            }
            // References within a wholly deleted collection do not survive this transaction.
            $db->prepare("UPDATE cloud_collection_rows SET deleted_at = UTC_TIMESTAMP() WHERE user_id = ? AND collection_name = ?")->execute([$auth["id"], $collection]);
        }
        foreach (array_unique($ids) as $id) {
            if (!is_string($id) || $id === "") throw new InvalidArgumentException("Invalid entity id");
            if ($hard) cloud_write_hard_delete($db, $auth["id"], $collection, $id);
            else cloud_apply_patch($db, $auth["id"], $collection, $id, ["isDeleted" => 1], $body["expectedVersions"][$id] ?? null);
        }
        return ["deleted" => count(array_unique($ids))];
    });
}
