<?php
declare(strict_types=1);

require_once __DIR__ . "/phase_sv_pure.php";

/** Local file cap. Larger uploads keep metadata only. Real object hosting is BLOCKED_EXTERNAL. */
const COMPANY_DOCUMENT_LOCAL_MAX_BYTES = 262144;

function company_document_storage_root(): string {
    return dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . "storage" . DIRECTORY_SEPARATOR . "company-documents";
}

function company_workspaces_update_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_company");
    $displayName = trim((string)($body["displayName"] ?? $body["display_name"] ?? ""));
    if ($displayName === "" || strlen($displayName) > 255) {
        throw new CompanyPostingException("displayName is required", 422, "VALIDATION_ERROR");
    }
    $gstin = null;
    $touchGstin = array_key_exists("gstin", $body);
    if ($touchGstin && $body["gstin"] !== null && trim((string)$body["gstin"]) !== "") {
        $gstin = strtoupper(trim((string)$body["gstin"]));
        if (!preg_match('/^[0-9A-Z]{15}$/', $gstin)) {
            throw new CompanyPostingException("GSTIN must be 15 letters or digits", 422, "VALIDATION_ERROR");
        }
    }
    $beforeSt = $db->prepare(
        "SELECT id, display_name, gstin, financial_year_start_month, books_start_date
         FROM company_workspaces WHERE id = ? AND deleted_at IS NULL"
    );
    $beforeSt->execute([$companyId]);
    $before = $beforeSt->fetch(PDO::FETCH_ASSOC);
    if (!$before) {
        throw new CompanyPostingException("Workspace not found", 404, "NOT_FOUND");
    }
    $fyMonth = (int)$before["financial_year_start_month"];
    if (array_key_exists("financialYearStartMonth", $body)) {
        $fyMonth = (int)$body["financialYearStartMonth"];
        if ($fyMonth < 1 || $fyMonth > 12) {
            throw new CompanyPostingException("Financial year start month must be 1 to 12", 422, "VALIDATION_ERROR");
        }
    }
    $booksStart = $before["books_start_date"] !== null ? (string)$before["books_start_date"] : null;
    if (array_key_exists("booksStartDate", $body)) {
        $rawBooks = trim((string)$body["booksStartDate"]);
        if ($rawBooks === "") {
            $booksStart = null;
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $rawBooks)) {
            throw new CompanyPostingException("Books start must be YYYY-MM-DD", 422, "VALIDATION_ERROR");
        } else {
            $booksStart = $rawBooks;
        }
    }
    $periodChanged = $fyMonth !== (int)$before["financial_year_start_month"]
        || (string)($booksStart ?? "") !== (string)($before["books_start_date"] ?? "");
    if ($periodChanged) {
        $countSt = $db->prepare(
            "SELECT COUNT(*) FROM company_vouchers WHERE company_id = ? AND status = 'POSTED' AND deleted_at IS NULL"
        );
        $countSt->execute([$companyId]);
        $impact = company_books_change_impact((int)$countSt->fetchColumn(), true, !empty($body["acknowledgeImpact"]));
        if (!$impact["allowed"]) {
            throw new CompanyPostingException(
                "Posted vouchers already use this financial year. Confirm the change. Posted vouchers are not rewritten.",
                409,
                "BOOKS_IMPACT"
            );
        }
    }
    if ($touchGstin) {
        $db->prepare(
            "UPDATE company_workspaces
             SET display_name = ?, gstin = ?, financial_year_start_month = ?, books_start_date = ?, updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND deleted_at IS NULL"
        )->execute([$displayName, $gstin, $fyMonth, $booksStart, $companyId]);
    } else {
        $db->prepare(
            "UPDATE company_workspaces
             SET display_name = ?, financial_year_start_month = ?, books_start_date = ?, updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND deleted_at IS NULL"
        )->execute([$displayName, $fyMonth, $booksStart, $companyId]);
    }
    $beforeSt->execute([$companyId]);
    $after = $beforeSt->fetch(PDO::FETCH_ASSOC);
    company_audit_write($db, $companyId, $auth["userId"], "workspace.profile", "company_workspace", $companyId, $before, $after);
    json_ok(["workspace" => $after]);
}

function company_memberships_set_role_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_users");
    $membershipId = (string)($body["membershipId"] ?? "");
    $roleCode = strtoupper(trim((string)($body["roleCode"] ?? "")));
    if ($membershipId === "" || $roleCode === "") {
        throw new CompanyPostingException("membershipId and roleCode are required", 422, "VALIDATION_ERROR");
    }
    $roleSt = $db->prepare("SELECT id FROM company_roles WHERE company_id = ? AND code = ?");
    $roleSt->execute([$companyId, $roleCode]);
    $role = $roleSt->fetch(PDO::FETCH_ASSOC);
    if (!$role) {
        throw new CompanyPostingException("Role not found", 404, "NOT_FOUND");
    }
    $db->beginTransaction();
    try {
        $ownerSt = $db->prepare(
            "SELECT m.id
             FROM company_memberships m
             INNER JOIN company_membership_roles mr ON mr.membership_id = m.id AND mr.company_id = m.company_id
             INNER JOIN company_roles r ON r.id = mr.role_id AND r.company_id = m.company_id
             WHERE m.company_id = ? AND m.status = 'ACTIVE' AND r.code = 'OWNER'
             FOR UPDATE"
        );
        $ownerSt->execute([$companyId]);
        $owners = [];
        while ($row = $ownerSt->fetch(PDO::FETCH_ASSOC)) {
            $owners[] = ["id" => (string)$row["id"], "roles" => ["OWNER"]];
        }
        $memSt = $db->prepare("SELECT id FROM company_memberships WHERE id = ? AND company_id = ? FOR UPDATE");
        $memSt->execute([$membershipId, $companyId]);
        if (!$memSt->fetch()) {
            throw new CompanyPostingException("Membership not found", 404, "NOT_FOUND");
        }
        if (company_owner_count_after_role_change($owners, $membershipId, $roleCode) < 1) {
            throw new CompanyPostingException("The company must keep one owner", 409, "LAST_OWNER");
        }
        $db->prepare("DELETE FROM company_membership_roles WHERE company_id = ? AND membership_id = ?")
            ->execute([$companyId, $membershipId]);
        $db->prepare(
            "INSERT INTO company_membership_roles (id, company_id, membership_id, role_id, created_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
        )->execute([company_new_id(), $companyId, $membershipId, $role["id"]]);
        company_audit_write($db, $companyId, $auth["userId"], "membership.role", "membership", $membershipId, null, ["role" => $roleCode]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
    json_ok(["membershipId" => $membershipId, "roleCode" => $roleCode]);
}

function company_invite_tokens_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $action = strtolower((string)($body["action"] ?? "issue"));
    $db = db_conn();
    if ($action === "redeem") {
        company_invite_token_redeem($db, $auth["userId"], (string)($body["token"] ?? ""));
        return;
    }
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    company_require_permission($db, $auth["userId"], $companyId, "manage_users");
    $roleCode = strtoupper(trim((string)($body["roleCode"] ?? "VIEWER")));
    if (in_array($roleCode, ["OWNER", "SUPER_ADMIN"], true)) {
        throw new CompanyPostingException("This invite cannot assign that role", 422, "VALIDATION_ERROR");
    }
    $roleSt = $db->prepare("SELECT id FROM company_roles WHERE company_id = ? AND code = ?");
    $roleSt->execute([$companyId, $roleCode]);
    if (!$roleSt->fetch()) {
        throw new CompanyPostingException("Role not found", 404, "NOT_FOUND");
    }
    $token = bin2hex(random_bytes(32));
    $id = company_new_id();
    $db->prepare(
        "INSERT INTO company_invite_tokens (id, company_id, token_hash, role_code, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())"
    )->execute([$id, $companyId, company_invite_token_hash($token), $roleCode, $auth["userId"]]);
    company_audit_write($db, $companyId, $auth["userId"], "membership.invite_token", "invite_token", $id, null, ["role" => $roleCode]);
    json_ok(["inviteId" => $id, "token" => $token, "roleCode" => $roleCode], 201);
}

