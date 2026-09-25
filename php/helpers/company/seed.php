<?php
declare(strict_types=1);

require_once __DIR__ . "/ids.php";
require_once __DIR__ . "/audit.php";

/** Default role → permission matrix (COMPANY_PERMISSION_MATRIX.md). */
function company_seed_role_permissions(): array {
    // Keys marked @future remain seeded so roles stay stable; surfaces not yet enforced stay commented in authz.php.
    $all = [
        "view_dashboard", "view_party", "view_party_balance", "manage_parties",
        "view_ledgers", "manage_ledgers", // @future COA editor
        "create_receipt", "create_payment", "create_contra", "create_journal", "create_purchase_sale",
        "edit_own_voucher", "edit_any_voucher", // @future draft edit
        "approve_voucher", "post_voucher", "reverse_voucher",
        "delete_draft", // @future voucher draft cancel
        "view_receivables", "view_payables", "view_day_book",
        "view_pnl", "view_balance_sheet", "view_trial_balance", "view_cash_bank_books",
        "view_audit", "export_reports", "export_backup", // export_backup ENFORCE on backup pack
        "manage_users", "manage_company", // manage_company @future workspace PATCH
        "manage_dimensions",
        "lock_period", "reopen_period",
        "manage_approvals_settings", // @future thresholds API
        "manage_opening_balances", // ENFORCE on OPENING_BALANCE post
    ];
    $viewerReports = ["view_receivables", "view_payables", "view_day_book", "view_cash_bank_books"];
    return [
        "OWNER" => $all,
        "SUPER_ADMIN" => $all,
        "ACCOUNTANT" => [
            "view_dashboard", "view_party", "view_party_balance", "manage_parties",
            "view_ledgers", "manage_ledgers",
            "create_receipt", "create_payment", "create_contra", "create_journal", "create_purchase_sale",
            "edit_own_voucher", "edit_any_voucher", "approve_voucher", "post_voucher", "reverse_voucher", "delete_draft",
            "view_receivables", "view_payables", "view_day_book",
            "view_pnl", "view_balance_sheet", "view_trial_balance", "view_cash_bank_books",
            "view_audit", "export_reports",
            "manage_dimensions", "lock_period", "manage_opening_balances",
        ],
        "MANAGER" => [
            "view_dashboard", "view_party", "view_party_balance", "manage_parties",
            "view_ledgers",
            "create_receipt", "create_payment", "create_contra", "create_journal", "create_purchase_sale",
            "edit_own_voucher", "edit_any_voucher", "approve_voucher", "post_voucher", "delete_draft",
            "view_receivables", "view_payables", "view_day_book",
            "view_pnl", "view_balance_sheet", "view_trial_balance", "view_cash_bank_books",
            "view_audit", "export_reports", "manage_dimensions",
        ],
        "DATA_ENTRY" => [
            "view_dashboard", "view_party", "view_party_balance", "manage_parties",
            "view_ledgers",
            "create_receipt", "create_payment", "create_contra", "create_purchase_sale",
            "edit_own_voucher", "delete_draft",
            "view_receivables", "view_payables", "view_day_book", "view_cash_bank_books",
        ],
        "VIEWER" => array_merge(
            ["view_dashboard", "view_party", "view_party_balance", "view_ledgers"],
            $viewerReports
        ),
        "AUDITOR" => [
            "view_dashboard", "view_party", "view_party_balance", "view_ledgers",
            "view_receivables", "view_payables", "view_day_book",
            "view_pnl", "view_balance_sheet", "view_trial_balance", "view_cash_bank_books",
            "view_audit", "export_reports",
        ],
    ];
}

/**
 * Seed default roles, COA groups/ledgers, and owner membership with OWNER role.
 */
