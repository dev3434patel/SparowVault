<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

try {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    company_require_membership($db, $auth["userId"], $companyId);

    $perms = company_user_permissions($db, $auth["userId"], $companyId);
    $canParties = in_array("view_party", $perms, true);
    $canVouchers = in_array("view_day_book", $perms, true);
    $canRecv = in_array("view_receivables", $perms, true);
    $canPay = in_array("view_payables", $perms, true);
    $canBills = $canRecv || $canPay;
    $canLedgers = in_array("view_ledgers", $perms, true);

    if (!$canParties && !$canVouchers && !$canBills && !$canLedgers) {
        json_error(
            "Missing permission to search any domain (view_party, view_day_book, view_receivables/view_payables, view_ledgers)",
            403,
            "FORBIDDEN"
        );
        exit;
    }

    $q = trim((string)($_GET["q"] ?? $_GET["query"] ?? ""));
    if ($q === "" || mb_strlen($q) < 2) {
        json_ok([
            "parties" => [],
            "vouchers" => [],
            "bills" => [],
            "ledgers" => [],
            "domains" => [
                "parties" => $canParties,
                "vouchers" => $canVouchers,
                "bills" => $canBills,
                "ledgers" => $canLedgers,
            ],
        ]);
        exit;
    }
    $like = "%" . $q . "%";

    $parties = [];
    if ($canParties) {
        $st = $db->prepare(
            "SELECT id, display_name, mobile, gstin, pan FROM company_parties
             WHERE company_id = ? AND deleted_at IS NULL
               AND (display_name LIKE ? OR mobile LIKE ? OR gstin LIKE ? OR pan LIKE ? OR legal_name LIKE ?)
             ORDER BY display_name ASC LIMIT 25"
        );
        $st->execute([$companyId, $like, $like, $like, $like, $like]);
        $parties = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    $vouchers = [];
    if ($canVouchers) {
        $st = $db->prepare(
            "SELECT id, voucher_number, voucher_type, voucher_date, narration, status
             FROM company_vouchers
             WHERE company_id = ? AND deleted_at IS NULL
               AND (voucher_number LIKE ? OR narration LIKE ? OR reference_number LIKE ?)
             ORDER BY voucher_date DESC LIMIT 25"
        );
        $st->execute([$companyId, $like, $like, $like]);
        $vouchers = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    $bills = [];
    if ($canBills) {
        $sides = [];
        if ($canRecv) {
            $sides[] = "RECEIVABLE";
        }
        if ($canPay) {
            $sides[] = "PAYABLE";
        }
        $placeholders = implode(",", array_fill(0, count($sides), "?"));
        $st = $db->prepare(
            "SELECT id, ref_number, party_id, outstanding_paise, side, status
             FROM company_bill_refs
             WHERE company_id = ? AND ref_number LIKE ? AND side IN ({$placeholders})
             ORDER BY bill_date DESC LIMIT 25"
        );
        $st->execute(array_merge([$companyId, $like], $sides));
        $bills = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    $ledgers = [];
    if ($canLedgers) {
        $st = $db->prepare(
            "SELECT id, code, name, is_cash_bank FROM company_ledgers
             WHERE company_id = ? AND deleted_at IS NULL
               AND (code LIKE ? OR name LIKE ?)
             ORDER BY code ASC LIMIT 25"
        );
        $st->execute([$companyId, $like, $like]);
        $ledgers = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    json_ok([
        "parties" => $parties,
        "vouchers" => $vouchers,
        "bills" => $bills,
        "ledgers" => $ledgers,
        "domains" => [
            "parties" => $canParties,
            "vouchers" => $canVouchers,
            "bills" => $canBills,
            "ledgers" => $canLedgers,
        ],
    ]);
} catch (Throwable $e) {
    company_handle_exception($e);
}