function company_invite_token_redeem(PDO $db, string $userId, string $token): void {
    $token = trim($token);
    if ($token === "") {
        throw new CompanyPostingException("token required", 422, "VALIDATION_ERROR");
    }
    $hash = company_invite_token_hash($token);
    $db->beginTransaction();
    try {
        $st = $db->prepare("SELECT * FROM company_invite_tokens WHERE token_hash = ? FOR UPDATE");
        $st->execute([$hash]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new CompanyPostingException("Invite token not found", 404, "NOT_FOUND");
        }
        $decision = company_invite_token_consume(
            ["token_hash" => (string)$row["token_hash"], "used_at" => $row["used_at"]],
            $token
        );
        if (!$decision["ok"]) {
            $code = (string)$decision["error"];
            throw new CompanyPostingException(
                $code === "TOKEN_USED" ? "Invite token already used" : "Invite token not found",
                $code === "TOKEN_USED" ? 409 : 404,
                $code
            );
        }
        $companyId = (string)$row["company_id"];
        $roleCode = (string)$row["role_code"];
        $role = $db->prepare("SELECT id FROM company_roles WHERE company_id = ? AND code = ?");
        $role->execute([$companyId, $roleCode]);
        $roleRow = $role->fetch(PDO::FETCH_ASSOC);
        if (!$roleRow) {
            throw new CompanyPostingException("Role not found", 404, "NOT_FOUND");
        }
        $membershipId = company_new_id();
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
        $used = $db->prepare(
            "UPDATE company_invite_tokens SET used_at = UTC_TIMESTAMP(), used_by = ? WHERE id = ? AND used_at IS NULL"
        );
        $used->execute([$userId, $row["id"]]);
        if ($used->rowCount() !== 1) {
            throw new CompanyPostingException("Invite token already used", 409, "TOKEN_USED");
        }
        company_audit_write($db, $companyId, $userId, "membership.invite_redeem", "membership", $membershipId, null, ["role" => $roleCode]);
        $db->commit();
        json_ok(["membershipId" => $membershipId, "companyId" => $companyId]);
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

function company_ledgers_mutate_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_ledgers");
    $action = strtolower((string)($body["action"] ?? "create"));
    if ($action === "create") {
        $name = trim((string)($body["name"] ?? ""));
        $code = strtoupper(trim((string)($body["code"] ?? "")));
        $groupId = (string)($body["groupId"] ?? "");
        if ($name === "" || !preg_match('/^[A-Z0-9_]{2,64}$/', $code) || $groupId === "") {
            throw new CompanyPostingException("name, code, and groupId are required", 422, "VALIDATION_ERROR");
        }
        $group = $db->prepare("SELECT id FROM company_account_groups WHERE id = ? AND company_id = ? AND deleted_at IS NULL");
        $group->execute([$groupId, $companyId]);
        if (!$group->fetch()) {
            throw new CompanyPostingException("Account group not found", 404, "NOT_FOUND");
        }
        $id = company_new_id();
        $db->prepare(
            "INSERT INTO company_ledgers (id, company_id, group_id, name, code, is_cash_bank, is_party_control, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
        )->execute([$id, $companyId, $groupId, $name, $code, !empty($body["isCashBank"]) ? 1 : 0]);
        company_audit_write($db, $companyId, $auth["userId"], "ledger.create", "ledger", $id, null, ["code" => $code, "name" => $name]);
        json_ok(["id" => $id, "code" => $code, "openingPosted" => false], 201);
        return;
    }
    $ledgerId = (string)($body["ledgerId"] ?? $body["id"] ?? "");
    $st = $db->prepare("SELECT * FROM company_ledgers WHERE id = ? AND company_id = ? AND deleted_at IS NULL");
    $st->execute([$ledgerId, $companyId]);
    $ledger = $st->fetch(PDO::FETCH_ASSOC);
    if (!$ledger) {
        throw new CompanyPostingException("Ledger not found", 404, "NOT_FOUND");
    }
    if ($action === "rename") {
        $name = trim((string)($body["name"] ?? ""));
        if ($name === "" || strlen($name) > 191) {
            throw new CompanyPostingException("name is required", 422, "VALIDATION_ERROR");
        }
        $db->prepare("UPDATE company_ledgers SET name = ?, updated_at = UTC_TIMESTAMP() WHERE id = ? AND company_id = ?")
            ->execute([$name, $ledgerId, $companyId]);
        company_audit_write($db, $companyId, $auth["userId"], "ledger.rename", "ledger", $ledgerId, ["name" => $ledger["name"]], ["name" => $name]);
        json_ok(["id" => $ledgerId, "name" => $name, "openingPosted" => false]);
        return;
    }
    if ($action === "archive") {
        if ((string)$ledger["code"] === "CAPITAL_LEDGER") {
            throw new CompanyPostingException("Capital stays available for balanced opening vouchers", 422, "VALIDATION_ERROR");
        }
        $lines = $db->prepare("SELECT COUNT(*) FROM company_voucher_lines WHERE company_id = ? AND ledger_id = ?");
        $lines->execute([$companyId, $ledgerId]);
        if ((int)$lines->fetchColumn() > 0) {
            throw new CompanyPostingException("Archive is blocked while the ledger has voucher lines", 422, "LEDGER_IN_USE");
        }
        $db->prepare(
            "UPDATE company_ledgers SET active = 0, deleted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ? AND company_id = ?"
        )->execute([$ledgerId, $companyId]);
        company_audit_write($db, $companyId, $auth["userId"], "ledger.archive", "ledger", $ledgerId, null, ["archived" => true, "openingPosted" => false]);
        json_ok(["id" => $ledgerId, "archived" => true, "openingPosted" => false]);
        return;
    }
    throw new CompanyPostingException("Unknown ledger action", 422, "VALIDATION_ERROR");
}

function company_documents_dispatch(): void {
    $auth = company_auth_user();
    $method = strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET"));
    $db = db_conn();
    if ($method === "GET") {
        $companyId = company_query_company_id();
        company_require_membership($db, $auth["userId"], $companyId);
        $docId = (string)($_GET["id"] ?? "");
        if ($docId === "") {
            throw new CompanyPostingException("id required", 422, "VALIDATION_ERROR");
        }
        $st = $db->prepare(
            "SELECT * FROM company_documents WHERE id = ? AND company_id = ? AND deleted_at IS NULL"
        );
        $st->execute([$docId, $companyId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        $path = $row ? company_document_absolute_path((string)$row["storage_key"]) : null;
        $status = company_document_download_status(true, $row !== false, $path !== null && is_file($path));
        if ($status === 404) {
            throw new CompanyPostingException("Document file is missing", 404, "NOT_FOUND");
        }
        header("Content-Type: " . ((string)($row["mime_type"] ?? "") !== "" ? (string)$row["mime_type"] : "application/octet-stream"));
        header("Content-Disposition: attachment; filename=\"" . str_replace("\"", "", (string)$row["file_name"]) . "\"");
        header("X-Content-Type-Options: nosniff");
        readfile($path);
        return;
    }
    if ($method !== "POST") {
        json_error("Method not allowed", 405);
        return;
    }
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    company_require_permission($db, $auth["userId"], $companyId, "manage_company");
    $fileName = trim((string)($body["fileName"] ?? ""));
    if ($fileName === "" || str_contains($fileName, "/") || str_contains($fileName, "\\")) {
        throw new CompanyPostingException("fileName required", 422, "VALIDATION_ERROR");
    }
    $bytes = "";
    if (!empty($body["contentBase64"])) {
        $decoded = base64_decode((string)$body["contentBase64"], true);
        if ($decoded === false) {
            throw new CompanyPostingException("contentBase64 is invalid", 422, "VALIDATION_ERROR");
        }
        $bytes = $decoded;
    }
    $size = strlen($bytes);
    $hosting = company_document_hosting_status($size === 0 ? 0 : $size);
    $id = company_new_id();
    $relative = company_document_relative_key($companyId, $id);
    $wroteFile = false;
    if ($bytes !== "" && $hosting === "local") {
        $absolute = company_document_absolute_path($relative);
        $dir = dirname($absolute);
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
            throw new CompanyPostingException("Document storage is unavailable", 500, "STORAGE_UNAVAILABLE");
        }
        if (file_put_contents($absolute, $bytes) === false) {
            throw new CompanyPostingException("Document storage is unavailable", 500, "STORAGE_UNAVAILABLE");
        }
        $wroteFile = true;
    }
    $db->prepare(
        "INSERT INTO company_documents (id, company_id, entity_type, entity_id, file_name, mime_type, storage_key, size_bytes, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())"
    )->execute([
        $id,
        $companyId,
        $body["entityType"] ?? null,
        $body["entityId"] ?? null,
        $fileName,
        $body["mimeType"] ?? "application/octet-stream",
        $relative,
        $size,
        $auth["userId"],
    ]);
    json_ok([
        "id" => $id,
        "storageKey" => $relative,
        "fileWritten" => $wroteFile,
        "hosting" => $wroteFile ? "local" : "BLOCKED_EXTERNAL",
    ], 201);
}

function company_document_absolute_path(string $relativeKey): ?string {
    if (!company_document_key_outside_public_web($relativeKey)) {
        return null;
    }
    $root = company_document_storage_root();
    $suffix = substr($relativeKey, strlen("storage/company-documents/"));
    $path = $root . DIRECTORY_SEPARATOR . str_replace(["/", "\\"], DIRECTORY_SEPARATOR, $suffix);
    $rootReal = realpath($root);
    if ($rootReal === false) {
        return $path;
    }
    $parent = realpath(dirname($path));
    if ($parent !== false && !str_starts_with($parent, $rootReal)) {
        return null;
    }
    return $path;
}

function company_invoice_draft_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    $action = strtolower((string)($body["action"] ?? "draft"));
    if ($action === "post") {
        company_promote_draft_voucher($db, $companyId, $auth["userId"], (string)($body["voucherId"] ?? ""));
        return;
    }
    $kind = strtolower((string)($body["kind"] ?? "sale"));
    $effect = company_invoice_then_settlement(
        $kind,
        (int)($body["basePaise"] ?? $body["invoicePaise"] ?? 0),
        (int)($body["taxPaise"] ?? 0),
        0
    );
    $receivableLedger = (string)($body["balanceLedgerId"] ?? "");
    $nominalLedger = (string)($body["nominalLedgerId"] ?? "");
    $taxLedger = (string)($body["taxLedgerId"] ?? "");
    if ($receivableLedger === "" || $nominalLedger === "") {
        throw new CompanyPostingException("balanceLedgerId and nominalLedgerId are required", 422, "VALIDATION_ERROR");
    }
    if ((int)$effect["receivableOrPayable"] <= 0) {
        throw new CompanyPostingException("Invoice amount must be positive", 422, "VALIDATION_ERROR");
    }
    $lines = [];
    if ($kind === "sale") {
        $lines[] = ["ledgerId" => $receivableLedger, "side" => "DEBIT", "amountPaise" => (int)$effect["receivableOrPayable"]];
        $lines[] = ["ledgerId" => $nominalLedger, "side" => "CREDIT", "amountPaise" => (int)$effect["revenue"]];
    } else {
        $lines[] = ["ledgerId" => $nominalLedger, "side" => "DEBIT", "amountPaise" => (int)$effect["expense"]];
        $lines[] = ["ledgerId" => $receivableLedger, "side" => "CREDIT", "amountPaise" => (int)$effect["receivableOrPayable"]];
    }
    if ((int)($body["taxPaise"] ?? 0) > 0) {
        if ($taxLedger === "") {
            throw new CompanyPostingException("taxLedgerId is required when tax is present", 422, "VALIDATION_ERROR");
        }
        if ($kind === "sale") {
            $lines[] = ["ledgerId" => $taxLedger, "side" => "CREDIT", "amountPaise" => (int)$body["taxPaise"]];
        } else {
            $lines[0]["amountPaise"] = (int)$effect["expense"];
            $lines[] = ["ledgerId" => $taxLedger, "side" => "DEBIT", "amountPaise" => (int)$body["taxPaise"]];
            $lines[1]["amountPaise"] = (int)$effect["receivableOrPayable"];
        }
    }
    $posted = company_post_voucher($db, $companyId, $auth["userId"], [
        "mutationId" => (string)($body["mutationId"] ?? ""),
        "voucherType" => $kind === "sale" ? "SALE" : "PURCHASE",
        "voucherDate" => (string)($body["voucherDate"] ?? ""),
        "partyId" => $body["partyId"] ?? null,
        "narration" => (string)($body["narration"] ?? "Invoice draft"),
        "status" => "DRAFT",
        "lines" => $lines,
    ]);
    json_ok([
        "voucher" => $posted,
        "effect" => $effect,
        "receiptIsSeparateVoucher" => true,
        "hypotheticalTax" => true,
    ], 201);
}

function company_promote_draft_voucher(PDO $db, string $companyId, string $userId, string $voucherId): void {
    if (!company_user_has_permission($db, $userId, $companyId, "post_voucher")) {
        throw new CompanyPostingException("Missing permission: post_voucher", 403, "COMPANY_PERMISSION_DENIED");
    }
    if ($voucherId === "") {
        throw new CompanyPostingException("voucherId required", 422, "VALIDATION_ERROR");
    }
    $db->beginTransaction();
    try {
        $st = $db->prepare(
            "SELECT * FROM company_vouchers WHERE id = ? AND company_id = ? AND deleted_at IS NULL FOR UPDATE"
        );
        $st->execute([$voucherId, $companyId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new CompanyPostingException("Voucher not found", 404, "NOT_FOUND");
        }
        if ((string)$row["status"] === "POSTED") {
            $db->commit();
            json_ok(["voucher" => company_load_voucher_with_lines($db, $companyId, $voucherId), "alreadyPosted" => true]);
            return;
        }
        if ((string)$row["status"] !== "DRAFT") {
            throw new CompanyPostingException("Only a draft can be posted", 422, "INVALID_STATUS");
        }
        if (company_period_is_locked($db, $companyId, (string)$row["voucher_date"])) {
            throw new CompanyPostingException("Period is locked for this date", 423, "PERIOD_LOCKED");
        }
        $db->prepare(
            "UPDATE company_vouchers SET status = 'POSTED', posted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND company_id = ?"
        )->execute([$voucherId, $companyId]);
        company_audit_write($db, $companyId, $userId, "voucher.post_draft", "company_voucher", $voucherId, ["status" => "DRAFT"], ["status" => "POSTED"]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
    json_ok(["voucher" => company_load_voucher_with_lines($db, $companyId, $voucherId), "receiptIsSeparateVoucher" => true]);
}

function company_recurring_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    $action = strtolower((string)($body["action"] ?? "create"));
    if ($action === "run") {
        company_require_permission($db, $auth["userId"], $companyId, "create_journal");
        json_ok(company_recurring_run_local($db, $companyId, $auth["userId"], (string)($body["today"] ?? gmdate("Y-m-d"))));
        return;
    }
    company_require_permission($db, $auth["userId"], $companyId, "create_journal");
    $name = trim((string)($body["name"] ?? ""));
    $voucherType = strtoupper(trim((string)($body["voucherType"] ?? "JOURNAL")));
    $cadence = strtoupper(trim((string)($body["cadence"] ?? "MONTHLY")));
    if ($name === "" || !in_array($cadence, ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"], true)) {
        throw new CompanyPostingException("name and cadence are required", 422, "VALIDATION_ERROR");
    }
    $template = company_recurring_template_draft(is_array($body["template"] ?? null) ? $body["template"] : []);
    $template["voucherType"] = $voucherType;
    $id = company_new_id();
    $db->prepare(
        "INSERT INTO company_recurring_rules (id, company_id, name, voucher_type, cadence, next_run_date, template_json, active, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([
        $id,
        $companyId,
        $name,
        $voucherType,
        $cadence,
        $body["nextRunDate"] ?? null,
        json_encode($template, JSON_THROW_ON_ERROR),
        $auth["userId"],
    ]);
    json_ok(["id" => $id, "template" => $template], 201);
}

function company_recurring_advance_date(string $cadence, string $date): string {
    $dt = DateTimeImmutable::createFromFormat("!Y-m-d", $date);
    if (!$dt || $dt->format("Y-m-d") !== $date) {
        throw new CompanyPostingException("Invalid next run date", 422, "VALIDATION_ERROR");
    }
    $next = match (strtoupper($cadence)) {
        "WEEKLY" => $dt->modify("+7 days"),
        "MONTHLY" => $dt->modify("+1 month"),
        "QUARTERLY" => $dt->modify("+3 months"),
        "YEARLY" => $dt->modify("+1 year"),
        default => throw new CompanyPostingException("Unknown cadence", 422, "VALIDATION_ERROR"),
    };
    return $next->format("Y-m-d");
}

function company_recurring_run_local(PDO $db, string $companyId, string $userId, string $today): array {
    $parsed = DateTimeImmutable::createFromFormat("!Y-m-d", $today);
    if (!$parsed || $parsed->format("Y-m-d") !== $today) {
        throw new CompanyPostingException("Invalid today", 422, "VALIDATION_ERROR");
    }
    $st = $db->prepare(
        "SELECT * FROM company_recurring_rules
         WHERE company_id = ? AND active = 1 AND deleted_at IS NULL AND next_run_date IS NOT NULL AND next_run_date <= ?
         ORDER BY next_run_date ASC"
    );
    $st->execute([$companyId, $today]);
    $rules = $st->fetchAll(PDO::FETCH_ASSOC);
    $created = [];
    $skipped = [];
    foreach ($rules as $rule) {
        $runDate = (string)$rule["next_run_date"];
        if (company_period_is_locked($db, $companyId, $runDate)) {
            $skipped[] = ["id" => (string)$rule["id"], "reason" => "PERIOD_LOCKED"];
            continue;
        }
        $template = json_decode((string)$rule["template_json"], true);
        if (!is_array($template)) {
            $template = [];
        }
        $template = company_recurring_template_draft($template);
        $lines = $template["lines"] ?? [];
        if (!is_array($lines) || count($lines) < 2) {
            $skipped[] = ["id" => (string)$rule["id"], "reason" => "TEMPLATE_HAS_NO_LINES"];
            continue;
        }
        $mutationId = "recur-" . substr(str_replace("-", "", (string)$rule["id"]), 0, 40) . "-" . str_replace("-", "", $runDate);
        $result = company_post_voucher($db, $companyId, $userId, [
            "mutationId" => $mutationId,
            "voucherType" => (string)($template["voucherType"] ?? $rule["voucher_type"]),
            "voucherDate" => $runDate,
            "narration" => "Recurring draft. A due date is not a bank payment.",
            "status" => "DRAFT",
            "lines" => $lines,
            "partyId" => $template["partyId"] ?? null,
        ]);
        $next = company_recurring_advance_date((string)$rule["cadence"], $runDate);
        $db->prepare(
            "UPDATE company_recurring_rules SET next_run_date = ?, updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND company_id = ? AND next_run_date = ?"
        )->execute([$next, $rule["id"], $companyId, $runDate]);
        $created[] = [
            "id" => (string)$rule["id"],
            "voucherId" => (string)($result["id"] ?? ""),
            "status" => "DRAFT",
            "bankPayment" => false,
            "idempotencyKey" => $mutationId,
        ];
    }
    return ["created" => $created, "skipped" => $skipped];
}

function company_backup_pack(PDO $db, string $companyId): array {
    if (company_backup_uses_server_dump()) {
        throw new CompanyPostingException("Server-wide database dump is not a company backup", 422, "BACKUP_SCOPE");
    }
    $select = static function (PDO $db, string $sql, array $params, string $companyId) : array {
        $st = $db->prepare($sql);
        $st->execute($params);
        $rows = [];
        while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
            if (isset($row["company_id"]) && (string)$row["company_id"] !== $companyId) {
                continue;
            }
            $rows[] = company_backup_strip_secrets($row);
        }
        return $rows;
    };
    $workspace = $select($db, "SELECT * FROM company_workspaces WHERE id = ? AND deleted_at IS NULL", [$companyId], $companyId);
    $workspace = array_values(array_filter($workspace, static fn(array $row): bool => (string)($row["id"] ?? "") === $companyId));
    $sections = [
        "workspace" => $workspace,
        "memberships" => $select(
            $db,
            "SELECT m.id, m.company_id, m.user_id, m.status, u.username, u.display_name
             FROM company_memberships m
             LEFT JOIN users u ON u.id = m.user_id
             WHERE m.company_id = ?",
            [$companyId],
            $companyId
        ),
        "roles" => $select($db, "SELECT id, company_id, code, name FROM company_roles WHERE company_id = ?", [$companyId], $companyId),
        "parties" => $select($db, "SELECT * FROM company_parties WHERE company_id = ?", [$companyId], $companyId),
        "ledgers" => $select($db, "SELECT * FROM company_ledgers WHERE company_id = ?", [$companyId], $companyId),
        "vouchers" => $select($db, "SELECT * FROM company_vouchers WHERE company_id = ?", [$companyId], $companyId),
        "voucher_lines" => $select($db, "SELECT * FROM company_voucher_lines WHERE company_id = ?", [$companyId], $companyId),
        "documents" => $select(
            $db,
            "SELECT id, company_id, entity_type, entity_id, file_name, mime_type, storage_key, size_bytes, created_at
             FROM company_documents WHERE company_id = ?",
            [$companyId],
            $companyId
        ),
        "recurring_rules" => $select($db, "SELECT * FROM company_recurring_rules WHERE company_id = ?", [$companyId], $companyId),
        "org_subscriptions" => $select($db, "SELECT * FROM company_org_subscriptions WHERE company_id = ?", [$companyId], $companyId),
    ];
    foreach ($sections as $name => $rows) {
        if (!company_backup_scope_ok($rows, $companyId) && $name !== "workspace") {
            throw new CompanyPostingException("Backup escaped company scope", 500, "BACKUP_SCOPE");
        }
    }
    return [
        "companyId" => $companyId,
        "scope" => "single_company",
        "serverDump" => false,
        "sections" => $sections,
    ];
}

function company_groups_dispatch(): void {
    $auth = company_auth_user();
    $method = strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET"));
    $db = db_conn();
    if ($method === "GET") {
        $companyId = company_query_company_id();
        company_require_membership($db, $auth["userId"], $companyId);
        $st = $db->prepare(
            "SELECT g.id, g.name, g.status
             FROM company_groups g
             INNER JOIN company_group_members m ON m.group_id = g.id
             WHERE m.company_id = ? AND g.status = 'ACTIVE'"
        );
        $st->execute([$companyId]);
        json_ok(["groups" => $st->fetchAll(PDO::FETCH_ASSOC), "statutoryConsolidation" => false]);
        return;
    }
    $body = require_json_body();
    $groupId = (string)($body["groupId"] ?? "");
    $own = $db->prepare("SELECT id FROM company_groups WHERE id = ? AND owner_user_id = ? AND status = 'ACTIVE'");
    $own->execute([$groupId, $auth["userId"]]);
    if (!$own->fetch()) {
        throw new CompanyPostingException("Group not found", 404, "NOT_FOUND");
    }
    $members = $db->prepare("SELECT company_id FROM company_group_members WHERE group_id = ?");
    $members->execute([$groupId]);
    $totals = [];
    while ($member = $members->fetch(PDO::FETCH_ASSOC)) {
        $companyId = (string)$member["company_id"];
        company_require_membership($db, $auth["userId"], $companyId);
        $from = (string)($body["from"] ?? "1970-01-01");
        $to = (string)($body["to"] ?? gmdate("Y-m-d"));
        $pnl = company_profit_loss($db, $companyId, $from, $to);
        $totals[] = ["companyId" => $companyId, "total" => (int)($pnl["netProfitPaise"] ?? 0)];
    }
    $pairs = [];
    foreach ((array)($body["matchedPairs"] ?? []) as $pair) {
        if (!is_array($pair)) {
            continue;
        }
        $pairs[] = [
            "fromCompanyId" => (string)($pair["fromCompanyId"] ?? ""),
            "toCompanyId" => (string)($pair["toCompanyId"] ?? ""),
            "amount" => (int)($pair["amountPaise"] ?? $pair["amount"] ?? 0),
        ];
    }
    $report = company_group_management_totals($totals, $pairs);
    json_ok($report + ["companyTotals" => $totals]);
}

function company_bridge_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "create_journal");
    $amount = (int)($body["amountPaise"] ?? 0);
    $plan = company_reimbursement_plan($amount);
    $state = (string)($body["state"] ?? "proposed");
    $event = (string)($body["event"] ?? "");
    if ($event !== "") {
        $state = company_bridge_transition($state, $event);
    }
    $personalUserId = (string)($body["personalUserId"] ?? $auth["userId"]);
    $personalEntityId = (string)($body["personalEntityId"] ?? "");
    if ($personalEntityId === "") {
        throw new CompanyPostingException("personalEntityId required", 422, "VALIDATION_ERROR");
    }
    $id = company_new_id();
    $voucherId = isset($body["companyVoucherId"]) && $body["companyVoucherId"] !== "" ? (string)$body["companyVoucherId"] : null;
    $db->prepare(
        "INSERT INTO company_cross_domain_links
            (id, company_id, company_voucher_id, personal_user_id, personal_collection, personal_entity_id, link_type, created_at)
         VALUES (?, ?, ?, ?, 'udhari', ?, 'REIMBURSEMENT', UTC_TIMESTAMP())"
    )->execute([$id, $companyId, $voucherId, $personalUserId, $personalEntityId]);
    $column = $db->query("SHOW COLUMNS FROM company_cross_domain_links LIKE 'bridge_status'");
    $persisted = false;
    if ($column && $column->fetch()) {
        $db->prepare("UPDATE company_cross_domain_links SET bridge_status = ? WHERE id = ? AND company_id = ?")
            ->execute([$state, $id, $companyId]);
        $persisted = true;
    }
    json_ok([
        "id" => $id,
        "state" => $state,
        "statusPersisted" => $persisted,
        "plan" => $plan,
    ], 201);
}

