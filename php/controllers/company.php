<?php
declare(strict_types=1);

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/utils.php";
require_once __DIR__ . "/../helpers/company/bootstrap.php";

function company_auth_user(): array {
    try {
        return require_cloud_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401, "UNAUTHORIZED");
        exit;
    }
}

function company_query_company_id(): string {
    $id = $_GET["companyId"] ?? $_GET["company_id"] ?? null;
    if (!is_string($id) || $id === "") {
        $body = json_input();
        $id = $body["companyId"] ?? $body["company_id"] ?? null;
    }
    if (!is_string($id) || $id === "") {
        json_error("companyId required", 400, "VALIDATION_ERROR");
        exit;
    }
    return $id;
}

function company_handle_exception(Throwable $e): void {
    if ($e instanceof CompanyPostingException) {
        json_error($e->getMessage(), $e->status, $e->errorCode);
        return;
    }
    if ($e instanceof InvalidArgumentException) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    error_log("[company] " . $e->getMessage());
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

function company_workspaces_list(): void {
    $auth = company_auth_user();
    $db = db_conn();
    $st = $db->prepare(
        "SELECT w.*, m.id AS membership_id, m.status AS membership_status
         FROM company_memberships m
         INNER JOIN company_workspaces w ON w.id = m.company_id
         WHERE m.user_id = ? AND m.status = 'ACTIVE' AND w.deleted_at IS NULL
         ORDER BY w.display_name ASC"
    );
    $st->execute([$auth["userId"]]);
    json_ok(["workspaces" => $st->fetchAll(PDO::FETCH_ASSOC)]);
}

function company_workspaces_create(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $displayName = trim((string)($body["displayName"] ?? $body["legalName"] ?? ""));
    $legalName = trim((string)($body["legalName"] ?? $displayName));
    if ($displayName === "") {
        json_error("displayName required", 422, "VALIDATION_ERROR");
        return;
    }
    $db = db_conn();
    $companyId = company_new_id();
    $db->beginTransaction();
    try {
        $db->prepare(
            "INSERT INTO company_workspaces (
                id, owner_user_id, legal_name, display_name, business_type, registration_type,
                gst_enabled, gstin, pan, currency, financial_year_start_month, books_start_date,
                timezone, phone, email, status, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'ACTIVE',UTC_TIMESTAMP(),UTC_TIMESTAMP())"
        )->execute([
            $companyId,
            $auth["userId"],
            $legalName,
            $displayName,
            $body["businessType"] ?? null,
            $body["registrationType"] ?? null,
            !empty($body["gstEnabled"]) ? 1 : 0,
            $body["gstin"] ?? null,
            $body["pan"] ?? null,
            $body["currency"] ?? "INR",
            (int)($body["financialYearStartMonth"] ?? 4),
            $body["booksStartDate"] ?? null,
            $body["timezone"] ?? "Asia/Kolkata",
            $body["phone"] ?? null,
            $body["email"] ?? null,
        ]);
        company_seed_workspace($db, $companyId, $auth["userId"]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        company_handle_exception($e);
        return;
    }
    $st = $db->prepare("SELECT * FROM company_workspaces WHERE id = ?");
    $st->execute([$companyId]);
    json_ok(["workspace" => $st->fetch(PDO::FETCH_ASSOC)], 201);
}

function company_workspaces_get(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    company_require_membership($db, $auth["userId"], $companyId);
    $st = $db->prepare("SELECT * FROM company_workspaces WHERE id = ? AND deleted_at IS NULL");
    $st->execute([$companyId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    // Workspace PK is `id` (the company id) — there is no company_id column.
    if ($row === null || (string)($row["id"] ?? "") !== $companyId) {
        json_error("Workspace not found", 404, "NOT_FOUND");
        return;
    }
    json_ok(["workspace" => $row, "permissions" => company_user_permissions($db, $auth["userId"], $companyId)]);
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

function company_memberships_list(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_users");
    $st = $db->prepare(
        "SELECT m.*, u.username, u.display_name,
                (SELECT r.code FROM company_membership_roles mr
                 INNER JOIN company_roles r ON r.id = mr.role_id AND r.company_id = mr.company_id
                 WHERE mr.membership_id = m.id AND mr.company_id = m.company_id
                 ORDER BY CASE r.code WHEN 'OWNER' THEN 0 WHEN 'SUPER_ADMIN' THEN 1 ELSE 2 END, r.code
                 LIMIT 1) AS role_code
         FROM company_memberships m
         LEFT JOIN users u ON u.id = m.user_id
         WHERE m.company_id = ?
         ORDER BY m.created_at ASC"
    );
    $st->execute([$companyId]);
    json_ok(["memberships" => $st->fetchAll(PDO::FETCH_ASSOC)]);
}

function company_memberships_invite(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $body = require_json_body();
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_users");
    $userId = (string)($body["userId"] ?? "");
    $roleCode = strtoupper((string)($body["roleCode"] ?? "VIEWER"));
    if ($userId === "") {
        json_error("userId required", 422);
        return;
    }
    $role = $db->prepare("SELECT id FROM company_roles WHERE company_id = ? AND code = ?");
    $role->execute([$companyId, $roleCode]);
    $roleRow = $role->fetch(PDO::FETCH_ASSOC);
    if (!$roleRow) {
        json_error("Role not found", 404);
        return;
    }
    $membershipId = company_new_id();
    // Membership insert is a user id plus a role. It does not store a bearer token.
    $db->prepare(
        "INSERT INTO company_memberships (id, company_id, user_id, status, joined_at, created_at, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE status = 'ACTIVE', updated_at = UTC_TIMESTAMP()"
    )->execute([$membershipId, $companyId, $userId]);
    $mst = $db->prepare("SELECT id FROM company_memberships WHERE company_id = ? AND user_id = ?");
    $mst->execute([$companyId, $userId]);
    $membershipId = (string)$mst->fetchColumn();
    $db->prepare(
        "INSERT IGNORE INTO company_membership_roles (id, company_id, membership_id, role_id, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
    )->execute([company_new_id(), $companyId, $membershipId, $roleRow["id"]]);
    company_audit_write($db, $companyId, $auth["userId"], "membership.invite", "membership", $membershipId, null, ["userId" => $userId, "role" => $roleCode]);
    json_ok(["membershipId" => $membershipId], 201);
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

function company_parties_list(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "view_party");
    $st = $db->prepare(
        "SELECT * FROM company_parties WHERE company_id = ? AND deleted_at IS NULL ORDER BY display_name ASC"
    );
    $st->execute([$companyId]);
    $parties = $st->fetchAll(PDO::FETCH_ASSOC);
    if ($parties === []) {
        json_ok(["parties" => []]);
        return;
    }

    $rolesByParty = [];
    $rst = $db->prepare(
        "SELECT party_id, role_code FROM company_party_roles WHERE company_id = ? ORDER BY role_code ASC"
    );
    $rst->execute([$companyId]);
    while ($row = $rst->fetch(PDO::FETCH_ASSOC)) {
        $pid = (string)$row["party_id"];
        $rolesByParty[$pid][] = (string)$row["role_code"];
    }

    $recvByParty = [];
    $payByParty = [];
    $bst = $db->prepare(
        "SELECT party_id, side, SUM(outstanding_paise) AS outstanding_paise
         FROM company_bill_refs
         WHERE company_id = ? AND status IN ('OPEN','PARTIAL') AND outstanding_paise > 0
         GROUP BY party_id, side"
    );
    $bst->execute([$companyId]);
    while ($row = $bst->fetch(PDO::FETCH_ASSOC)) {
        $pid = (string)$row["party_id"];
        $amt = (int)$row["outstanding_paise"];
        if (strtoupper((string)$row["side"]) === "PAYABLE") {
            $payByParty[$pid] = $amt;
        } else {
            $recvByParty[$pid] = $amt;
        }
    }

    $tagsByParty = [];
    $tagIdsByParty = [];
    $tst = $db->prepare(
        "SELECT m.party_id, m.tag_id, t.name
         FROM company_party_tag_memberships m
         INNER JOIN company_party_tags t ON t.id = m.tag_id AND t.company_id = m.company_id
         WHERE m.company_id = ?
         ORDER BY t.name ASC"
    );
    $tst->execute([$companyId]);
    while ($row = $tst->fetch(PDO::FETCH_ASSOC)) {
        $pid = (string)$row["party_id"];
        $tagsByParty[$pid][] = (string)$row["name"];
        $tagIdsByParty[$pid][] = (string)$row["tag_id"];
    }

    foreach ($parties as &$p) {
        $pid = (string)$p["id"];
        $p["roles"] = $rolesByParty[$pid] ?? [];
        $p["tags"] = $tagsByParty[$pid] ?? [];
        $p["tag_ids"] = $tagIdsByParty[$pid] ?? [];
        $recv = (int)($recvByParty[$pid] ?? 0);
        $pay = (int)($payByParty[$pid] ?? 0);
        // Opening only fills gaps when no open bills yet
        if ($recv === 0 && $pay === 0) {
            $open = (int)($p["opening_balance_paise"] ?? 0);
            $side = strtoupper((string)($p["opening_balance_side"] ?? ""));
            if ($open > 0 && $side === "DEBIT") {
                $recv = $open;
            } elseif ($open > 0 && $side === "CREDIT") {
                $pay = $open;
            }
        }
        $p["receivable_outstanding_paise"] = $recv;
        $p["payable_outstanding_paise"] = $pay;
        $p["net_balance_paise"] = $recv - $pay;
    }
    unset($p);

    json_ok(["parties" => $parties]);
}

function company_parties_create(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $body = require_json_body();
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_parties");
    $name = trim((string)($body["displayName"] ?? ""));
    if ($name === "") {
        json_error("displayName required", 422);
        return;
    }
    $mobile = trim((string)($body["mobile"] ?? ""));
    $gstin = trim((string)($body["gstin"] ?? ""));
    $pan = trim((string)($body["pan"] ?? ""));
    $forceCreate = !empty($body["forceCreate"]);

    if (!$forceCreate) {
        $sql = "SELECT id, display_name, mobile, gstin, pan
                FROM company_parties
                WHERE company_id = ? AND deleted_at IS NULL AND (
                    LOWER(display_name) = LOWER(?)";
        $params = [$companyId, $name];
        if ($mobile !== "") {
            $sql .= " OR mobile = ?";
            $params[] = $mobile;
        }
        if ($gstin !== "") {
            $sql .= " OR gstin = ?";
            $params[] = $gstin;
        }
        if ($pan !== "") {
            $sql .= " OR pan = ?";
            $params[] = $pan;
        }
        $sql .= ") LIMIT 20";
        $dupSt = $db->prepare($sql);
        $dupSt->execute($params);
        $duplicates = $dupSt->fetchAll(PDO::FETCH_ASSOC);
        if ($duplicates !== []) {
            http_response_code(409);
            header("Content-Type: application/json; charset=utf-8");
            echo json_encode([
                "ok" => false,
                "error" => "Possible duplicate party",
                "code" => "PARTY_DUPLICATE_WARNING",
                "duplicates" => $duplicates,
                "requestId" => (string)($_SERVER["REQUEST_ID"] ?? ""),
            ], JSON_UNESCAPED_SLASHES);
            return;
        }
    }

    $id = company_new_id();
    $db->prepare(
        "INSERT INTO company_parties (
            id, company_id, display_name, legal_name, party_type, mobile, email,
            village, city, district, state, area_id, gstin, pan, tax_treatment,
            opening_balance_paise, opening_balance_side, default_credit_days, credit_limit_paise,
            active, notes, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())"
    )->execute([
        $id, $companyId, $name, $body["legalName"] ?? null, company_normalize_party_type((string)($body["partyType"] ?? "PERSON")),
        $body["mobile"] ?? null, $body["email"] ?? null, $body["village"] ?? null,
        $body["city"] ?? null, $body["district"] ?? null, $body["state"] ?? null,
        $body["areaId"] ?? null, $body["gstin"] ?? null, $body["pan"] ?? null,
        $body["taxTreatment"] ?? null, (int)($body["openingBalancePaise"] ?? 0),
        $body["openingBalanceSide"] ?? null, $body["defaultCreditDays"] ?? null,
        $body["creditLimitPaise"] ?? null, isset($body["active"]) ? (int)(bool)$body["active"] : 1,
        $body["notes"] ?? null,
    ]);
    $roles = $body["roles"] ?? [];
    if (is_array($roles)) {
        $rins = $db->prepare(
            "INSERT INTO company_party_roles (id, company_id, party_id, role_code, created_at) VALUES (?,?,?,?,UTC_TIMESTAMP())"
        );
        foreach ($roles as $rc) {
            $rins->execute([company_new_id(), $companyId, $id, strtoupper((string)$rc)]);
        }
    }
    $savedTags = company_party_save_tags($db, $companyId, $id, $body["tags"] ?? []);
    company_audit_write($db, $companyId, $auth["userId"], "party.create", "party", $id, null, ["displayName" => $name]);
    $st = $db->prepare("SELECT * FROM company_parties WHERE id = ? AND company_id = ?");
    $st->execute([$id, $companyId]);
    $party = $st->fetch(PDO::FETCH_ASSOC);
    $rolesOut = $db->prepare("SELECT role_code FROM company_party_roles WHERE company_id = ? AND party_id = ?");
    $rolesOut->execute([$companyId, $id]);
    $party["roles"] = array_column($rolesOut->fetchAll(PDO::FETCH_ASSOC), "role_code");
    $party["tags"] = $savedTags;
    $party["receivable_outstanding_paise"] = 0;
    $party["payable_outstanding_paise"] = 0;
    $party["net_balance_paise"] = 0;
    $open = (int)($party["opening_balance_paise"] ?? 0);
    $side = strtoupper((string)($party["opening_balance_side"] ?? ""));
    if ($open > 0 && $side === "DEBIT") {
        $party["receivable_outstanding_paise"] = $open;
        $party["net_balance_paise"] = $open;
    } elseif ($open > 0 && $side === "CREDIT") {
        $party["payable_outstanding_paise"] = $open;
        $party["net_balance_paise"] = -$open;
    }
    json_ok(["party" => $party], 201);
}

function company_parties_get(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $partyId = (string)($_GET["id"] ?? $_GET["partyId"] ?? "");
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "view_party");
    $st = $db->prepare("SELECT * FROM company_parties WHERE id = ? AND company_id = ? AND deleted_at IS NULL");
    $st->execute([$partyId, $companyId]);
    $party = company_assert_same_company($st->fetch(PDO::FETCH_ASSOC) ?: null, $companyId, "Party");
    $roles = $db->prepare("SELECT role_code FROM company_party_roles WHERE company_id = ? AND party_id = ?");
    $roles->execute([$companyId, $partyId]);
    $party["roles"] = array_column($roles->fetchAll(PDO::FETCH_ASSOC), "role_code");
    json_ok(["party" => $party]);
}

function company_parties_update(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $body = require_json_body();
    $partyId = (string)($body["id"] ?? $_GET["id"] ?? "");
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_parties");
    $st = $db->prepare("SELECT * FROM company_parties WHERE id = ? AND company_id = ? AND deleted_at IS NULL");
    $st->execute([$partyId, $companyId]);
    $before = company_assert_same_company($st->fetch(PDO::FETCH_ASSOC) ?: null, $companyId, "Party");
    $db->prepare(
        "UPDATE company_parties SET
            display_name = COALESCE(?, display_name),
            legal_name = COALESCE(?, legal_name),
            party_type = COALESCE(?, party_type),
            mobile = COALESCE(?, mobile),
            email = COALESCE(?, email),
            notes = COALESCE(?, notes),
            active = COALESCE(?, active),
            updated_at = UTC_TIMESTAMP()
         WHERE id = ? AND company_id = ?"
    )->execute([
        $body["displayName"] ?? null,
        $body["legalName"] ?? null,
        array_key_exists("partyType", $body) ? company_normalize_party_type((string)$body["partyType"]) : null,
        $body["mobile"] ?? null,
        $body["email"] ?? null,
        $body["notes"] ?? null,
        isset($body["active"]) ? (int)(bool)$body["active"] : null,
        $partyId,
        $companyId,
    ]);
    if (isset($body["roles"]) && is_array($body["roles"])) {
        $db->prepare("DELETE FROM company_party_roles WHERE company_id = ? AND party_id = ?")->execute([$companyId, $partyId]);
        $rins = $db->prepare(
            "INSERT INTO company_party_roles (id, company_id, party_id, role_code, created_at) VALUES (?,?,?,?,UTC_TIMESTAMP())"
        );
        foreach ($body["roles"] as $rc) {
            $rins->execute([company_new_id(), $companyId, $partyId, strtoupper((string)$rc)]);
        }
    }
    $st->execute([$partyId, $companyId]);
    $after = $st->fetch(PDO::FETCH_ASSOC);
    $rolesOut = $db->prepare("SELECT role_code FROM company_party_roles WHERE company_id = ? AND party_id = ?");
    $rolesOut->execute([$companyId, $partyId]);
    $after["roles"] = array_column($rolesOut->fetchAll(PDO::FETCH_ASSOC), "role_code");
    company_audit_write($db, $companyId, $auth["userId"], "party.update", "party", $partyId, $before, $after);
    json_ok(["party" => $after]);
}

function company_parties_delete(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $partyId = (string)($_GET["id"] ?? "");
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_parties");
    $db->prepare("UPDATE company_parties SET deleted_at = UTC_TIMESTAMP(), active = 0 WHERE id = ? AND company_id = ?")
        ->execute([$partyId, $companyId]);
    company_audit_write($db, $companyId, $auth["userId"], "party.delete", "party", $partyId, null, ["deleted" => true]);
    json_ok(["deleted" => true]);
}

function company_party_categories_upsert(): void {
    // Backward-compatible create (+ optional party attach) used by party-item.php POST.
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $body = require_json_body();
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_parties");
    $created = company_party_category_create($db, $companyId, $auth["userId"], $body);
    json_ok(["categoryId" => $created["id"], "category" => $created], 201);
}

/**
 * Full party-category CRUD + memberships (list / create / rename / delete / assign / unassign).
 */
function company_party_categories_dispatch(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    $action = strtolower((string)($_GET["action"] ?? ""));

    if ($method === "GET") {
        company_require_permission($db, $auth["userId"], $companyId, "view_dashboard");
        $categoryId = (string)($_GET["id"] ?? $_GET["categoryId"] ?? "");
        if ($categoryId !== "") {
            $cat = company_party_category_fetch($db, $companyId, $categoryId);
            if (!$cat) {
                json_error("Category not found", 404);
                return;
            }
            $members = company_party_category_members($db, $companyId, $categoryId);
            json_ok(["category" => $cat, "members" => $members]);
            return;
        }
        json_ok(["categories" => company_party_categories_list($db, $companyId)]);
        return;
    }

    $body = require_json_body();
    if ($action === "" && isset($body["action"])) {
        $action = strtolower((string)$body["action"]);
    }

    company_require_permission($db, $auth["userId"], $companyId, "manage_parties");

    if ($method === "POST" && ($action === "" || $action === "create")) {
        $created = company_party_category_create($db, $companyId, $auth["userId"], $body);
        json_ok(["categoryId" => $created["id"], "category" => $created], 201);
        return;
    }

    if ($method === "POST" && $action === "assign") {
        $categoryId = (string)($body["categoryId"] ?? $body["id"] ?? "");
        $partyId = (string)($body["partyId"] ?? "");
        if ($categoryId === "" || $partyId === "") {
            json_error("categoryId and partyId required", 422);
            return;
        }
        if (!company_party_category_fetch($db, $companyId, $categoryId)) {
            json_error("Category not found", 404);
            return;
        }
        $db->prepare(
            "INSERT IGNORE INTO company_party_category_memberships (id, company_id, party_id, category_id, created_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
        )->execute([company_new_id(), $companyId, $partyId, $categoryId]);
        company_audit_write($db, $companyId, $auth["userId"], "party_category.assign", "party_category", $categoryId, null, [
            "partyId" => $partyId,
        ]);
        json_ok(["assigned" => true, "categoryId" => $categoryId, "partyId" => $partyId]);
        return;
    }

    if ($method === "POST" && ($action === "unassign" || $action === "remove")) {
        $categoryId = (string)($body["categoryId"] ?? $body["id"] ?? "");
        $partyId = (string)($body["partyId"] ?? "");
        if ($categoryId === "" || $partyId === "") {
            json_error("categoryId and partyId required", 422);
            return;
        }
        $db->prepare(
            "DELETE FROM company_party_category_memberships
             WHERE company_id = ? AND category_id = ? AND party_id = ?"
        )->execute([$companyId, $categoryId, $partyId]);
        company_audit_write($db, $companyId, $auth["userId"], "party_category.unassign", "party_category", $categoryId, null, [
            "partyId" => $partyId,
        ]);
        json_ok(["unassigned" => true, "categoryId" => $categoryId, "partyId" => $partyId]);
        return;
    }

    if ($method === "PATCH" || $method === "PUT" || ($method === "POST" && $action === "rename")) {
        $categoryId = (string)($body["id"] ?? $body["categoryId"] ?? $_GET["id"] ?? "");
        $name = trim((string)($body["name"] ?? ""));
        if ($categoryId === "" || $name === "") {
            json_error("id and name required", 422);
            return;
        }
        if (!company_party_category_fetch($db, $companyId, $categoryId)) {
            json_error("Category not found", 404);
            return;
        }
        try {
            $db->prepare(
                "UPDATE company_party_categories SET name = ?, updated_at = UTC_TIMESTAMP()
                 WHERE id = ? AND company_id = ? AND deleted_at IS NULL"
            )->execute([$name, $categoryId, $companyId]);
        } catch (Throwable $e) {
            json_error("Could not rename category (name may already exist)", 409);
            return;
        }
        company_audit_write($db, $companyId, $auth["userId"], "party_category.rename", "party_category", $categoryId, null, [
            "name" => $name,
        ]);
        json_ok(["category" => company_party_category_fetch($db, $companyId, $categoryId)]);
        return;
    }

    if ($method === "DELETE" || ($method === "POST" && $action === "delete")) {
        $categoryId = (string)($_GET["id"] ?? $body["id"] ?? $body["categoryId"] ?? "");
        if ($categoryId === "") {
            json_error("id required", 422);
            return;
        }
        if (!company_party_category_fetch($db, $companyId, $categoryId)) {
            json_error("Category not found", 404);
            return;
        }
        $cntSt = $db->prepare(
            "SELECT COUNT(*) FROM company_party_category_memberships WHERE company_id = ? AND category_id = ?"
        );
        $cntSt->execute([$companyId, $categoryId]);
        $memberCount = (int)$cntSt->fetchColumn();
        if ($memberCount > 0) {
            json_error(
                "Cannot delete category while it has {$memberCount} member(s). Remove parties first.",
                409
            );
            return;
        }
        $db->prepare(
            "UPDATE company_party_categories SET deleted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND company_id = ?"
        )->execute([$categoryId, $companyId]);
        company_audit_write($db, $companyId, $auth["userId"], "party_category.delete", "party_category", $categoryId, null, [
            "deleted" => true,
        ]);
        json_ok(["deleted" => true]);
        return;
    }

    json_error("Method not allowed", 405);
}

function company_party_categories_list(PDO $db, string $companyId): array {
    $st = $db->prepare(
        "SELECT c.id, c.company_id, c.name, c.created_at, c.updated_at,
                COALESCE(m.member_count, 0) AS member_count
         FROM company_party_categories c
         LEFT JOIN (
           SELECT category_id, COUNT(*) AS member_count
           FROM company_party_category_memberships
           WHERE company_id = ?
           GROUP BY category_id
         ) m ON m.category_id = c.id
         WHERE c.company_id = ? AND c.deleted_at IS NULL
         ORDER BY c.name ASC"
    );
    $st->execute([$companyId, $companyId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    return array_map(static function (array $row): array {
        return [
            "id" => (string)$row["id"],
            "companyId" => (string)$row["company_id"],
            "name" => (string)$row["name"],
            "memberCount" => (int)$row["member_count"],
            "createdAt" => (string)($row["created_at"] ?? ""),
            "updatedAt" => (string)($row["updated_at"] ?? ""),
        ];
    }, $rows);
}

function company_party_category_fetch(PDO $db, string $companyId, string $categoryId): ?array {
    $st = $db->prepare(
        "SELECT c.id, c.company_id, c.name, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM company_party_category_memberships m
                 WHERE m.company_id = c.company_id AND m.category_id = c.id) AS member_count
         FROM company_party_categories c
         WHERE c.id = ? AND c.company_id = ? AND c.deleted_at IS NULL
         LIMIT 1"
    );
    $st->execute([$categoryId, $companyId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    return [
        "id" => (string)$row["id"],
        "companyId" => (string)$row["company_id"],
        "name" => (string)$row["name"],
        "memberCount" => (int)$row["member_count"],
        "createdAt" => (string)($row["created_at"] ?? ""),
        "updatedAt" => (string)($row["updated_at"] ?? ""),
    ];
}

function company_party_category_members(PDO $db, string $companyId, string $categoryId): array {
    $st = $db->prepare(
        "SELECT p.id, p.display_name, p.mobile, p.active
         FROM company_party_category_memberships m
         INNER JOIN company_parties p ON p.id = m.party_id AND p.company_id = m.company_id
         WHERE m.company_id = ? AND m.category_id = ? AND p.deleted_at IS NULL
         ORDER BY p.display_name ASC"
    );
    $st->execute([$companyId, $categoryId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    return array_map(static function (array $row): array {
        return [
            "id" => (string)$row["id"],
            "displayName" => (string)$row["display_name"],
            "mobile" => $row["mobile"] !== null ? (string)$row["mobile"] : null,
            "active" => (bool)(int)$row["active"],
        ];
    }, $rows);
}

function company_party_category_create(PDO $db, string $companyId, string $userId, array $body): array {
    $name = trim((string)($body["name"] ?? ""));
    if ($name === "") {
        json_error("name required", 422);
        exit;
    }
    $id = company_new_id();
    try {
        $db->prepare(
            "INSERT INTO company_party_categories (id, company_id, name, created_at, updated_at)
             VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
        )->execute([$id, $companyId, $name]);
    } catch (Throwable $e) {
        json_error("Category name already exists", 409);
        exit;
    }
    if (!empty($body["partyId"])) {
        $db->prepare(
            "INSERT IGNORE INTO company_party_category_memberships (id, company_id, party_id, category_id, created_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
        )->execute([company_new_id(), $companyId, (string)$body["partyId"], $id]);
    }
    company_audit_write($db, $companyId, $userId, "party_category.create", "party_category", $id, null, [
        "name" => $name,
    ]);
    $created = company_party_category_fetch($db, $companyId, $id);
    return $created ?? ["id" => $id, "companyId" => $companyId, "name" => $name, "memberCount" => 0];
}

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

function company_dimensions_dispatch(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    $kind = (string)($_GET["kind"] ?? $_GET["type"] ?? "business-units");
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";

    $tableMap = [
        "business-units" => "company_business_units",
        "branches" => "company_branches",
        "areas" => "company_areas",
        "projects" => "company_projects",
        "cost-centres" => "company_cost_centres",
    ];
    if (!isset($tableMap[$kind])) {
        json_error("Unknown dimension kind", 400);
        return;
    }
    $table = $tableMap[$kind];

    if ($method === "GET") {
        company_require_permission($db, $auth["userId"], $companyId, "view_dashboard");
        $st = $db->prepare("SELECT * FROM {$table} WHERE company_id = ? AND deleted_at IS NULL ORDER BY name ASC");
        $st->execute([$companyId]);
        json_ok(["items" => $st->fetchAll(PDO::FETCH_ASSOC), "kind" => $kind]);
        return;
    }

    company_require_permission($db, $auth["userId"], $companyId, "manage_dimensions");
    $body = require_json_body();
    if ($method === "POST") {
        $id = company_new_id();
        $name = trim((string)($body["name"] ?? ""));
        if ($name === "") {
            json_error("name required", 422);
            return;
        }
        if ($kind === "areas") {
            $db->prepare(
                "INSERT INTO company_areas (id, company_id, parent_id, name, code, active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
            )->execute([$id, $companyId, $body["parentId"] ?? null, $name, $body["code"] ?? null]);
        } elseif ($kind === "projects") {
            $db->prepare(
                "INSERT INTO company_projects (id, company_id, name, code, business_unit_id, area_id, active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
            )->execute([$id, $companyId, $name, $body["code"] ?? null, $body["businessUnitId"] ?? null, $body["areaId"] ?? null]);
        } elseif ($kind === "branches") {
            company_ensure_branch_url_column($db);
            try {
                $url = company_normalize_branch_url($body["url"] ?? null);
            } catch (InvalidArgumentException $e) {
                json_error($e->getMessage(), 422);
                return;
            }
            $db->prepare(
                "INSERT INTO company_branches (id, company_id, name, code, url, active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
            )->execute([$id, $companyId, $name, $body["code"] ?? null, $url]);
        } else {
            $db->prepare(
                "INSERT INTO {$table} (id, company_id, name, code, active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
            )->execute([$id, $companyId, $name, $body["code"] ?? null]);
        }
        json_ok(["id" => $id, "kind" => $kind], 201);
        return;
    }
    if ($method === "DELETE") {
        $id = (string)($_GET["id"] ?? $body["id"] ?? "");
        $db->prepare("UPDATE {$table} SET deleted_at = UTC_TIMESTAMP(), active = 0 WHERE id = ? AND company_id = ?")
            ->execute([$id, $companyId]);
        json_ok(["deleted" => true]);
        return;
    }
    if ($method === "PATCH") {
        $id = trim((string)($body["id"] ?? ""));
        $name = trim((string)($body["name"] ?? ""));
        if ($id === "" || $name === "") {
            json_error("id and name are required", 422);
            return;
        }
        if ($kind === "branches") {
            company_ensure_branch_url_column($db);
            try {
                $url = array_key_exists("url", $body) ? company_normalize_branch_url($body["url"]) : null;
            } catch (InvalidArgumentException $e) {
                json_error($e->getMessage(), 422);
                return;
            }
            if (array_key_exists("url", $body)) {
                $db->prepare(
                    "UPDATE company_branches SET name = ?, url = ?, updated_at = UTC_TIMESTAMP()
                     WHERE id = ? AND company_id = ? AND deleted_at IS NULL"
                )->execute([$name, $url, $id, $companyId]);
            } else {
                $db->prepare(
                    "UPDATE company_branches SET name = ?, updated_at = UTC_TIMESTAMP()
                     WHERE id = ? AND company_id = ? AND deleted_at IS NULL"
                )->execute([$name, $id, $companyId]);
            }
        } else {
            $db->prepare(
                "UPDATE {$table} SET name = ?, updated_at = UTC_TIMESTAMP()
                 WHERE id = ? AND company_id = ? AND deleted_at IS NULL"
            )->execute([$name, $id, $companyId]);
        }
        json_ok(["id" => $id, "kind" => $kind, "name" => $name]);
        return;
    }
    json_error("Method not allowed", 405);
}

// ---------------------------------------------------------------------------
// Ledgers
// ---------------------------------------------------------------------------

function company_ledgers_list(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "view_ledgers");
    $groups = $db->prepare(
        "SELECT * FROM company_account_groups WHERE company_id = ? AND deleted_at IS NULL ORDER BY nature, code"
    );
    $groups->execute([$companyId]);
    $ledgers = $db->prepare(
        "SELECT * FROM company_ledgers WHERE company_id = ? AND deleted_at IS NULL ORDER BY code"
    );
    $ledgers->execute([$companyId]);
    json_ok([
        "groups" => $groups->fetchAll(PDO::FETCH_ASSOC),
        "ledgers" => $ledgers->fetchAll(PDO::FETCH_ASSOC),
    ]);
}

// ---------------------------------------------------------------------------
// Vouchers
// ---------------------------------------------------------------------------

function company_vouchers_list(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "view_day_book");
    $from = (string)($_GET["from"] ?? date("Y-m-01"));
    $to = (string)($_GET["to"] ?? date("Y-m-d"));
    $limit = (int)($_GET["limit"] ?? 100);
    if ($limit < 1) {
        $limit = 100;
    }
    if ($limit > 500) {
        $limit = 500;
    }
    $filters = [
        "partyId" => $_GET["partyId"] ?? null,
        "voucherType" => $_GET["voucherType"] ?? null,
        "search" => $_GET["search"] ?? null,
        "limit" => $limit,
    ];
    json_ok(["vouchers" => company_day_book($db, $companyId, $from, $to, array_filter($filters, static fn($v) => $v !== null && $v !== ""))]);
}

function company_vouchers_get(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $voucherId = (string)($_GET["id"] ?? $_GET["voucherId"] ?? "");
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "view_day_book");
    $voucher = company_load_voucher_with_lines($db, $companyId, $voucherId);
    company_assert_same_company($voucher, $companyId, "Voucher");
    json_ok(["voucher" => $voucher]);
}

function company_vouchers_post(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    try {
        $result = company_post_voucher($db, $companyId, $auth["userId"], $body);
        json_ok(["voucher" => $result], 201);
    } catch (Throwable $e) {
        company_handle_exception($e);
    }
}

function company_vouchers_preview(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    try {
        $purpose = (string)($body["purpose"] ?? "");
        $voucherType = isset($body["voucherType"]) ? (string)$body["voucherType"] : null;
        company_can_preview_voucher($db, $auth["userId"], $companyId, $purpose, $voucherType);

        $amountPaise = (int)($body["amountPaise"] ?? 0);
        $partyId = isset($body["partyId"]) && $body["partyId"] !== "" && $body["partyId"] !== null
            ? (string)$body["partyId"] : null;
        $cashBankLedgerId = (string)($body["cashBankLedgerId"] ?? "");
        $counterLedgerId = isset($body["counterLedgerId"]) && $body["counterLedgerId"] !== "" && $body["counterLedgerId"] !== null
            ? (string)$body["counterLedgerId"] : null;

        $lines = company_preview_purpose(
            $db,
            $companyId,
            $purpose,
            $amountPaise,
            $partyId,
            $cashBankLedgerId,
            $counterLedgerId
        );
        $previewContext = company_preview_hash_context(
            $purpose,
            $amountPaise,
            $partyId,
            $cashBankLedgerId,
            $counterLedgerId
        );
        $enriched = company_enrich_preview_lines($db, $companyId, $lines, $previewContext);
        json_ok([
            "lines" => $enriched["lines"],
            "impacts" => $enriched["impacts"],
            "previewHash" => $enriched["previewHash"],
            "previewToken" => $enriched["previewToken"],
        ]);
    } catch (Throwable $e) {
        company_handle_exception($e);
    }
}

function company_vouchers_reverse(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    company_require_sensitive_pin($auth, $body);
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    try {
        $result = company_reverse_voucher(
            $db,
            $companyId,
            $auth["userId"],
            (string)($body["voucherId"] ?? $body["id"] ?? ""),
            (string)($body["mutationId"] ?? ""),
            (string)($body["reason"] ?? "")
        );
        json_ok(["voucher" => $result]);
    } catch (Throwable $e) {
        company_handle_exception($e);
    }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function company_reports_dispatch(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    $report = (string)($_GET["report"] ?? $_GET["key"] ?? "trial-balance");
    $asOf = (string)($_GET["asOf"] ?? date("Y-m-d"));
    $from = (string)($_GET["from"] ?? date("Y-m-01"));
    $to = (string)($_GET["to"] ?? date("Y-m-d"));

    // A lock held by another session must become an error response. This is the
    // wait for a lock, not a cap on a query that is already running.
    $previousLockWait = (int)$db->query("SELECT @@SESSION.innodb_lock_wait_timeout")->fetchColumn();
    $db->exec("SET SESSION innodb_lock_wait_timeout = 8");
    try {
        try {
            [$permission] = company_report_resolve($report);
            company_require_permission($db, $auth["userId"], $companyId, $permission);

            $opts = [
                "asOf" => $asOf,
                "from" => $from,
                "to" => $to,
                "partyId" => $_GET["partyId"] ?? null,
                "ledgerId" => $_GET["ledgerId"] ?? null,
                "voucherType" => $_GET["voucherType"] ?? null,
                "search" => $_GET["search"] ?? null,
                "side" => $_GET["side"] ?? null,
            ];
            $data = company_report_run($db, $companyId, $report, $opts);
            json_ok(["report" => $report, "data" => $data]);
        } catch (Throwable $e) {
            company_handle_exception($e);
        }
    } finally {
        $db->exec("SET SESSION innodb_lock_wait_timeout = " . $previousLockWait);
    }
}

// ---------------------------------------------------------------------------
// Period locks
// ---------------------------------------------------------------------------

function company_period_locks_dispatch(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";

    if ($method === "GET") {
        // Lock list: view_dashboard (not bare membership). Create → lock_period; reopen → reopen_period + PIN.
        company_require_permission($db, $auth["userId"], $companyId, "view_dashboard");
        $st = $db->prepare(
            "SELECT * FROM company_period_locks WHERE company_id = ? ORDER BY created_at DESC"
        );
        $st->execute([$companyId]);
        json_ok(["locks" => $st->fetchAll(PDO::FETCH_ASSOC)]);
        return;
    }

    $body = require_json_body();
    if (($body["action"] ?? "lock") === "reopen") {
        company_require_permission($db, $auth["userId"], $companyId, "reopen_period");
        company_require_sensitive_pin($auth, $body);
        $lockId = (string)($body["lockId"] ?? "");
        $db->prepare(
            "UPDATE company_period_locks SET released_at = UTC_TIMESTAMP(), released_by = ? WHERE id = ? AND company_id = ?"
        )->execute([$auth["userId"], $lockId, $companyId]);
        company_audit_write($db, $companyId, $auth["userId"], "period.reopen", "period_lock", $lockId, null, ["reason" => $body["reason"] ?? null], $body["reason"] ?? null);
        json_ok(["reopened" => true]);
        return;
    }

    company_require_permission($db, $auth["userId"], $companyId, "lock_period");
    $lockBefore = (string)($body["lockBeforeDate"] ?? "");
    if ($lockBefore === "") {
        json_error("lockBeforeDate required", 422);
        return;
    }
    $id = company_new_id();
    $db->prepare(
        "INSERT INTO company_period_locks (id, company_id, lock_before_date, reason, locked_by, created_at)
         VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())"
    )->execute([$id, $companyId, $lockBefore, $body["reason"] ?? null, $auth["userId"]]);
    company_audit_write($db, $companyId, $auth["userId"], "period.lock", "period_lock", $id, null, ["lockBeforeDate" => $lockBefore]);
    json_ok(["lockId" => $id], 201);
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

function company_approvals_dispatch(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";

    if ($method === "GET") {
        company_require_permission($db, $auth["userId"], $companyId, "approve_voucher");
        $st = $db->prepare(
            "SELECT a.*, v.voucher_number, v.voucher_type, v.voucher_date, v.purpose, v.narration,
                    v.party_id, p.display_name AS party_name
             FROM company_approvals a
             INNER JOIN company_vouchers v ON v.id = a.voucher_id AND v.company_id = a.company_id
             LEFT JOIN company_parties p ON p.id = v.party_id AND p.company_id = v.company_id
             WHERE a.company_id = ? AND a.status = 'PENDING'
             ORDER BY a.created_at ASC"
        );
        $st->execute([$companyId]);
        $approvals = $st->fetchAll(PDO::FETCH_ASSOC);
        $lineSt = $db->prepare(
            "SELECT l.side, l.amount_paise, lg.name AS ledger_name, lg.code AS ledger_code, lg.is_cash_bank
             FROM company_voucher_lines l
             INNER JOIN company_ledgers lg ON lg.id = l.ledger_id AND lg.company_id = l.company_id
             WHERE l.company_id = ? AND l.voucher_id = ?
             ORDER BY l.line_no ASC"
        );
        $billSt = $db->prepare(
            "SELECT br.ref_number, br.due_date, br.outstanding_paise, br.side, br.status
             FROM company_bill_allocations ba
             INNER JOIN company_bill_refs br ON br.id = ba.bill_ref_id AND br.company_id = ba.company_id
             WHERE ba.company_id = ? AND ba.voucher_id = ?
             ORDER BY br.due_date ASC
             LIMIT 5"
        );
        foreach ($approvals as &$row) {
            $voucherId = (string)$row["voucher_id"];
            $lineSt->execute([$companyId, $voucherId]);
            $lines = $lineSt->fetchAll(PDO::FETCH_ASSOC);
            $amountPaise = 0;
            $cashImpactPaise = 0;
            $debitLedgers = [];
            $creditLedgers = [];
            foreach ($lines as $line) {
                $amt = (int)$line["amount_paise"];
                if ($line["side"] === "DEBIT") {
                    $amountPaise += $amt;
                    $debitLedgers[] = (string)$line["ledger_name"];
                    if ((int)$line["is_cash_bank"] === 1) {
                        $cashImpactPaise -= $amt; // debit cash/bank = money out
                    }
                } else {
                    $creditLedgers[] = (string)$line["ledger_name"];
                    if ((int)$line["is_cash_bank"] === 1) {
                        $cashImpactPaise += $amt; // credit cash/bank = money in
                    }
                }
            }
            $row["amount_paise"] = $amountPaise;
            $row["debit_ledgers"] = $debitLedgers;
            $row["credit_ledgers"] = $creditLedgers;
            $row["cash_impact_paise"] = $cashImpactPaise;
            $billSt->execute([$companyId, $voucherId]);
            $bills = $billSt->fetchAll(PDO::FETCH_ASSOC);
            $row["linked_bills"] = $bills;
            $today = date("Y-m-d");
            $ageingLabel = null;
            if ($bills) {
                $due = (string)($bills[0]["due_date"] ?? "");
                if ($due !== "") {
                    $days = (int)floor((strtotime($today) - strtotime($due)) / 86400);
                    if ($days > 0) {
                        $ageingLabel = $days . " days overdue";
                    } elseif ($days === 0) {
                        $ageingLabel = "Due today";
                    } else {
                        $ageingLabel = "Due in " . abs($days) . " days";
                    }
                }
            }
            $row["bill_ageing"] = $ageingLabel;
        }
        unset($row);
        json_ok(["approvals" => $approvals]);
        return;
    }

    company_require_permission($db, $auth["userId"], $companyId, "approve_voucher");
    $body = require_json_body();
    $approvalId = (string)($body["approvalId"] ?? "");
    $decision = strtoupper((string)($body["decision"] ?? "APPROVE"));
    $st = $db->prepare("SELECT * FROM company_approvals WHERE id = ? AND company_id = ?");
    $st->execute([$approvalId, $companyId]);
    $approval = company_assert_same_company($st->fetch(PDO::FETCH_ASSOC) ?: null, $companyId, "Approval");

    if ($decision === "REJECT") {
        $db->prepare(
            "UPDATE company_approvals SET status = 'REJECTED', decided_by = ?, comment = ?, decided_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND company_id = ?"
        )->execute([$auth["userId"], $body["comment"] ?? null, $approvalId, $companyId]);
        $db->prepare(
            "UPDATE company_vouchers SET status = 'REJECTED', updated_at = UTC_TIMESTAMP() WHERE id = ? AND company_id = ?"
        )->execute([$approval["voucher_id"], $companyId]);
        json_ok(["status" => "REJECTED"]);
        return;
    }

    try {
        $voucher = company_approve_voucher_tx(
            $db,
            $companyId,
            $auth["userId"],
            $approvalId,
            isset($body["comment"]) ? (string)$body["comment"] : null
        );
        json_ok(["status" => "APPROVED", "voucher" => $voucher]);
    } catch (Throwable $e) {
        company_handle_exception($e);
    }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

function company_exports_dispatch(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "export_reports");

    $method = strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET"));
    $body = [];
    if ($method === "POST") {
        $body = require_json_body();
        company_require_sensitive_pin($auth, $body);
    } else {
        company_require_sensitive_pin($auth, ["pin" => (string)($_GET["pin"] ?? "")]);
    }

    $format = strtolower((string)($body["format"] ?? $_GET["format"] ?? "csv"));
    $report = (string)($body["report"] ?? $_GET["report"] ?? "day-book");
    $from = (string)($body["from"] ?? $_GET["from"] ?? date("Y-m-01"));
    $to = (string)($body["to"] ?? $_GET["to"] ?? date("Y-m-d"));
    $asOf = (string)($body["asOf"] ?? $_GET["asOf"] ?? $to);
    $downloadFlag = $body["download"] ?? $_GET["download"] ?? "1";
    $download = ((string)$downloadFlag) !== "0" && $downloadFlag !== false;

    // Backup pack uses export_backup; report exports also need the report's view_* key from registry.
    if (in_array(strtolower($report), ["backup", "restore-preview"], true) || strtolower($format) === "backup") {
        company_require_permission($db, $auth["userId"], $companyId, "export_backup");
    } else {
        // Validates enabled + known via registry; then view_* from registry permission field.
        company_report_resolve($report);
        company_require_report_view_permission($db, $auth["userId"], $companyId, $report);
    }

    if (strtolower($report) === "restore-preview") {
        if (!is_array($body["pack"] ?? null)) {
            throw new CompanyPostingException("pack is required", 422, "VALIDATION_ERROR");
        }
        try {
            $preview = company_restore_preview($body["pack"], (string)($body["newCompanyId"] ?? ""));
        } catch (InvalidArgumentException $e) {
            throw new CompanyPostingException($e->getMessage(), 422, "RESTORE_PREVIEW");
        }
        json_ok(["restorePreview" => $preview]);
        return;
    }

    $filters = ["companyId" => $companyId, "from" => $from, "to" => $to, "asOf" => $asOf, "report" => $report];
    $headers = [];
    $rows = [];

    try {
        if (strtolower($report) === "backup" || strtolower($format) === "backup") {
            $pack = company_backup_pack($db, $companyId);
            $headers = ["payload"];
            $rows = [["payload" => json_encode($pack, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)]];
            $format = "json";
            $report = "company-backup";
        } elseif (strtolower($report) !== "backup" && strtolower($format) !== "backup") {
            $data = company_report_run($db, $companyId, $report, [
                "asOf" => $asOf,
                "from" => $from,
                "to" => $to,
                "partyId" => $body["partyId"] ?? $_GET["partyId"] ?? null,
                "ledgerId" => $body["ledgerId"] ?? $_GET["ledgerId"] ?? null,
                "side" => $body["side"] ?? $_GET["side"] ?? null,
            ]);
            $resolvedKey = strtolower($report);
            $entry = company_report_entry($resolvedKey);
            $handler = (string)($entry["handler"] ?? ($entry["aliasOf"] ? (company_report_entry((string)$entry["aliasOf"])["handler"] ?? "") : ""));
            if ($handler === "trial_balance" && is_array($data)) {
                $headers = ["ledgerCode", "ledgerName", "nature", "debitPaise", "creditPaise", "closingDebitPaise", "closingCreditPaise"];
                $rows = $data;
            } elseif ($handler === "day_book" && is_array($data)) {
                $headers = ["voucherDate", "voucherNumber", "voucherType", "narration", "debitTotalPaise", "creditTotalPaise"];
                $rows = $data;
            } elseif ($handler === "profit_loss" && is_array($data)) {
                $headers = ["section", "ledgerCode", "ledgerName", "amountPaise"];
                foreach (($data["income"] ?? []) as $r) {
                    $rows[] = ["section" => "INCOME", "ledgerCode" => $r["ledgerCode"], "ledgerName" => $r["ledgerName"], "amountPaise" => $r["amountPaise"]];
                }
                foreach (($data["expense"] ?? []) as $r) {
                    $rows[] = ["section" => "EXPENSE", "ledgerCode" => $r["ledgerCode"], "ledgerName" => $r["ledgerName"], "amountPaise" => $r["amountPaise"]];
                }
                $rows[] = ["section" => "NET", "ledgerCode" => "", "ledgerName" => "Net Profit", "amountPaise" => $data["netProfitPaise"] ?? 0];
            } else {
                $headers = ["payload"];
                $rows = [["payload" => json_encode($data)]];
            }
        }

        $export = company_export_build($format, $report, $headers, $rows, $filters);
        if ($download && in_array($format, ["csv", "xlsx", "pdf", "docx"], true)) {
            company_export_send($export);
            return;
        }
        json_ok([
            "format" => $export["format"],
            "filename" => $export["filename"],
            "contentType" => $export["contentType"],
            "package" => $export["package"] ?? null,
            "rowCount" => count($rows),
            "bodyBase64" => base64_encode($export["body"]),
            "csvPreview" => company_export_rows_csv($headers, array_slice($rows, 0, 50)),
        ]);
    } catch (Throwable $e) {
        company_handle_exception($e);
    }
}

function company_bill_allocate(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    try {
        $result = company_allocate_on_account_to_bill(
            $db,
            $companyId,
            $auth["userId"],
            (string)($body["partyId"] ?? ""),
            (string)($body["billRefId"] ?? ""),
            (int)($body["amountPaise"] ?? 0),
            (string)($body["mutationId"] ?? "")
        );
        json_ok(["voucher" => $result], 201);
    } catch (Throwable $e) {
        company_handle_exception($e);
    }
}
