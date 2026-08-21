<?php
/**
 * Household permission enforcement for cloud entity writes.
 */

function household_sensitive_collections(): array {
    return ["households", "householdMembers", "householdPermissions"];
}

/**
 * Enforce: only household owner (or self-owned row) may mutate household* collections.
 * Members with role viewer cannot create/update/delete household config.
 */
function cloud_enforce_household_write(PDO $db, string $authUserId, string $collection, array $entity): void {
    if (!in_array($collection, household_sensitive_collections(), true)) {
        return;
    }

    if ($collection === "households") {
        // Creator owns the household row via userId already checked by caller.
        return;
    }

    $householdId = isset($entity["householdId"]) && is_string($entity["householdId"])
        ? $entity["householdId"]
        : "";
    if ($householdId === "") {
        throw new InvalidArgumentException("householdId is required for {$collection}");
    }

    // Load household owner from payload store
    $st = $db->prepare(
        "SELECT payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = 'households' AND entity_id = ? AND deleted_at IS NULL LIMIT 1"
    );
    $st->execute([$authUserId, $householdId]);
    $row = $st->fetch();
    if (!$row) {
        // Household may be owned by another user — deny cross-user writes
        throw new InvalidArgumentException("Household not found for authenticated user");
    }

    // Resolve caller's membership role
    $mst = $db->prepare(
        "SELECT payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = 'householdMembers' AND deleted_at IS NULL"
    );
    $mst->execute([$authUserId]);
    $role = "owner"; // default if no member rows yet (bootstrap)
    $found = false;
    while ($m = $mst->fetch()) {
        $payload = decode_payload($m["payload"]);
        if (($payload["householdId"] ?? "") === $householdId) {
            $found = true;
            $role = (string)($payload["role"] ?? "viewer");
            break;
        }
    }

    if ($found && $role === "viewer") {
        throw new InvalidArgumentException("Viewer role cannot modify household settings");
    }

    if ($collection === "householdPermissions") {
        if ($found && !in_array($role, ["owner", "partner"], true)) {
            throw new InvalidArgumentException("Only owner or partner can change household permissions");
        }
    }
}
