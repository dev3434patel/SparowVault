<?php
declare(strict_types=1);


/**
 * @return list<array{ledgerId:string,ledgerCode:string,ledgerName:string,nature:string,debitPaise:int,creditPaise:int,closingDebitPaise:int,closingCreditPaise:int}>
 */
function company_trial_balance(PDO $db, string $companyId, string $asOfDate, ?string $fromDate = null): array {
    // Two-step aggregate keeps MariaDB on company-scoped indexes (avoids nested derived thrash at ≥300k rows).
    $aggSql = "SELECT l.ledger_id,
                      COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) AS debit_paise,
                      COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_paise ELSE 0 END), 0) AS credit_paise
               FROM company_vouchers v
               INNER JOIN company_voucher_lines l ON l.voucher_id = v.id AND l.company_id = v.company_id
               WHERE v.company_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL
                 AND v.voucher_date <= ?" .
                 ($fromDate ? " AND v.voucher_date >= ?" : "") . "
               GROUP BY l.ledger_id";
    $aggParams = [$companyId, $asOfDate];
    if ($fromDate !== null && $fromDate !== "") {
        $aggParams[] = $fromDate;
    }
    $aggSt = $db->prepare($aggSql);
    $aggSt->execute($aggParams);
    $byLedger = [];
    while ($row = $aggSt->fetch(PDO::FETCH_ASSOC)) {
        $byLedger[(string)$row["ledger_id"]] = [
            "debit_paise" => (int)$row["debit_paise"],
            "credit_paise" => (int)$row["credit_paise"],
        ];
    }

    $st = $db->prepare(
        "SELECT lg.id AS ledger_id, lg.code AS ledger_code, lg.name AS ledger_name, g.nature
         FROM company_ledgers lg
         INNER JOIN company_account_groups g ON g.id = lg.group_id AND g.company_id = lg.company_id
         WHERE lg.company_id = ? AND lg.deleted_at IS NULL
         ORDER BY g.nature, lg.code"
    );
    $st->execute([$companyId]);
    $out = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $id = (string)$row["ledger_id"];
        $dr = $byLedger[$id]["debit_paise"] ?? 0;
        $cr = $byLedger[$id]["credit_paise"] ?? 0;
        if ($dr === 0 && $cr === 0) {
            continue;
        }
        $net = $dr - $cr;
        $out[] = [
            "ledgerId" => $id,
            "ledgerCode" => (string)$row["ledger_code"],
            "ledgerName" => (string)$row["ledger_name"],
            "nature" => (string)$row["nature"],
            "debitPaise" => $dr,
            "creditPaise" => $cr,
            "closingDebitPaise" => $net > 0 ? $net : 0,
            "closingCreditPaise" => $net < 0 ? -$net : 0,
        ];
    }
    return $out;
}

/**
 * @return array{from:string,to:string,income:list,expense:list,totalIncomePaise:int,totalExpensePaise:int,netProfitPaise:int}
 */
function company_profit_loss(PDO $db, string $companyId, string $from, string $to): array {
    $sql = "SELECT lg.id AS ledger_id, lg.code, lg.name, g.nature,
                   COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_paise ELSE 0 END), 0) AS credit_paise,
                   COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) AS debit_paise
            FROM company_ledgers lg
            INNER JOIN company_account_groups g ON g.id = lg.group_id AND g.company_id = lg.company_id
            INNER JOIN company_voucher_lines l ON l.ledger_id = lg.id AND l.company_id = lg.company_id
            INNER JOIN company_vouchers v ON v.id = l.voucher_id AND v.company_id = l.company_id
            WHERE lg.company_id = ? AND g.nature IN ('INCOME','EXPENSE')
              AND v.status = 'POSTED' AND v.deleted_at IS NULL
              AND v.voucher_date >= ? AND v.voucher_date <= ?
              AND lg.deleted_at IS NULL
            GROUP BY lg.id, lg.code, lg.name, g.nature
            ORDER BY g.nature, lg.code";
    $st = $db->prepare($sql);
    $st->execute([$companyId, $from, $to]);
    $income = [];
    $expense = [];
    $totalIncome = 0;
    $totalExpense = 0;
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        if ($row["nature"] === "INCOME") {
            $amt = (int)$row["credit_paise"] - (int)$row["debit_paise"];
            $income[] = [
                "ledgerId" => (string)$row["ledger_id"],
                "ledgerCode" => (string)$row["code"],
                "ledgerName" => (string)$row["name"],
                "amountPaise" => $amt,
            ];
            $totalIncome += $amt;
        } else {
            $amt = (int)$row["debit_paise"] - (int)$row["credit_paise"];
            $expense[] = [
                "ledgerId" => (string)$row["ledger_id"],
                "ledgerCode" => (string)$row["code"],
                "ledgerName" => (string)$row["name"],
                "amountPaise" => $amt,
            ];
            $totalExpense += $amt;
        }
    }
    return [
        "from" => $from,
        "to" => $to,
        "income" => $income,
        "expense" => $expense,
        "totalIncomePaise" => $totalIncome,
        "totalExpensePaise" => $totalExpense,
        "netProfitPaise" => $totalIncome - $totalExpense,
    ];
}

/**
 * @return array{asOf:string,assets:list,liabilities:list,equity:list,totalAssetsPaise:int,totalLiabilitiesPaise:int,totalEquityPaise:int,balanced:bool}
 */
