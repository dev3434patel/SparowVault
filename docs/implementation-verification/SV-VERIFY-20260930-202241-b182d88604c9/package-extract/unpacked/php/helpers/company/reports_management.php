<?php
declare(strict_types=1);

/**
 * Management reports from POSTED vouchers only.
 * An empty row list is the query result. These handlers do not invent a zero total.
 */

function company_report_receipts_payments(PDO $db, string $companyId, string $from, string $to): array {
    $sql = "SELECT v.id, v.voucher_number, v.voucher_type, v.voucher_date, v.narration,
                   COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) AS debit_paise,
                   COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_paise ELSE 0 END), 0) AS credit_paise
            FROM company_vouchers v
            INNER JOIN company_voucher_lines l ON l.voucher_id = v.id AND l.company_id = v.company_id
            WHERE v.company_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL
              AND v.voucher_date >= ? AND v.voucher_date <= ?
              AND v.voucher_type IN ('RECEIPT', 'PAYMENT')
            GROUP BY v.id, v.voucher_number, v.voucher_type, v.voucher_date, v.narration
            ORDER BY v.voucher_date, v.voucher_number";
    $st = $db->prepare($sql);
    $st->execute([$companyId, $from, $to]);
    $rows = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $rows[] = [
            "id" => (string)$row["id"],
            "voucherNumber" => (string)$row["voucher_number"],
            "voucherType" => (string)$row["voucher_type"],
            "voucherDate" => (string)$row["voucher_date"],
            "narration" => $row["narration"],
            "debitPaise" => (int)$row["debit_paise"],
            "creditPaise" => (int)$row["credit_paise"],
        ];
    }
    return ["source" => "posted_vouchers", "rows" => $rows];
}

function company_report_posted_dimension(PDO $db, string $companyId, string $from, string $to, string $kind): array {
    $expr = match ($kind) {
        "project" => "COALESCE(NULLIF(l.project_id, ''), NULLIF(v.project_id, ''), '(unassigned)')",
        "business" => "COALESCE(NULLIF(v.business_unit_id, ''), '(unassigned)')",
        "area" => "COALESCE(NULLIF(l.area_id, ''), NULLIF(v.area_id, ''), '(unassigned)')",
        "category" => "COALESCE(NULLIF(v.purpose, ''), '(none)')",
        default => throw new InvalidArgumentException("Unknown management dimension"),
    };
    $sql = "SELECT {$expr} AS dimension_id,
                   COUNT(DISTINCT v.id) AS voucher_count,
                   COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) AS debit_paise,
                   COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_paise ELSE 0 END), 0) AS credit_paise
            FROM company_vouchers v
            INNER JOIN company_voucher_lines l ON l.voucher_id = v.id AND l.company_id = v.company_id
            WHERE v.company_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL
              AND v.voucher_date >= ? AND v.voucher_date <= ?
            GROUP BY {$expr}
            ORDER BY dimension_id";
    $st = $db->prepare($sql);
    $st->execute([$companyId, $from, $to]);
    $rows = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $rows[] = [
            "dimensionId" => (string)$row["dimension_id"],
            "voucherCount" => (int)$row["voucher_count"],
            "debitPaise" => (int)$row["debit_paise"],
            "creditPaise" => (int)$row["credit_paise"],
        ];
    }
    return ["source" => "posted_vouchers", "dimension" => $kind, "rows" => $rows];
}

function company_report_user_activity(PDO $db, string $companyId, string $from, string $to): array {
    $sql = "SELECT v.created_by AS user_id,
                   u.username AS username,
                   COUNT(DISTINCT v.id) AS posted_voucher_count,
                   COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) AS debit_paise
            FROM company_vouchers v
            INNER JOIN company_voucher_lines l ON l.voucher_id = v.id AND l.company_id = v.company_id
            LEFT JOIN users u ON u.id = v.created_by
            WHERE v.company_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL
              AND v.voucher_date >= ? AND v.voucher_date <= ?
            GROUP BY v.created_by, u.username
            ORDER BY posted_voucher_count DESC, v.created_by";
    $st = $db->prepare($sql);
    $st->execute([$companyId, $from, $to]);
    $rows = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $rows[] = [
            "userId" => (string)$row["user_id"],
            "username" => $row["username"],
            "postedVoucherCount" => (int)$row["posted_voucher_count"],
            "debitPaise" => (int)$row["debit_paise"],
        ];
    }
    return ["source" => "posted_vouchers", "rows" => $rows];
}
