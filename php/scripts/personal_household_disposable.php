<?php
/**
 * Cross-login household grant check on sparowvault_test only.
 * Refuses any other database before connect.
 */
if (PHP_SAPI !== "cli") {
    fwrite(STDERR, "cli only\n");
    exit(2);
}

require_once __DIR__ . "/../helpers/app.php";
$decision = destructive_database_target_decision();
$name = configured_database_name();
if ($decision["outcome"] !== "allowed" || $name !== "sparowvault_test") {
    fwrite(STDERR, "Refusing household disposable check before connect.\n");
    exit(2);
}

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/cloud_write.php";
require_once __DIR__ . "/../helpers/personal_household.php";

$db = db_conn();
$current = (string)$db->query("SELECT DATABASE()")->fetchColumn();
if ($current !== "sparowvault_test") {
    fwrite(STDERR, "Connected database is not sparowvault_test.\n");
    exit(2);
}

$sql = file_get_contents(dirname(__DIR__, 2) . "/sql/migrations/20261003_personal_household_grants.sql");
if ($sql === false) {
    fwrite(STDERR, "migration missing\n");
    exit(1);
}
$db->exec($sql);

$alice = "svrel_alice";
$bob = "svrel_bob";
$now = gmdate("Y-m-d H:i:s");
$insertUser = $db->prepare(
    "INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, must_change_pin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'user', 1, 0, ?, ?)
     ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)"
);
$insertUser->execute([$alice, "svrelalice", "Alice", str_repeat("a", 60), str_repeat("b", 32), $now, $now]);
$insertUser->execute([$bob, "svrelbob", "Bob", str_repeat("c", 60), str_repeat("d", 32), $now, $now]);

$row = $db->prepare(
    "INSERT INTO cloud_collection_rows (id, user_id, collection_name, entity_id, payload, updated_at, schema_version)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = VALUES(updated_at), deleted_at = NULL"
);
$household = json_encode(["id" => "svrel_house", "userId" => $alice, "name" => "Synthetic", "isDeleted" => 0], JSON_THROW_ON_ERROR);
$shared = json_encode(["id" => "svrel_tx_shared", "userId" => $alice, "type" => "expense", "amountPaise" => 45000, "isDeleted" => 0], JSON_THROW_ON_ERROR);
$private = json_encode(["id" => "svrel_tx_private", "userId" => $alice, "type" => "income", "amountPaise" => 500000, "isDeleted" => 0], JSON_THROW_ON_ERROR);
$row->execute(["svrel_row_house", $alice, "households", "svrel_house", $household, $now]);
$row->execute(["svrel_row_shared", $alice, "transactions", "svrel_tx_shared", $shared, $now]);
$row->execute(["svrel_row_private", $alice, "transactions", "svrel_tx_private", $private, $now]);

$beforeBob = (int)$db->query("SELECT COUNT(*) FROM cloud_collection_rows WHERE user_id = " . $db->quote($bob))->fetchColumn();

ob_start();
personal_household_issue($db, $alice, [
    "householdId" => "svrel_house",
    "role" => "viewer",
    "resourceScope" => [["collection" => "transactions", "entityId" => "svrel_tx_shared"]],
    "expiresInDays" => 7,
]);
$issued = json_decode((string)ob_get_clean(), true);
$token = $issued["data"]["token"] ?? "";
if ($token === "" || ($issued["data"]["copiedBooks"] ?? true) !== false) {
    fwrite(STDERR, "issue did not return a one-time token\n");
    exit(1);
}

ob_start();
personal_household_accept($db, $bob, ["token" => $token, "userId" => $alice]);
$accepted = json_decode((string)ob_get_clean(), true);
if (($accepted["data"]["role"] ?? "") !== "viewer" || ($accepted["data"]["copiedBooks"] ?? true) !== false) {
    fwrite(STDERR, "accept did not keep the viewer role\n");
    exit(1);
}

$afterBob = (int)$db->query("SELECT COUNT(*) FROM cloud_collection_rows WHERE user_id = " . $db->quote($bob))->fetchColumn();
if ($afterBob !== $beforeBob) {
    fwrite(STDERR, "accept copied cloud rows\n");
    exit(1);
}

ob_start();
try {
    personal_household_accept($db, $bob, ["token" => $token]);
    ob_end_clean();
    fwrite(STDERR, "replay was accepted\n");
    exit(1);
} catch (PersonalHouseholdException $error) {
    ob_end_clean();
    if ($error->errorCode !== "TOKEN_USED") {
        fwrite(STDERR, "replay code " . $error->errorCode . "\n");
        exit(1);
    }
}

ob_start();
personal_household_list($db, $bob);
$listed = json_decode((string)ob_get_clean(), true);
$resources = $listed["data"]["asGrantee"][0]["resources"] ?? [];
$ids = array_map(static fn($item) => $item["entityId"] ?? "", $resources);
if (!in_array("svrel_tx_shared", $ids, true) || in_array("svrel_tx_private", $ids, true)) {
    fwrite(STDERR, "projection did not isolate the private row\n");
    exit(1);
}

$grantId = (string)($listed["data"]["asGrantee"][0]["grantId"] ?? "");
$revision = (int)($listed["data"]["asGrantee"][0]["revision"] ?? 0);
ob_start();
personal_household_write($db, $bob, [
    "grantId" => $grantId,
    "collection" => "transactions",
    "entityId" => "svrel_tx_shared",
    "expectedRevision" => $revision,
    "mutationId" => "svrel_write_1",
    "patch" => ["notes" => "viewer tried"],
]);
$viewerWrite = json_decode((string)ob_get_clean(), true);
if (($viewerWrite["code"] ?? "") !== "VIEWER_DENIED") {
    fwrite(STDERR, "viewer write was not denied\n");
    exit(1);
}

ob_start();
personal_household_revoke($db, $alice, ["grantId" => $grantId]);
ob_end_clean();

ob_start();
personal_household_write($db, $bob, [
    "grantId" => $grantId,
    "collection" => "transactions",
    "entityId" => "svrel_tx_shared",
    "expectedRevision" => 1,
    "mutationId" => "svrel_write_2",
    "patch" => ["notes" => "after revoke"],
]);
$revokedWrite = json_decode((string)ob_get_clean(), true);
$revokedCode = (string)($revokedWrite["code"] ?? "");
if ($revokedCode !== "REVOKED" && $revokedCode !== "STALE_GRANT") {
    fwrite(STDERR, "revoke replay code " . $revokedCode . "\n");
    exit(1);
}

echo "household-disposable-pass bobRows={$beforeBob} sharedOnly=1\n";
