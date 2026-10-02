<?php
/**
 * Server-authorized personal household invites.
 * Accepting a grant does not copy cloud_collection_rows.
 */

class PersonalHouseholdException extends RuntimeException {
    public function __construct(string $message, public int $status, public string $errorCode) {
        parent::__construct($message);
    }
}

function personal_household_allowed_collections(): array {
    return ["transactions", "accounts", "cards", "goals", "budgets", "loans", "udhari", "importSources", "cardStatements", "reconciliationMatches"];
}

function personal_household_token_hash(string $token): string {
    return hash("sha256", $token);
}

/**
 * @param array{inviter_user_id: string, role: string, expires_at: string, used_at: ?string, revoked_at: ?string}|null $invite
 * @return array{ok: bool, code: string}
 */
function personal_household_accept_decision(?array $invite, string $accepterUserId, string $nowUtc): array {
    if ($invite === null) return ["ok" => false, "code" => "NOT_FOUND"];
    if (!empty($invite["revoked_at"])) return ["ok" => false, "code" => "REVOKED"];
    if (!empty($invite["used_at"])) return ["ok" => false, "code" => "TOKEN_USED"];
    if ((string)$invite["expires_at"] <= $nowUtc) return ["ok" => false, "code" => "EXPIRED"];
    if ($accepterUserId === "" || $accepterUserId === (string)$invite["inviter_user_id"]) return ["ok" => false, "code" => "SELF_ACCEPT"];
    $role = (string)$invite["role"];
    if ($role !== "viewer" && $role !== "partner") return ["ok" => false, "code" => "ROLE"];
    return ["ok" => true, "code" => ""];
}

/**
 * @param array{revoked_at: ?string, role: string, revision: int, resource_scope: list<array{collection: string, entityId: string}>}|null $grant
 * @return array{ok: bool, code: string}
 */
function personal_household_write_decision(?array $grant, string $collection, string $entityId, ?int $queuedRevision): array {
    if ($grant === null || !empty($grant["revoked_at"])) return ["ok" => false, "code" => "REVOKED"];
    if ($queuedRevision !== null && $queuedRevision !== (int)$grant["revision"]) return ["ok" => false, "code" => "STALE_GRANT"];
    if ((string)$grant["role"] === "viewer") return ["ok" => false, "code" => "VIEWER_DENIED"];
    if ((string)$grant["role"] !== "partner") return ["ok" => false, "code" => "ROLE"];
    foreach ($grant["resource_scope"] as $item) {
        if (($item["collection"] ?? "") === $collection && ($item["entityId"] ?? "") === $entityId) {
            return ["ok" => true, "code" => ""];
        }
    }
    return ["ok" => false, "code" => "OUT_OF_SCOPE"];
}

function personal_household_last_owner_decision(int $ownerCount, string $nextRole): array {
    if ($ownerCount <= 1 && $nextRole !== "owner") return ["ok" => false, "code" => "LAST_OWNER"];
    return ["ok" => true, "code" => ""];
}

/** @return list<array{collection: string, entityId: string}> */
function personal_household_normalize_scope($raw): array {
    if (!is_array($raw) || !array_is_list($raw)) {
        throw new PersonalHouseholdException("resourceScope must be a list", 422, "VALIDATION_ERROR");
    }
    if (count($raw) > 100) {
        throw new PersonalHouseholdException("resourceScope is too large", 422, "VALIDATION_ERROR");
    }
    $allowed = personal_household_allowed_collections();
    $out = [];
    foreach ($raw as $item) {
        if (!is_array($item)) throw new PersonalHouseholdException("Invalid resource scope", 422, "VALIDATION_ERROR");
        $collection = (string)($item["collection"] ?? "");
        $entityId = (string)($item["entityId"] ?? "");
        if (!in_array($collection, $allowed, true) || $entityId === "" || strlen($entityId) > 191) {
            throw new PersonalHouseholdException("Resource is not shareable", 422, "VALIDATION_ERROR");
        }
        $out[] = ["collection" => $collection, "entityId" => $entityId];
    }
    return $out;
}