function company_balance_sheet(PDO $db, string $companyId, string $asOf): array {
    $tb = company_trial_balance($db, $companyId, $asOf, null);
    $assets = [];
    $liabilities = [];
    $equity = [];
    $totalA = 0;
    $totalL = 0;
    $totalE = 0;
    foreach ($tb as $row) {
        $nature = $row["nature"];
        if ($nature === "INCOME" || $nature === "EXPENSE") {
            continue;
        }
        $entry = [
            "ledgerId" => $row["ledgerId"],
            "ledgerCode" => $row["ledgerCode"],
            "ledgerName" => $row["ledgerName"],
            "amountPaise" => 0,
        ];
        if ($nature === "ASSET") {
            $entry["amountPaise"] = $row["closingDebitPaise"] - $row["closingCreditPaise"];
            $assets[] = $entry;
            $totalA += $entry["amountPaise"];
        } elseif ($nature === "LIABILITY") {
            $entry["amountPaise"] = $row["closingCreditPaise"] - $row["closingDebitPaise"];
            $liabilities[] = $entry;
            $totalL += $entry["amountPaise"];
        } elseif ($nature === "EQUITY") {
            $entry["amountPaise"] = $row["closingCreditPaise"] - $row["closingDebitPaise"];
            $equity[] = $entry;
            $totalE += $entry["amountPaise"];
        }
    }
    $pnl = company_profit_loss($db, $companyId, "1900-01-01", $asOf);
    $profit = (int)$pnl["netProfitPaise"];
    if ($profit !== 0) {
        $equity[] = [
            "ledgerId" => "",
            "ledgerCode" => "CURRENT_PL",
            "ledgerName" => "Current Period Profit/(Loss)",
            "amountPaise" => $profit,
        ];
        $totalE += $profit;
    }
    return [
        "asOf" => $asOf,
        "assets" => $assets,
        "liabilities" => $liabilities,
        "equity" => $equity,
        "totalAssetsPaise" => $totalA,
        "totalLiabilitiesPaise" => $totalL,
        "totalEquityPaise" => $totalE,
        "balanced" => $totalA === ($totalL + $totalE),
    ];
}

/**
 * @param array{partyId?:string,voucherType?:string,search?:string} $filters
 * @return list<array>
 */
function company_day_book(PDO $db, string $companyId, string $from, string $to, array $filters = []): array {
    $limit = isset($filters["limit"]) ? (int)$filters["limit"] : 0;
    $params = [$companyId, $from, $to];
    $where = "v.company_id = ? AND v.status = 'POSTED' AND v.deleted_at IS NULL
              AND v.voucher_date >= ? AND v.voucher_date <= ?";
    if (!empty($filters["partyId"])) {
        $where .= " AND v.party_id = ?";
        $params[] = $filters["partyId"];
    }
    if (!empty($filters["voucherType"])) {
        $where .= " AND v.voucher_type = ?";
        $params[] = strtoupper((string)$filters["voucherType"]);
    }
    if (!empty($filters["search"])) {
        $where .= " AND (v.narration LIKE ? OR v.voucher_number LIKE ? OR v.reference_number LIKE ?)";
        $q = "%" . $filters["search"] . "%";
        $params[] = $q;
        $params[] = $q;
        $params[] = $q;
    }

    // Paginated list path: constrain voucher ids first (index-friendly), then aggregate lines.
    if ($limit > 0) {
        $idSql = "SELECT v.id FROM company_vouchers v WHERE $where
                  ORDER BY v.voucher_date ASC, v.voucher_number ASC LIMIT " . (int)$limit;
        $idSt = $db->prepare($idSql);
        $idSt->execute($params);
        $ids = $idSt->fetchAll(PDO::FETCH_COLUMN);
        if ($ids === []) {
            return [];
        }
        $in = implode(",", array_fill(0, count($ids), "?"));
        $sql = "SELECT v.*,
                       COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) AS debit_total_paise,
                       COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_paise ELSE 0 END), 0) AS credit_total_paise
                FROM company_vouchers v
                LEFT JOIN company_voucher_lines l ON l.voucher_id = v.id AND l.company_id = v.company_id
                WHERE v.company_id = ? AND v.id IN ($in)
                GROUP BY v.id
                ORDER BY v.voucher_date ASC, v.voucher_number ASC";
        $st = $db->prepare($sql);
        $st->execute(array_merge([$companyId], $ids));
    } else {
        $sql = "SELECT v.*,
                       COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_paise ELSE 0 END), 0) AS debit_total_paise,
                       COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_paise ELSE 0 END), 0) AS credit_total_paise
                FROM company_vouchers v
                LEFT JOIN company_voucher_lines l ON l.voucher_id = v.id AND l.company_id = v.company_id
                WHERE $where
                GROUP BY v.id ORDER BY v.voucher_date ASC, v.voucher_number ASC";
        $st = $db->prepare($sql);
        $st->execute($params);
    }
    $out = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $out[] = [
            "id" => (string)$row["id"],
            "voucherNumber" => (string)$row["voucher_number"],
            "voucherType" => (string)$row["voucher_type"],
            "voucherDate" => (string)$row["voucher_date"],
            "partyId" => $row["party_id"],
            "narration" => $row["narration"],
            "referenceNumber" => $row["reference_number"],
            "debitTotalPaise" => (int)$row["debit_total_paise"],
            "creditTotalPaise" => (int)$row["credit_total_paise"],
            "amountPaise" => (int)$row["debit_total_paise"],
        ];
    }
    return $out;
}
