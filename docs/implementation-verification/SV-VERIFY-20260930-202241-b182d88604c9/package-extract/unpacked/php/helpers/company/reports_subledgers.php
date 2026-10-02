<?php
declare(strict_types=1);

/**
 * @return array{partyId:string,from:string,to:string,openingPaise:int,rows:list,closingPaise:int,plainLanguage:string}
 */
function company_party_statement(PDO $db, string $companyId, string $partyId, string $from, string $to): array {
    $rel = $db->prepare(
        "SELECT ledger_id FROM company_party_relationship_accounts WHERE company_id = ? AND party_id = ? AND active = 1"
    );
    $rel->execute([$companyId, $partyId]);
    $ledgerIds = [];
    while ($r = $rel->fetch(PDO::FETCH_ASSOC)) {
        $ledgerIds[] = $r["ledger_id"];
    }
    if ($ledgerIds === []) {
        return [
            "partyId" => $partyId,
            "from" => $from,
            "to" => $to,
            "openingPaise" => 0,
            "rows" => [],
            "closingPaise" => 0,
            "plainLanguage" => "No party relationship ledgers",
        ];
    }
    $in = implode(",", array_fill(0, count($ledgerIds), "?"));

    $openSql = "SELECT
                  COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) -
                  COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_paise ELSE 0 END), 0) AS bal
                FROM company_voucher_lines l
                INNER JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
                WHERE l.company_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL
                  AND v.voucher_date < ? AND l.ledger_id IN ($in)";
    $ost = $db->prepare($openSql);
    $ost->execute(array_merge([$companyId, $from], $ledgerIds));
    $opening = (int)$ost->fetchColumn();

    $sql = "SELECT v.voucher_date, v.voucher_number, v.voucher_type, v.narration, v.reference_number,
                   v.project_id, v.business_unit_id, v.area_id, v.id AS voucher_id,
                   l.side, l.amount_paise
            FROM company_voucher_lines l
            INNER JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
            WHERE l.company_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL
              AND v.voucher_date >= ? AND v.voucher_date <= ?
              AND l.ledger_id IN ($in)
            ORDER BY v.voucher_date ASC, v.voucher_number ASC, l.line_no ASC";
    $st = $db->prepare($sql);
    $st->execute(array_merge([$companyId, $from, $to], $ledgerIds));
    $running = $opening;
    $rows = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $dr = $row["side"] === "DEBIT" ? (int)$row["amount_paise"] : 0;
        $cr = $row["side"] === "CREDIT" ? (int)$row["amount_paise"] : 0;
        $running += $dr - $cr;
        $rows[] = [
            "date" => (string)$row["voucher_date"],
            "voucherNumber" => (string)$row["voucher_number"],
            "voucherType" => (string)$row["voucher_type"],
            "description" => $row["narration"],
            "debitPaise" => $dr,
            "creditPaise" => $cr,
            "runningBalancePaise" => $running,
            "reference" => $row["reference_number"],
            "projectId" => $row["project_id"],
            "businessUnitId" => $row["business_unit_id"],
            "areaId" => $row["area_id"],
            "voucherId" => (string)$row["voucher_id"],
        ];
    }
    $plain = $running > 0
        ? "Party owes company " . $running . " paise"
        : ($running < 0 ? "Company owes party " . (-$running) . " paise" : "Settled");
    return [
        "partyId" => $partyId,
        "from" => $from,
        "to" => $to,
        "openingPaise" => $opening,
        "rows" => $rows,
        "closingPaise" => $running,
        "plainLanguage" => $plain,
    ];
}

/**
 * @param 'receivable'|'payable' $side
 * @return array{side:string,asOf:string,buckets:array,rows:list}
 */
