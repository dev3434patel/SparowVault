<?php
declare(strict_types=1);

if ((getenv("DB_NAME") ?: "") !== "sparowvault_verify_test") {
    fwrite(STDERR, "Refusing seed: DB_NAME must be sparowvault_verify_test\n");
    exit(2);
}

require_once __DIR__ . "/../../../php/config/env.php";
require_once __DIR__ . "/../../../php/config/db.php";
require_once __DIR__ . "/../../../php/helpers/auth.php";

$db = db_conn();
$pin = "258013";
$salt = create_pin_salt();
$hash = hash_secret($pin . ":" . $salt);
$users = [
    ["sv-verify-alice", "aliceverify", "Alice Verify"],
    ["sv-verify-bob", "bobverify", "Bob Verify"],
];
$st = $db->prepare(
    "INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'user', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)"
);
foreach ($users as [$id, $username, $name]) {
    $st->execute([$id, $username, $name, $hash, $salt]);
}
echo "seeded synthetic users\n";