function company_org_subscription_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "manage_company");
    $fixture = is_array($body["fixture"] ?? null) ? $body["fixture"] : $body;
    $applied = company_org_subscription_from_fixture($fixture);
    $id = company_new_id();
    $db->prepare(
        "INSERT INTO company_org_subscriptions
            (id, org_id, company_id, plan_code, status, features_json, started_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([
        $id,
        $companyId,
        $companyId,
        $applied["planCode"],
        $applied["status"],
        json_encode(["source" => "local-fixture", "personalSubscription" => false], JSON_THROW_ON_ERROR),
    ]);
    json_ok(["subscription" => $applied + ["id" => $id]], 201);
}

function company_gst_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "export_reports");
    try {
        $result = company_gst_workbench(
            (string)($body["state"] ?? "draft"),
            (string)($body["action"] ?? ""),
            (string)($body["regime"] ?? "hypothetical")
        );
    } catch (InvalidArgumentException $e) {
        throw new CompanyPostingException($e->getMessage(), 422, "GST_NOT_FILED");
    }
    $documentId = null;
    if ($result["state"] === "exported") {
        $documentId = company_new_id();
        $payload = json_encode(["state" => "exported", "filed" => false, "irn" => null], JSON_THROW_ON_ERROR);
        $relative = company_document_relative_key($companyId, $documentId);
        $absolute = company_document_absolute_path($relative);
        if ($absolute !== null) {
            $dir = dirname($absolute);
            if (!is_dir($dir)) {
                mkdir($dir, 0700, true);
            }
            file_put_contents($absolute, $payload);
        }
        $db->prepare(
            "INSERT INTO company_documents (id, company_id, entity_type, entity_id, file_name, mime_type, storage_key, size_bytes, uploaded_by, created_at)
             VALUES (?, ?, 'GST_EXPORT', NULL, ?, 'application/json', ?, ?, ?, UTC_TIMESTAMP())"
        )->execute([
            $documentId,
            $companyId,
            "gst-export-" . $documentId . ".json",
            $relative,
            strlen($payload),
            $auth["userId"],
        ]);
    }
    json_ok(["gst" => $result, "documentId" => $documentId]);
}