function company_ageing(PDO $db, string $companyId, string $side, string $asOf): array {
    $billSide = strtoupper($side) === "PAYABLE" ? "PAYABLE" : "RECEIVABLE";
    $st = $db->prepare(
        "SELECT b.*, p.display_name AS party_name,
                DATEDIFF(?, COALESCE(b.due_date, b.bill_date)) AS days_overdue
         FROM company_bill_refs b
         INNER JOIN company_parties p ON p.id = b.party_id AND p.company_id = b.company_id
         WHERE b.company_id = ? AND b.side = ? AND b.status IN ('OPEN','PARTIAL')
           AND b.outstanding_paise > 0 AND b.bill_date <= ?
         ORDER BY b.due_date ASC, b.bill_date ASC"
    );
    $st->execute([$asOf, $companyId, $billSide, $asOf]);
    $buckets = [
        "notDue" => 0,
        "d0_15" => 0,
        "d16_30" => 0,
        "d31_60" => 0,
        "d61_90" => 0,
        "d90plus" => 0,
    ];
    $rows = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $days = (int)$row["days_overdue"];
        $amt = (int)$row["outstanding_paise"];
        if ($days < 0) {
            $bucket = "notDue";
        } elseif ($days <= 15) {
            $bucket = "d0_15";
        } elseif ($days <= 30) {
            $bucket = "d16_30";
        } elseif ($days <= 60) {
            $bucket = "d31_60";
        } elseif ($days <= 90) {
            $bucket = "d61_90";
        } else {
            $bucket = "d90plus";
        }
        $buckets[$bucket] += $amt;
        $rows[] = [
            "billRefId" => (string)$row["id"],
            "partyId" => (string)$row["party_id"],
            "partyName" => (string)$row["party_name"],
            "refNumber" => (string)$row["ref_number"],
            "billDate" => (string)$row["bill_date"],
            "dueDate" => $row["due_date"],
            "outstandingPaise" => $amt,
            "daysOverdue" => $days,
            "bucket" => $bucket,
        ];
    }
    return [
        "side" => strtolower($billSide),
        "asOf" => $asOf,
        "buckets" => $buckets,
        "rows" => $rows,
    ];
}

/**
 * @return array{ledgerId:string,from:string,to:string,openingPaise:int,rows:list,closingPaise:int}
 */
function company_cash_bank_book(PDO $db, string $companyId, string $ledgerId, string $from, string $to): array {
    $lg = $db->prepare(
        "SELECT id, name, is_cash_bank FROM company_ledgers WHERE id = ? AND company_id = ? AND deleted_at IS NULL"
    );
    $lg->execute([$ledgerId, $companyId]);
    $ledger = $lg->fetch(PDO::FETCH_ASSOC);
    if (!$ledger || (int)$ledger["is_cash_bank"] !== 1) {
        throw new InvalidArgumentException("ledgerId must be a cash/bank ledger");
    }

    $ost = $db->prepare(
        "SELECT COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_paise ELSE 0 END), 0)
         FROM company_voucher_lines l
         INNER JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
         WHERE l.company_id = ? AND l.ledger_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL
           AND v.voucher_date < ?"
    );
    $ost->execute([$companyId, $ledgerId, $from]);
    $opening = (int)$ost->fetchColumn();

    $st = $db->prepare(
        "SELECT v.voucher_date, v.voucher_number, v.voucher_type, v.narration, l.side, l.amount_paise, v.id AS voucher_id
         FROM company_voucher_lines l
         INNER JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
         WHERE l.company_id = ? AND l.ledger_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL
           AND v.voucher_date >= ? AND v.voucher_date <= ?
         ORDER BY v.voucher_date ASC, v.voucher_number ASC, l.line_no ASC"
    );
    $st->execute([$companyId, $ledgerId, $from, $to]);
    $running = $opening;
    $rows = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $dr = $row["side"] === "DEBIT" ? (int)$row["amount_paise"] : 0;
        $cr = $row["side"] === "CREDIT" ? (int)$row["amount_paise"] : 0;
        $running += $dr - $cr;
        $rows[] = [
            "date" => (string)$row["voucher_date"],
            "voucherNumber" => (string)$row["voucher_number"],
            "voucherType" => (string)$row["voucher_type"],
            "particulars" => $row["narration"],
            "debitPaise" => $dr,
            "creditPaise" => $cr,
            "balancePaise" => $running,
            "voucherId" => (string)$row["voucher_id"],
        ];
    }
    return [
        "ledgerId" => $ledgerId,
        "ledgerName" => (string)$ledger["name"],
        "from" => $from,
        "to" => $to,
        "openingPaise" => $opening,
        "rows" => $rows,
        "closingPaise" => $running,
    ];
}
