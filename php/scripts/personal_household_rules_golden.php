<?php
declare(strict_types=1);

require_once __DIR__ . "/../helpers/personal_household.php";

function golden_assert(bool $ok, string $message): void {
    if (!$ok) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok {$message}\n";
}

$invite = [
    "inviter_user_id" => "alice",
    "role" => "viewer",
    "expires_at" => "2026-10-10 00:00:00",
    "used_at" => null,
    "revoked_at" => null,
];
$now = "2026-10-03 00:00:00";
golden_assert(personal_household_accept_decision($invite, "bob", $now)["ok"] === true, "bob accepts a live viewer invite");
golden_assert(personal_household_accept_decision($invite, "alice", $now)["code"] === "SELF_ACCEPT", "alice cannot accept her own invite");
golden_assert(personal_household_accept_decision(null, "bob", $now)["code"] === "NOT_FOUND", "missing invite is not found");
$used = $invite;
$used["used_at"] = "2026-10-03 00:00:01";
golden_assert(personal_household_accept_decision($used, "bob", $now)["code"] === "TOKEN_USED", "used invite cannot be replayed");
$expired = $invite;
$expired["expires_at"] = "2026-10-01 00:00:00";
golden_assert(personal_household_accept_decision($expired, "bob", $now)["code"] === "EXPIRED", "expired invite is refused");
$revoked = $invite;
$revoked["revoked_at"] = "2026-10-02 00:00:00";
golden_assert(personal_household_accept_decision($revoked, "bob", $now)["code"] === "REVOKED", "revoked invite is refused");
$ownerRole = $invite;
$ownerRole["role"] = "owner";
golden_assert(personal_household_accept_decision($ownerRole, "bob", $now)["code"] === "ROLE", "owner role cannot be accepted from an invite");

$grant = [
    "revoked_at" => null,
    "role" => "viewer",
    "revision" => 2,
    "resource_scope" => [["collection" => "transactions", "entityId" => "tx-shared"]],
];
golden_assert(personal_household_write_decision($grant, "transactions", "tx-shared", 2)["code"] === "VIEWER_DENIED", "viewer cannot write a shared row");
$partner = $grant;
$partner["role"] = "partner";
golden_assert(personal_household_write_decision($partner, "transactions", "tx-shared", 2)["ok"] === true, "partner can write the shared row");
golden_assert(personal_household_write_decision($partner, "transactions", "tx-private", 2)["code"] === "OUT_OF_SCOPE", "private row stays out of scope");
golden_assert(personal_household_write_decision($partner, "transactions", "tx-shared", 1)["code"] === "STALE_GRANT", "queued revision is rechecked");
$gone = $partner;
$gone["revoked_at"] = "2026-10-03 00:00:00";
golden_assert(personal_household_write_decision($gone, "transactions", "tx-shared", 2)["code"] === "REVOKED", "revoked grant blocks a queued write");
golden_assert(personal_household_last_owner_decision(1, "viewer")["code"] === "LAST_OWNER", "last owner cannot be removed");
golden_assert(personal_household_last_owner_decision(2, "viewer")["ok"] === true, "another owner can be demoted");

echo "personal household grant rules passed\n";