function personal_household_scope_from_json(string $json): array {
    $decoded = json_decode($json, true);
    if (!is_array($decoded)) return [];
    $out = [];
    foreach ($decoded as $item) {
        if (!is_array($item)) continue;
        $out[] = ["collection" => (string)($item["collection"] ?? ""), "entityId" => (string)($item["entityId"] ?? "")];
    }
    return $out;
}

function personal_household_dispatch(): void {
    require_once __DIR__ . "/auth.php";
    require_once __DIR__ . "/cloud_write.php";
    $auth = require_cloud_user();
    $method = strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET"));
    $db = db_conn();
    if ($method === "GET") {
        personal_household_list($db, $auth["userId"]);
        return;
    }
    if ($method !== "POST") {
        throw new PersonalHouseholdException("Method not allowed", 405, "METHOD_NOT_ALLOWED");
    }
    $body = require_json_body();
    $action = strtolower((string)($body["action"] ?? ""));
    if ($action === "issue") personal_household_issue($db, $auth["userId"], $body);
    elseif ($action === "accept") personal_household_accept($db, $auth["userId"], $body);
    elseif ($action === "revoke") personal_household_revoke($db, $auth["userId"], $body);
    elseif ($action === "write") personal_household_write($db, $auth["userId"], $body);
    else throw new PersonalHouseholdException("Unknown household action", 422, "VALIDATION_ERROR");
}

function personal_household_issue(PDO $db, string $userId, array $body): void {
    $householdId = trim((string)($body["householdId"] ?? ""));
    if ($householdId === "" || strlen($householdId) > 191) {
        throw new PersonalHouseholdException("householdId is required", 422, "VALIDATION_ERROR");
    }
    $role = (string)($body["role"] ?? "viewer");
    if ($role === "editor") $role = "partner";
    if ($role !== "viewer" && $role !== "partner") {
        throw new PersonalHouseholdException("An invite cannot assign that role", 422, "ROLE");
    }
    $days = (int)($body["expiresInDays"] ?? 7);
    if ($days < 1 || $days > 30) {
        throw new PersonalHouseholdException("expiresInDays must be from 1 to 30", 422, "VALIDATION_ERROR");
    }
    $scope = personal_household_normalize_scope($body["resourceScope"] ?? []);
    $owned = $db->prepare("SELECT 1 FROM cloud_collection_rows WHERE user_id = ? AND collection_name = 'households' AND entity_id = ? AND deleted_at IS NULL");
    $owned->execute([$userId, $householdId]);
    if (!$owned->fetch()) {
        throw new PersonalHouseholdException("Household was not found for this account", 404, "NOT_FOUND");
    }
    $resource = $db->prepare("SELECT 1 FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ? AND entity_id = ? AND deleted_at IS NULL");
    foreach ($scope as $item) {
        $resource->execute([$userId, $item["collection"], $item["entityId"]]);
        if (!$resource->fetch()) {
            throw new PersonalHouseholdException("A selected record is not in this account", 422, "OUT_OF_SCOPE");
        }
    }
    $token = bin2hex(random_bytes(32));
    $id = "phinv_" . bin2hex(random_bytes(8));
    $db->prepare(
        "INSERT INTO personal_household_invites (id, token_hash, inviter_user_id, household_id, role, resource_scope_json, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))"
    )->execute([$id, personal_household_token_hash($token), $userId, $householdId, $role, json_encode($scope, JSON_THROW_ON_ERROR), $days]);
    json_ok([
        "inviteId" => $id,
        "token" => $token,
        "role" => $role,
        "resourceCount" => count($scope),
        "copiedBooks" => false,
    ], 201);
}

