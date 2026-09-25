<?php
declare(strict_types=1);
/** Ensure cert user is ACTIVE OWNER on every Scale Co they belong to; prefer a 10k company. */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";
require_once __DIR__ . "/../../php/helpers/company/bootstrap.php";

$db = db_conn();
$username = getenv("COMPANY_E2E_USER") ?: "cert_211549";
$user = $db->prepare("SELECT id FROM users WHERE username = ? AND deleted_at IS NULL LIMIT 1");
$user->execute([$username]);
$userId = (string)($user->fetchColumn() ?: "");
if ($userId === "") {
    fwrite(STDERR, "user not found: $username\n");
    exit(1);
}

// Fix OWNER role on any existing Scale Co memberships
$existing = $db->prepare(
    "SELECT m.id AS mid, m.company_id, w.display_name
     FROM company_memberships m
     INNER JOIN company_workspaces w ON w.id = m.company_id
     WHERE m.user_id = ? AND w.display_name LIKE 'Scale Co %'"
);
$existing->execute([$userId]);
while ($r = $existing->fetch(PDO::FETCH_ASSOC)) {
    $roleId = (string)($db->query(
        "SELECT id FROM company_roles WHERE company_id=" . $db->quote($r["company_id"]) .
        " AND code='OWNER' LIMIT 1"
    )->fetchColumn() ?: "");
    if ($roleId === "") {
        continue;
    }
    $has = $db->prepare(
        "SELECT id FROM company_membership_roles WHERE company_id = ? AND membership_id = ? AND role_id = ? LIMIT 1"
    );
    $has->execute([$r["company_id"], $r["mid"], $roleId]);
    if (!$has->fetchColumn()) {
        $db->prepare(
            "INSERT INTO company_membership_roles (id, company_id, membership_id, role_id, created_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
        )->execute([company_new_id(), $r["company_id"], $r["mid"], $roleId]);
        echo "role_fixed {$r["display_name"]}\n";
    }
}

// Prefer a formal 10k Scale Co
$row = $db->query(
    "SELECT w.id, COUNT(v.id) AS c
     FROM company_workspaces w
     INNER JOIN company_vouchers v ON v.company_id = w.id AND v.deleted_at IS NULL
     WHERE w.display_name LIKE 'Scale Co %'
     GROUP BY w.id
     HAVING c >= 10000 AND c <= 11000
     ORDER BY w.created_at DESC
     LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    $row = $db->query(
        "SELECT w.id, COUNT(v.id) AS c
         FROM company_workspaces w
         INNER JOIN company_vouchers v ON v.company_id = w.id AND v.deleted_at IS NULL
         WHERE w.display_name LIKE 'Scale Co %'
         GROUP BY w.id
         ORDER BY c DESC
         LIMIT 1"
    )->fetch(PDO::FETCH_ASSOC);
}
if (!$row) {
    fwrite(STDERR, "no Scale Co\n");
    exit(1);
}
$companyId = (string)$row["id"];

$mem = $db->prepare(
    "SELECT id FROM company_memberships WHERE company_id = ? AND user_id = ? LIMIT 1"
);
$mem->execute([$companyId, $userId]);
$memId = (string)($mem->fetchColumn() ?: "");
if ($memId === "") {
    $memId = company_new_id();
    $db->prepare(
        "INSERT INTO company_memberships (id, company_id, user_id, status, joined_at, created_at, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$memId, $companyId, $userId]);
    echo "membership_created company=$companyId user=$username vouchers={$row['c']}\n";
} else {
    $db->prepare("UPDATE company_memberships SET status='ACTIVE', updated_at=UTC_TIMESTAMP() WHERE id=?")
        ->execute([$memId]);
    echo "membership_ok company=$companyId user=$username vouchers={$row['c']}\n";
}

$roleId = (string)($db->query(
    "SELECT id FROM company_roles WHERE company_id=" . $db->quote($companyId) .
    " AND code='OWNER' LIMIT 1"
)->fetchColumn() ?: "");
if ($roleId === "") {
    fwrite(STDERR, "OWNER role missing for $companyId\n");
    exit(1);
}

$hasRole = $db->prepare(
    "SELECT id FROM company_membership_roles WHERE company_id = ? AND membership_id = ? AND role_id = ? LIMIT 1"
);
$hasRole->execute([$companyId, $memId, $roleId]);
if (!$hasRole->fetchColumn()) {
    $db->prepare(
        "INSERT INTO company_membership_roles (id, company_id, membership_id, role_id, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
    )->execute([company_new_id(), $companyId, $memId, $roleId]);
    echo "role_attached OWNER\n";
} else {
    echo "role_ok OWNER\n";
}

$perms = (int)$db->query(
    "SELECT COUNT(DISTINCT rp.permission_key)
     FROM company_memberships m
     INNER JOIN company_membership_roles mr ON mr.membership_id = m.id AND mr.company_id = m.company_id
     INNER JOIN company_role_permissions rp ON rp.role_id = mr.role_id AND rp.company_id = m.company_id
     WHERE m.company_id=" . $db->quote($companyId) . " AND m.user_id=" . $db->quote($userId)
)->fetchColumn();
echo "permissions=$perms\n";
if ($perms < 1) {
    fwrite(STDERR, "no permissions after role attach\n");
    exit(1);
}

echo "COMPANY_PERF_COMPANY_ID=$companyId\n";