function company_seed_workspace(PDO $db, string $companyId, string $ownerUserId): void {
    $roleIds = [];
    $matrix = company_seed_role_permissions();

    foreach ($matrix as $code => $perms) {
        $roleId = company_new_id();
        $roleIds[$code] = $roleId;
        $db->prepare(
            "INSERT INTO company_roles (id, company_id, code, name, is_system, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
        )->execute([$roleId, $companyId, $code, str_replace("_", " ", $code)]);
        $ins = $db->prepare(
            "INSERT INTO company_role_permissions (id, company_id, role_id, permission_key, created_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
        );
        foreach ($perms as $key) {
            $ins->execute([company_new_id(), $companyId, $roleId, $key]);
        }
    }

    // COA groups: [code, name, nature, parentCode|null]
    $groups = [
        ["AST", "Assets", "ASSET", null],
        ["CASH", "Cash", "ASSET", "AST"],
        ["BANK", "Bank Accounts", "ASSET", "AST"],
        ["AR", "Accounts Receivable", "ASSET", "AST"],
        ["LOANS_ADV", "Loans & Advances Given", "ASSET", "AST"],
        ["DEPOSITS", "Deposits", "ASSET", "AST"],
        ["INVENTORY", "Inventory", "ASSET", "AST"],
        ["FIXED", "Property / Fixed Assets", "ASSET", "AST"],
        ["OCA", "Other Current Assets", "ASSET", "AST"],
        ["LIA", "Liabilities", "LIABILITY", null],
        ["AP", "Accounts Payable", "LIABILITY", "LIA"],
        ["LOANS_BOR", "Loans Borrowed", "LIABILITY", "LIA"],
        ["PARTY_PAY", "Party Payables", "LIABILITY", "LIA"],
        ["TAX_PAY", "Taxes Payable", "LIABILITY", "LIA"],
        ["EXP_PAY", "Expenses Payable", "LIABILITY", "LIA"],
        ["OTH_LIA", "Other Liabilities", "LIABILITY", "LIA"],
        ["EQ", "Equity", "EQUITY", null],
        ["CAPITAL", "Capital", "EQUITY", "EQ"],
        ["PARTNER_CAP", "Partner Capital", "EQUITY", "EQ"],
        ["DRAWINGS", "Drawings", "EQUITY", "EQ"],
        ["RE", "Retained Earnings", "EQUITY", "EQ"],
        ["INC", "Income", "INCOME", null],
        ["SALES", "Sales", "INCOME", "INC"],
        ["SVC_INC", "Service Income", "INCOME", "INC"],
        ["INT_INC", "Interest Income", "INCOME", "INC"],
        ["FARM_INC", "Farming Income", "INCOME", "INC"],
        ["PROP_INC", "Property Income", "INCOME", "INC"],
        ["OTH_INC", "Other Income", "INCOME", "INC"],
        ["EXP", "Expense", "EXPENSE", null],
        ["PURCHASE", "Purchase", "EXPENSE", "EXP"],
        ["FARM_EXP", "Farming Expense", "EXPENSE", "EXP"],
        ["PROP_EXP", "Property Expense", "EXPENSE", "EXP"],
        ["SALARY", "Salary", "EXPENSE", "EXP"],
        ["UTIL", "Utilities", "EXPENSE", "EXP"],
        ["TRANS", "Transport", "EXPENSE", "EXP"],
        ["PROF", "Professional Fee", "EXPENSE", "EXP"],
        ["INT_EXP", "Interest Expense", "EXPENSE", "EXP"],
        ["OTH_EXP", "Other Expense", "EXPENSE", "EXP"],
    ];

    $groupIds = [];
    $gIns = $db->prepare(
        "INSERT INTO company_account_groups (id, company_id, parent_id, name, code, nature, is_system, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    );
    foreach ($groups as [$code, $name, $nature, $parentCode]) {
        $id = company_new_id();
        $groupIds[$code] = $id;
        $parentId = $parentCode !== null ? ($groupIds[$parentCode] ?? null) : null;
        $gIns->execute([$id, $companyId, $parentId, $name, $code, $nature]);
    }

    // Seed ledgers: [code, name, groupCode, isCashBank, isPartyControl]
    $ledgers = [
        ["CASH_IN_HAND", "Cash", "CASH", 1, 0],
        ["BANK_PRIMARY", "Bank", "BANK", 1, 0],
        ["AR_CONTROL", "Accounts Receivable", "AR", 0, 1],
        ["AP_CONTROL", "Accounts Payable", "AP", 0, 1],
        ["LOANS_BORROWED", "Loans Borrowed", "LOANS_BOR", 0, 1],
        ["ADVANCES_GIVEN", "Advances Given", "LOANS_ADV", 0, 1],
        ["LOANS_GIVEN", "Loans Given", "LOANS_ADV", 0, 1],
        ["CAPITAL_LEDGER", "Capital", "CAPITAL", 0, 0],
        ["DRAWINGS_LEDGER", "Drawings", "DRAWINGS", 0, 0],
        ["SALES_LEDGER", "Sales", "SALES", 0, 0],
        ["INTEREST_INCOME", "Interest Income", "INT_INC", 0, 0],
        ["FARMING_INCOME", "Farming Income", "FARM_INC", 0, 0],
        ["PROPERTY_INCOME", "Property Income", "PROP_INC", 0, 0],
        ["OTHER_INCOME", "Other Income", "OTH_INC", 0, 0],
        ["PURCHASE_LEDGER", "Purchase", "PURCHASE", 0, 0],
        ["SALARY_LEDGER", "Salary", "SALARY", 0, 0],
        ["FARMING_EXPENSE", "Farming Expense", "FARM_EXP", 0, 0],
        ["PROPERTY_EXPENSE", "Property Expense", "PROP_EXP", 0, 0],
        ["PROPERTY_ADVANCE", "Property Advances", "LOANS_ADV", 0, 1],
        ["PROPERTY_ASSET", "Property / Fixed Assets", "FIXED", 0, 0],
        ["PROPERTY_DEPOSIT", "Property Deposits", "DEPOSITS", 0, 0],
        ["EXPENSE_CONTRA", "Expense Contra / Refunds", "OTH_EXP", 0, 0],
        ["INTEREST_EXPENSE", "Interest Expense", "INT_EXP", 0, 0],
        ["OTHER_EXPENSE", "Other Expense", "OTH_EXP", 0, 0],
    ];

    $lIns = $db->prepare(
        "INSERT INTO company_ledgers (id, company_id, group_id, name, code, is_cash_bank, is_party_control, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    );
    foreach ($ledgers as [$code, $name, $gCode, $cashBank, $partyCtrl]) {
        $lIns->execute([
            company_new_id(),
            $companyId,
            $groupIds[$gCode],
            $name,
            $code,
            $cashBank,
            $partyCtrl,
        ]);
    }

    $membershipId = company_new_id();
    $db->prepare(
        "INSERT INTO company_memberships (id, company_id, user_id, status, joined_at, created_at, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$membershipId, $companyId, $ownerUserId]);

    $db->prepare(
        "INSERT INTO company_membership_roles (id, company_id, membership_id, role_id, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP())"
    )->execute([company_new_id(), $companyId, $membershipId, $roleIds["OWNER"]]);

    company_audit_write($db, $companyId, $ownerUserId, "workspace.seeded", "company_workspace", $companyId, null, [
        "roles" => array_keys($roleIds),
        "ledgers" => count($ledgers),
    ]);
}

function company_ledger_id_by_code(PDO $db, string $companyId, string $code): ?string {
    $st = $db->prepare(
        "SELECT id FROM company_ledgers WHERE company_id = ? AND code = ? AND deleted_at IS NULL LIMIT 1"
    );
    $st->execute([$companyId, $code]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ? (string)$row["id"] : null;
}
