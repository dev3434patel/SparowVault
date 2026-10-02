<?php
declare(strict_types=1);

require_once __DIR__ . "/../http.php";
require_once __DIR__ . "/../auth.php";

/** Stable permission keys (COMPANY_PERMISSION_MATRIX.md). */
function company_permission_keys(): array {
    return [
        "view_dashboard",
        "view_party",
        "view_party_balance",
        "manage_parties",
        "view_ledgers",
        // @future — COA group/ledger create-edit API not shipped; key reserved for Masters COA editor
        "manage_ledgers",
        "create_receipt",
        "create_payment",
        "create_contra",
        "create_journal",
        "create_purchase_sale",
        // @future — draft voucher edit endpoints not shipped
        "edit_own_voucher",
        "edit_any_voucher",
        "approve_voucher",
        "post_voucher",
        "reverse_voucher",
        // @future — voucher draft cancel API not shipped (party delete uses manage_parties)
        "delete_draft",
        "view_receivables",
        "view_payables",
        "view_day_book",
        "view_pnl",
        "view_balance_sheet",
        "view_trial_balance",
        "view_cash_bank_books",
        "view_audit",
        "export_reports",
        // ENFORCE — exports.php when report/format=backup
        "export_backup",
        "manage_users",
        // @future — workspace profile PATCH not shipped; Settings UI is period-lock focused today
        "manage_company",
        "manage_dimensions",
        "lock_period",
        "reopen_period",
        // @future — approval threshold settings API
        "manage_approvals_settings",
        // ENFORCE — company_assert_can_create_voucher when voucherType=OPENING_BALANCE
        "manage_opening_balances",
    ];
}

/**
 * @return array membership row
 */
function company_require_membership(PDO $db, string $userId, string $companyId): array {
    $st = $db->prepare(
        "SELECT * FROM company_memberships
         WHERE company_id = ? AND user_id = ? AND status = 'ACTIVE'
         LIMIT 1"
    );
    $st->execute([$companyId, $userId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        json_error("Company membership required", 403, "COMPANY_FORBIDDEN");
        exit;
    }
    return $row;
}

/** @return list<string> */
function company_user_permissions(PDO $db, string $userId, string $companyId): array {
    $st = $db->prepare(
        "SELECT DISTINCT rp.permission_key
         FROM company_memberships m
         INNER JOIN company_membership_roles mr ON mr.membership_id = m.id AND mr.company_id = m.company_id
         INNER JOIN company_role_permissions rp ON rp.role_id = mr.role_id AND rp.company_id = m.company_id
         WHERE m.company_id = ? AND m.user_id = ? AND m.status = 'ACTIVE'"
    );
    $st->execute([$companyId, $userId]);
    $keys = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $keys[] = (string)$row["permission_key"];
    }
    return $keys;
}

function company_user_has_permission(PDO $db, string $userId, string $companyId, string $permissionKey): bool {
    return in_array($permissionKey, company_user_permissions($db, $userId, $companyId), true);
}

function company_require_permission(
    PDO $db,
    string $userId,
    string $companyId,
    string $permissionKey,
    string $errorCode = "FORBIDDEN"
): void {
    company_require_membership($db, $userId, $companyId);
    if (!company_user_has_permission($db, $userId, $companyId, $permissionKey)) {
        json_error("Missing permission: " . $permissionKey, 403, $errorCode);
        exit;
    }
}

/**
 * Assert loaded entity belongs to company; exits 404/403 on mismatch.
 * @param array|null $row
 * @return array
 */
function company_assert_same_company(?array $row, string $companyId, string $entityLabel = "Entity"): array {
    if ($row === null) {
        json_error($entityLabel . " not found", 404, "NOT_FOUND");
        exit;
    }
    if ((string)($row["company_id"] ?? "") !== $companyId) {
        json_error($entityLabel . " not found", 404, "NOT_FOUND");
        exit;
    }
    return $row;
}

function company_permission_for_voucher_type(string $voucherType): string {
    return match (strtoupper($voucherType)) {
        "RECEIPT" => "create_receipt",
        "PAYMENT" => "create_payment",
        "CONTRA" => "create_contra",
        "JOURNAL", "ADJUSTMENT", "OPENING_BALANCE" => "create_journal",
        "PURCHASE", "SALE", "DEBIT_NOTE", "CREDIT_NOTE" => "create_purchase_sale",
        default => "create_journal",
    };
}

/**
 * Require PIN re-entry for sensitive company actions (reverse, period reopen, export).
 * Accepts `pin` in the JSON body. Throws CompanyPostingException when available.
 */
function company_require_sensitive_pin(array $authUser, array $body): void {
    $pin = (string)($body["pin"] ?? "");
    $userId = (string)($authUser["userId"] ?? $authUser["id"] ?? "");
    $fail = static function () : void {
        if (class_exists(CompanyPostingException::class)) {
            throw new CompanyPostingException("PIN re-entry required", 401, "PIN_REQUIRED");
        }
        json_error("PIN re-entry required", 401, "PIN_REQUIRED");
        exit;
    };
    if ($userId === "" || !auth_valid_pin($pin)) {
        $fail();
    }
    $row = user_auth_row_by_id($userId);
    if (!$row || !verify_secret($pin . ":" . (string)$row["pin_salt"], (string)$row["pin_hash"])) {
        $fail();
    }
}