function company_payroll_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    company_require_membership($db, $auth["userId"], $companyId);
    try {
        $preview = company_payroll_preview((int)($body["gross"] ?? 0));
        $plan = company_payroll_commit_plan($preview);
    } catch (InvalidArgumentException $e) {
        throw new CompanyPostingException($e->getMessage(), 422, "PAYROLL_RATES_UNVERIFIED");
    }
    $action = strtolower((string)($body["action"] ?? "preview"));
    try {
        $writePermission = company_payroll_action_permission($action);
    } catch (InvalidArgumentException $e) {
        throw new CompanyPostingException($e->getMessage(), 422, "VALIDATION_ERROR");
    }
    if ($writePermission !== null) {
        company_require_permission($db, $auth["userId"], $companyId, $writePermission);
    }
    $documentId = null;
    $voucherId = null;
    $voucherDate = (string)($body["voucherDate"] ?? gmdate("Y-m-d"));
    if ($action === "accrue" || $action === "pay") {
        if ($plan["paymentRepeatsSalaryExpense"]) {
            throw new CompanyPostingException("Payroll payment must not expense salary again", 422, "PAYROLL_DOUBLE_EXPENSE");
        }
        if ($action === "pay") {
            $accrualReceipt = $db->prepare(
                "SELECT mutation_id FROM company_financial_write_receipts WHERE company_id = ? AND mutation_id = ?"
            );
            $accrualReceipt->execute([$companyId, "payroll-accrue-30000"]);
            if (!$accrualReceipt->fetch()) {
                throw new CompanyPostingException("Post the accrual before the payment", 422, "PAYROLL_ACCRUAL_REQUIRED");
            }
        }
        $codes = [
            "SALARY_LEDGER" => ["Salary", "SALARY"],
            "STATUTORY_DEDUCTIONS" => ["Statutory deductions (unverified)", "TAX_PAY"],
            "EMPLOYER_LIABILITY" => ["Employer liability (unverified)", "EXP_PAY"],
            "SALARY_PAYABLE" => ["Salary payable", "EXP_PAY"],
            "BANK" => ["Bank", "BANK"],
        ];
        $sourceLines = $action === "accrue" ? $plan["accrual"] : $plan["payment"]["lines"];
        $lines = [];
        foreach ($sourceLines as $line) {
            $code = (string)$line["ledger"];
            if ($code === "BANK") {
                $code = "BANK_PRIMARY";
            }
            if (!isset($codes[$line["ledger"]])) {
                throw new CompanyPostingException("Unknown payroll ledger", 422, "LEDGER_NOT_FOUND");
            }
            [$name, $group] = $codes[$line["ledger"]];
            $lines[] = [
                "ledgerId" => company_payroll_ledger_id($db, $companyId, $code, $name, $group),
                "side" => (string)$line["side"],
                "amountPaise" => company_payroll_rupees_to_paise((int)$line["amount"]),
            ];
        }
        $voucher = company_post_voucher($db, $companyId, $auth["userId"], [
            "mutationId" => "payroll-" . $action . "-30000",
            "voucherType" => "JOURNAL",
            "voucherDate" => $voucherDate,
            "narration" => $action === "accrue"
                ? "Payroll accrual. Rates unverified. Not a statutory filing."
                : "Payroll payment. Clears salary payable. Does not expense salary again. Rates unverified.",
            "status" => "POSTED",
            "lines" => $lines,
        ]);
        $voucherId = (string)($voucher["id"] ?? "");
    }
    if ($action === "approve" || $action === "accrue" || $action === "pay") {
        $documentId = company_new_id();
        $payload = json_encode([
            "approved" => true,
            "rates" => "unverified",
            "compliant" => false,
            "accrual" => $plan["accrual"],
            "payslip" => $plan["payslip"],
            "payment" => $plan["payment"],
            "paymentRepeatsSalaryExpense" => false,
            "step" => $action,
            "voucherId" => $voucherId,
        ], JSON_THROW_ON_ERROR);
        $relative = company_document_relative_key($companyId, $documentId);
        $absolute = company_document_absolute_path($relative);
        if ($absolute !== null) {
            $dir = dirname($absolute);
            if (!is_dir($dir)) {
                mkdir($dir, 0700, true);
            }
            file_put_contents($absolute, $payload);
        }
        $db->prepare(
            "INSERT INTO company_documents (id, company_id, entity_type, entity_id, file_name, mime_type, storage_key, size_bytes, uploaded_by, created_at)
             VALUES (?, ?, 'PAYROLL_RUN', NULL, ?, 'application/json', ?, ?, ?, UTC_TIMESTAMP())"
        )->execute([
            $documentId,
            $companyId,
            "payroll-" . $documentId . ".json",
            $relative,
            strlen($payload),
            $auth["userId"],
        ]);
    } elseif ($action !== "preview") {
        throw new CompanyPostingException("Payroll action must be preview, approve, accrue, or pay", 422, "VALIDATION_ERROR");
    }
    json_ok([
        "preview" => $preview,
        "accrual" => $plan["accrual"],
        "payslip" => $plan["payslip"],
        "payment" => $plan["payment"],
        "paymentRepeatsSalaryExpense" => $plan["paymentRepeatsSalaryExpense"],
        "posted" => $voucherId !== null && $voucherId !== "",
        "voucherId" => $voucherId,
        "approved" => $action === "approve" || $action === "accrue" || $action === "pay",
        "documentId" => $documentId,
        "unit" => "synthetic-rupees",
        "rates" => "unverified",
        "compliant" => false,
    ]);
}