function personal_household_accept(PDO $db, string $userId, array $body): void {
    $token = trim((string)($body["token"] ?? ""));
    if ($token === "" || strlen($token) > 200) {
        throw new PersonalHouseholdException("token is required", 422, "VALIDATION_ERROR");
    }
    $hash = personal_household_token_hash($token);
    $db->beginTransaction();
    try {
        $st = $db->prepare("SELECT * FROM personal_household_invites WHERE token_hash = ? FOR UPDATE");
        $st->execute([$hash]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        $now = gmdate("Y-m-d H:i:s");
        $decision = personal_household_accept_decision($row ? [
            "inviter_user_id" => (string)$row["inviter_user_id"],
            "role" => (string)$row["role"],
            "expires_at" => (string)$row["expires_at"],
            "used_at" => $row["used_at"] !== null ? (string)$row["used_at"] : null,
            "revoked_at" => $row["revoked_at"] !== null ? (string)$row["revoked_at"] : null,
        ] : null, $userId, $now);
        if (!$decision["ok"]) {
            $status = match ($decision["code"]) {
                "TOKEN_USED" => 409,
                "EXPIRED", "REVOKED" => 410,
                "SELF_ACCEPT", "ROLE" => 403,
                default => 404,
            };
            throw new PersonalHouseholdException("Invite cannot be accepted", $status, (string)$decision["code"]);
        }
        $grantId = "phgr_" . bin2hex(random_bytes(8));
        $db->prepare(
            "INSERT INTO personal_household_grants (id, grantee_user_id, owner_user_id, household_id, invite_id, role, resource_scope_json, revision)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE role = VALUES(role), resource_scope_json = VALUES(resource_scope_json), invite_id = VALUES(invite_id), revoked_at = NULL, revision = revision + 1, updated_at = UTC_TIMESTAMP()"
        )->execute([
            $grantId,
            $userId,
            $row["inviter_user_id"],
            $row["household_id"],
            $row["id"],
            $row["role"],
            $row["resource_scope_json"],
        ]);
        $used = $db->prepare("UPDATE personal_household_invites SET used_at = UTC_TIMESTAMP(), used_by = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL");
        $used->execute([$userId, $row["id"]]);
        if ($used->rowCount() !== 1) {
            throw new PersonalHouseholdException("Invite cannot be accepted", 409, "TOKEN_USED");
        }
        $db->commit();
        json_ok([
            "householdId" => (string)$row["household_id"],
            "role" => (string)$row["role"],
            "copiedBooks" => false,
        ]);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

function personal_household_revoke(PDO $db, string $userId, array $body): void {
    $grantId = trim((string)($body["grantId"] ?? ""));
    if ($grantId === "") throw new PersonalHouseholdException("grantId is required", 422, "VALIDATION_ERROR");
    $db->beginTransaction();
    try {
        $st = $db->prepare("SELECT * FROM personal_household_grants WHERE id = ? FOR UPDATE");
        $st->execute([$grantId]);
        $grant = $st->fetch(PDO::FETCH_ASSOC);
        if (!$grant || (string)$grant["owner_user_id"] !== $userId) {
            throw new PersonalHouseholdException("Grant was not found", 404, "NOT_FOUND");
        }
        $db->prepare("UPDATE personal_household_grants SET revoked_at = UTC_TIMESTAMP(), revision = revision + 1 WHERE id = ? AND revoked_at IS NULL")
            ->execute([$grantId]);
        $db->commit();
        json_ok(["grantId" => $grantId, "revoked" => true, "offlineCache" => "A disconnected device can keep a cached copy until it reconnects."]);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

function personal_household_list(PDO $db, string $userId): void {
    $asGrantee = personal_household_projection($db, $userId);
    $owned = $db->prepare("SELECT id, grantee_user_id, household_id, role, revision, revoked_at FROM personal_household_grants WHERE owner_user_id = ?");
    $owned->execute([$userId]);
    $asOwner = [];
    while ($row = $owned->fetch(PDO::FETCH_ASSOC)) {
        $asOwner[] = [
            "grantId" => (string)$row["id"],
            "granteeUserId" => (string)$row["grantee_user_id"],
            "householdId" => (string)$row["household_id"],
            "role" => (string)$row["role"],
            "revision" => (int)$row["revision"],
            "revoked" => $row["revoked_at"] !== null,
        ];
    }
    json_ok(["asGrantee" => $asGrantee, "asOwner" => $asOwner]);
}

function personal_household_projection(PDO $db, string $userId): array {
    $st = $db->prepare("SELECT * FROM personal_household_grants WHERE grantee_user_id = ? AND revoked_at IS NULL");
    $st->execute([$userId]);
    $grants = [];
    $load = $db->prepare("SELECT payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ? AND entity_id = ? AND deleted_at IS NULL");
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $scope = personal_household_scope_from_json((string)$row["resource_scope_json"]);
        $resources = [];
        foreach ($scope as $item) {
            $load->execute([$row["owner_user_id"], $item["collection"], $item["entityId"]]);
            $found = $load->fetch(PDO::FETCH_ASSOC);
            if (!$found) continue;
            $payload = json_decode((string)$found["payload"], true);
            if (!is_array($payload)) continue;
            $resources[] = ["collection" => $item["collection"], "entityId" => $item["entityId"], "record" => $payload];
        }
        $grants[] = [
            "grantId" => (string)$row["id"],
            "householdId" => (string)$row["household_id"],
            "ownerUserId" => (string)$row["owner_user_id"],
            "role" => (string)$row["role"],
            "revision" => (int)$row["revision"],
            "resources" => $resources,
        ];
    }
    return $grants;
}

function personal_household_write(PDO $db, string $userId, array $body): void {
    $grantId = trim((string)($body["grantId"] ?? ""));
    $collection = (string)($body["collection"] ?? "");
    $entityId = (string)($body["entityId"] ?? "");
    $queued = array_key_exists("expectedRevision", $body) ? (int)$body["expectedRevision"] : null;
    if ($grantId === "" || $collection === "" || $entityId === "") {
        throw new PersonalHouseholdException("grantId, collection, and entityId are required", 422, "VALIDATION_ERROR");
    }
    $lookup = $db->prepare("SELECT owner_user_id FROM personal_household_grants WHERE id = ? AND grantee_user_id = ?");
    $lookup->execute([$grantId, $userId]);
    $owner = $lookup->fetch(PDO::FETCH_ASSOC);
    if (!$owner) throw new PersonalHouseholdException("Grant was not found", 404, "NOT_FOUND");
    $ownerId = (string)$owner["owner_user_id"];
    $mutationId = (string)($body["mutationId"] ?? "");
    cloud_write_respond($ownerId, ["mutationId" => $mutationId], function () use ($db, $grantId, $userId, $collection, $entityId, $queued, $body, $ownerId) {
        $st = $db->prepare("SELECT * FROM personal_household_grants WHERE id = ? AND grantee_user_id = ? FOR UPDATE");
        $st->execute([$grantId, $userId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        $grant = $row ? [
            "revoked_at" => $row["revoked_at"] !== null ? (string)$row["revoked_at"] : null,
            "role" => (string)$row["role"],
            "revision" => (int)$row["revision"],
            "resource_scope" => personal_household_scope_from_json((string)$row["resource_scope_json"]),
        ] : null;
        $decision = personal_household_write_decision($grant, $collection, $entityId, $queued);
        if (!$decision["ok"]) {
            $status = $decision["code"] === "STALE_GRANT" ? 409 : 403;
            throw new CloudWriteException("Shared write was refused", $status, (string)$decision["code"]);
        }
        $existing = cloud_write_row($db, $ownerId, $collection, $entityId);
        if (!$existing) throw new CloudWriteException("Shared record was not found", 404, "NOT_FOUND");
        $patch = is_array($body["patch"] ?? null) ? $body["patch"] : [];
        unset($patch["userId"], $patch["id"]);
        $next = array_merge($existing, $patch);
        $next["id"] = $entityId;
        $next["userId"] = $ownerId;
        $next["version"] = ((int)($existing["version"] ?? 1)) + 1;
        $next["updatedAt"] = gmdate("c");
        cloud_write_save($db, $ownerId, $collection, $next, $existing);
        return ["grantId" => $grantId, "entityId" => $entityId, "revision" => (int)$row["revision"], "copiedBooks" => false];
    });
}
