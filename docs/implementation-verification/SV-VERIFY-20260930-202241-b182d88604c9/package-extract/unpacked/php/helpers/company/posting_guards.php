<?php
declare(strict_types=1);

function company_assert_purpose_not_deprecated(string $purpose): void {
    $key = strtoupper(trim($purpose));
    if ($key === "" || !company_purpose_is_deprecated($key)) {
        return;
    }
    $repl = company_purpose_deprecated_replacement($key) ?? "OTHER_PAYMENT";
    throw new CompanyPostingException(
        "This purpose was retired. Use {$repl} instead",
        422,
        "PURPOSE_DEPRECATED"
    );
}

/**
 * Assert caller may create/preview a voucher of this type (create_* keys).
 * Shared by voucher-preview and voucher-post.
 */
function company_assert_can_create_voucher(PDO $db, string $userId, string $companyId, string $voucherType): void {
    $memSt = $db->prepare(
        "SELECT id FROM company_memberships WHERE company_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1"
    );
    $memSt->execute([$companyId, $userId]);
    if (!$memSt->fetch()) {
        throw new CompanyPostingException("Company membership required", 403, "FORBIDDEN");
    }
    $type = strtoupper(trim($voucherType));
    if ($type === "") {
        throw new CompanyPostingException("voucherType required", 422, "VALIDATION_ERROR");
    }
    $perm = company_permission_for_voucher_type($type);
    if (!company_user_has_permission($db, $userId, $companyId, $perm)) {
        throw new CompanyPostingException("Missing permission: " . $perm, 403, "FORBIDDEN");
    }
    if ($type === "OPENING_BALANCE" && !company_user_has_permission($db, $userId, $companyId, "manage_opening_balances")) {
        throw new CompanyPostingException("Missing permission: manage_opening_balances", 403, "FORBIDDEN");
    }
}

/**
 * Preview-path gate: reject deprecated purposes, then same create_* check as post.
 */
function company_can_preview_voucher(
    PDO $db,
    string $userId,
    string $companyId,
    string $purpose,
    ?string $voucherType = null
): void {
    $purposeKey = strtoupper(trim($purpose));
    if ($purposeKey !== "") {
        company_assert_purpose_not_deprecated($purposeKey);
    }
    $type = $voucherType !== null && trim($voucherType) !== ""
        ? strtoupper(trim($voucherType))
        : (string)(company_purpose_voucher_type($purposeKey) ?? $purposeKey);
    company_assert_can_create_voucher($db, $userId, $companyId, $type);
}

function company_canonical($value) {
    if (!is_array($value)) {
        return $value;
    }
    if (!array_is_list($value)) {
        ksort($value, SORT_STRING);
    }
    foreach ($value as $k => $item) {
        $value[$k] = company_canonical($item);
    }
    return $value;
}

function company_request_hash(array $request): string {
    return hash("sha256", json_encode(company_canonical($request), JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION));
}

function company_period_is_locked(PDO $db, string $companyId, string $voucherDate): bool {
    $st = $db->prepare(
        "SELECT lock_before_date FROM company_period_locks
         WHERE company_id = ? AND released_at IS NULL
         ORDER BY lock_before_date DESC LIMIT 1"
    );
    $st->execute([$companyId]);
    $lock = $st->fetch(PDO::FETCH_ASSOC);
    if (!$lock) {
        return false;
    }
    // voucher_date < lock_before_date → locked
    return $voucherDate < (string)$lock["lock_before_date"];
}

function company_next_voucher_number(PDO $db, string $companyId, string $voucherType, string $voucherDate): string {
    $prefix = strtoupper(substr($voucherType, 0, 3)) . "-" . str_replace("-", "", $voucherDate) . "-";
    // Numeric MAX — never ORDER BY string (breaks after 9999 → "10000" sorts below "9999").
    $st = $db->prepare(
        "SELECT MAX(CAST(SUBSTRING_INDEX(voucher_number, '-', -1) AS UNSIGNED)) AS max_seq
         FROM company_vouchers
         WHERE company_id = ? AND voucher_number LIKE ?"
    );
    $st->execute([$companyId, $prefix . "%"]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    $seq = ((int)($row["max_seq"] ?? 0)) + 1;
    return $prefix . str_pad((string)$seq, 8, "0", STR_PAD_LEFT);
}

/**
 * Resolve or create a party relationship ledger (subledger under a control group).
 */
function company_resolve_party_relationship_ledger(
    PDO $db,
    string $companyId,
    string $partyId,
    string $relationshipType,
    string $controlLedgerCode,
    string $groupCodeForNew
): array {
    $st = $db->prepare(
        "SELECT * FROM company_party_relationship_accounts
         WHERE company_id = ? AND party_id = ? AND relationship_type = ? AND active = 1
         LIMIT 1"
    );
    $st->execute([$companyId, $partyId, $relationshipType]);
    $existing = $st->fetch(PDO::FETCH_ASSOC);
    if ($existing) {
        return $existing;
    }

    $party = $db->prepare("SELECT display_name FROM company_parties WHERE id = ? AND company_id = ? AND deleted_at IS NULL");
    $party->execute([$partyId, $companyId]);
    $p = $party->fetch(PDO::FETCH_ASSOC);
    if (!$p) {
        throw new CompanyPostingException("Party not found", 404, "PARTY_NOT_FOUND");
    }

    $controlId = company_ledger_id_by_code($db, $companyId, $controlLedgerCode);
    $groupSt = $db->prepare(
        "SELECT id FROM company_account_groups WHERE company_id = ? AND code = ? AND deleted_at IS NULL LIMIT 1"
    );
    $groupSt->execute([$companyId, $groupCodeForNew]);
    $group = $groupSt->fetch(PDO::FETCH_ASSOC);
    if (!$group) {
        throw new CompanyPostingException("Account group missing for relationship", 500, "COA_INCOMPLETE");
    }

    $ledgerId = company_new_id();
    $code = strtoupper(substr($relationshipType, 0, 8)) . "_" . substr(preg_replace('/[^A-Za-z0-9]/', "", $partyId) ?: "P", 0, 12);
    $name = (string)$p["display_name"] . " — " . str_replace("_", " ", $relationshipType);
    $db->prepare(
        "INSERT INTO company_ledgers (id, company_id, group_id, name, code, is_cash_bank, is_party_control, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$ledgerId, $companyId, $group["id"], $name, $code]);

    $relId = company_new_id();
    $db->prepare(
        "INSERT INTO company_party_relationship_accounts
         (id, company_id, party_id, relationship_type, ledger_id, control_ledger_id, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$relId, $companyId, $partyId, $relationshipType, $ledgerId, $controlId]);

    return [
        "id" => $relId,
        "company_id" => $companyId,
        "party_id" => $partyId,
        "relationship_type" => $relationshipType,
        "ledger_id" => $ledgerId,
        "control_ledger_id" => $controlId,
    ];
}