function company_payroll_ledger_id(PDO $db, string $companyId, string $code, string $name, string $groupCode): string {
    $st = $db->prepare(
        "SELECT id FROM company_ledgers WHERE company_id = ? AND code = ? AND deleted_at IS NULL LIMIT 1"
    );
    $st->execute([$companyId, $code]);
    $id = $st->fetchColumn();
    if ($id) {
        return (string)$id;
    }
    $group = $db->prepare(
        "SELECT id FROM company_account_groups WHERE company_id = ? AND code = ? AND deleted_at IS NULL LIMIT 1"
    );
    $group->execute([$companyId, $groupCode]);
    $groupId = $group->fetchColumn();
    if (!$groupId) {
        throw new CompanyPostingException("Ledger group {$groupCode} is missing", 422, "LEDGER_NOT_FOUND");
    }
    $id = company_new_id();
    $db->prepare(
        "INSERT INTO company_ledgers (id, company_id, group_id, name, code, is_cash_bank, is_party_control, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$id, $companyId, $groupId, $name, $code, $code === "BANK_PRIMARY" ? 1 : 0]);
    return $id;
}

function company_items_ensure(PDO $db): void {
    $db->exec(
        "CREATE TABLE IF NOT EXISTS company_items (
            id VARCHAR(191) NOT NULL,
            company_id VARCHAR(191) NOT NULL,
            name VARCHAR(191) NOT NULL,
            kind VARCHAR(16) NOT NULL,
            costing_method VARCHAR(32) NOT NULL DEFAULT 'weighted-average',
            qty INT NOT NULL DEFAULT 0,
            value_amount INT NOT NULL DEFAULT 0,
            cogs_amount INT NOT NULL DEFAULT 0,
            revenue_amount INT NOT NULL DEFAULT 0,
            active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            deleted_at DATETIME NULL,
            PRIMARY KEY (id),
            KEY idx_company_items_company (company_id, kind)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function company_items_dispatch(): void {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    company_items_ensure($db);
    $method = strtoupper((string)($_SERVER["REQUEST_METHOD"] ?? "GET"));
    if ($method === "GET") {
        company_require_permission($db, $auth["userId"], $companyId, "view_ledgers");
        $st = $db->prepare(
            "SELECT id, name, kind, costing_method, qty, value_amount, cogs_amount, revenue_amount
             FROM company_items WHERE company_id = ? AND deleted_at IS NULL ORDER BY name"
        );
        $st->execute([$companyId]);
        json_ok(["items" => $st->fetchAll(PDO::FETCH_ASSOC), "costing" => "weighted-average", "stockLedger" => "STOCK"]);
        return;
    }
    if ($method !== "POST") {
        throw new CompanyPostingException("Method not allowed", 405, "METHOD_NOT_ALLOWED");
    }
    company_require_permission($db, $auth["userId"], $companyId, "manage_ledgers");
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? $companyId);
    $action = strtolower((string)($body["action"] ?? "create"));
    if ($action === "create") {
        $name = trim((string)($body["name"] ?? ""));
        if ($name === "") {
            throw new CompanyPostingException("Item name is required", 422, "VALIDATION_ERROR");
        }
        try {
            $kind = company_normalize_item_kind((string)($body["kind"] ?? "STOCK"));
        } catch (InvalidArgumentException $e) {
            throw new CompanyPostingException($e->getMessage(), 422, "VALIDATION_ERROR");
        }
        $id = company_new_id();
        $db->prepare(
            "INSERT INTO company_items (id, company_id, name, kind, costing_method, qty, value_amount, cogs_amount, revenue_amount, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'weighted-average', 0, 0, 0, 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
        )->execute([$id, $companyId, $name, $kind]);
        json_ok(["item" => ["id" => $id, "name" => $name, "kind" => $kind, "qty" => 0, "value" => 0, "cogs" => 0, "revenue" => 0]], 201);
        return;
    }
    $itemId = (string)($body["itemId"] ?? "");
    $st = $db->prepare("SELECT * FROM company_items WHERE id = ? AND company_id = ? AND deleted_at IS NULL");
    $st->execute([$itemId, $companyId]);
    $item = $st->fetch(PDO::FETCH_ASSOC);
    if (!$item) {
        throw new CompanyPostingException("Item not found", 404, "NOT_FOUND");
    }
    $state = [
        "qty" => (int)$item["qty"],
        "value" => (int)$item["value_amount"],
        "cogs" => (int)$item["cogs_amount"],
        "revenue" => (int)$item["revenue_amount"],
    ];
    if ($action === "collect") {
        $next = company_customer_collection($state, (int)($body["amount"] ?? 0));
        json_ok(["item" => ["id" => $itemId, "qty" => $next["qty"], "value" => $next["value"], "cogs" => $next["cogs"], "revenue" => $next["revenue"]], "collection" => $next["collection"]]);
        return;
    }
    if ((string)$item["kind"] !== "STOCK") {
        throw new CompanyPostingException("Only stock items move quantity", 422, "ITEM_KIND");
    }
    try {
        $next = company_apply_weighted_average($state, $action, (int)($body["qty"] ?? 0), (int)($body["unit"] ?? 0));
    } catch (InvalidArgumentException $e) {
        throw new CompanyPostingException($e->getMessage(), 422, "STOCK_MOVE");
    }
    $db->prepare(
        "UPDATE company_items SET qty = ?, value_amount = ?, cogs_amount = ?, revenue_amount = ?, updated_at = UTC_TIMESTAMP()
         WHERE id = ? AND company_id = ?"
    )->execute([$next["qty"], $next["value"], $next["cogs"], $next["revenue"], $itemId, $companyId]);
    json_ok(["item" => ["id" => $itemId, "kind" => "STOCK", "qty" => $next["qty"], "value" => $next["value"], "cogs" => $next["cogs"], "revenue" => $next["revenue"], "stockLedger" => "STOCK"]]);
}

function company_ensure_branch_url_column(PDO $db): void {
    $column = $db->query("SHOW COLUMNS FROM company_branches LIKE 'url'");
    if ($column && !$column->fetch()) {
        $db->exec("ALTER TABLE company_branches ADD COLUMN url VARCHAR(512) NULL");
    }
}

/** @param mixed $tags @return list<string> */
function company_party_save_tags(PDO $db, string $companyId, string $partyId, mixed $tags): array {
    if (!is_array($tags)) {
        return [];
    }
    $find = $db->prepare("SELECT id FROM company_party_tags WHERE company_id = ? AND name = ?");
    $insertTag = $db->prepare(
        "INSERT INTO company_party_tags (id, company_id, name, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())"
    );
    $link = $db->prepare(
        "INSERT IGNORE INTO company_party_tag_memberships (id, company_id, party_id, tag_id, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
    );
    $names = [];
    foreach ($tags as $raw) {
        $name = trim((string)$raw);
        if ($name === "" || strlen($name) > 64) {
            continue;
        }
        $find->execute([$companyId, $name]);
        $tagId = $find->fetchColumn();
        if (!$tagId) {
            $tagId = company_new_id();
            $insertTag->execute([$tagId, $companyId, $name]);
        }
        $link->execute([company_new_id(), $companyId, $partyId, $tagId]);
        $names[] = $name;
    }
    return $names;
}

function company_cheque_dispatch(): void {
    $auth = company_auth_user();
    $body = require_json_body();
    $companyId = (string)($body["companyId"] ?? company_query_company_id());
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "view_cash_bank_books");
    $voucherId = (string)($body["voucherId"] ?? "");
    if ($voucherId === "") {
        throw new CompanyPostingException("Post a voucher before matching a cheque", 422, "VALIDATION_ERROR");
    }
    $st = $db->prepare("SELECT status FROM company_vouchers WHERE id = ? AND company_id = ? AND deleted_at IS NULL");
    $st->execute([$voucherId, $companyId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new CompanyPostingException("Voucher not found", 404, "NOT_FOUND");
    }
    if ((string)$row["status"] !== "POSTED") {
        throw new CompanyPostingException("Only a posted cheque can be matched", 422, "INVALID_STATUS");
    }
    $effect = company_cheque_match_effect((int)($body["postedCashPaise"] ?? 0), (int)($body["feePaise"] ?? 0));
    json_ok(["match" => $effect, "cashPosted" => false]);
}
