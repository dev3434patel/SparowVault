<?php
declare(strict_types=1);

/**
 * Shared statement arithmetic + completeness checks (mirrors TS verifier).
 * Bank credits/debits are movements, not income/expense.
 */

function statement_verifier_transaction_rows(array $rows): array {
    $out = [];
    foreach ($rows as $row) {
        $non = !empty($row['nonTransaction']);
        $debit = (int)($row['debitPaise'] ?? 0);
        $credit = (int)($row['creditPaise'] ?? 0);
        if ($non) {
            continue;
        }
        if ($debit > 0 || $credit > 0) {
            $out[] = $row;
        }
    }
    return $out;
}

/**
 * @return array{status:string,openingPaise:?int,closingPaise:?int,totalDebitPaise:int,totalCreditPaise:int,issues:array<int,string>}
 */
function statement_validate_arithmetic(array $rows, ?int $openingPaise, ?int $closingPaise, string $order = 'ascending'): array {
    $issues = [];
    $txs = statement_verifier_transaction_rows($rows);
    $totalDebit = 0;
    $totalCredit = 0;
    foreach ($txs as $row) {
        $debit = (int)($row['debitPaise'] ?? 0);
        $credit = (int)($row['creditPaise'] ?? 0);
        $totalDebit += $debit;
        $totalCredit += $credit;
        $id = (string)($row['id'] ?? '?');
        if ($debit < 0 || $credit < 0) {
            $issues[] = "Row {$id}: negative debit/credit";
        }
        if ($debit > 0 && $credit > 0) {
            $issues[] = "Row {$id}: both debit and credit set";
        }
        $date = (string)($row['bookingDate'] ?? $row['date'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $issues[] = "Row {$id}: invalid booking date";
        }
    }

    $withBalances = [];
    foreach ($rows as $row) {
        if (!empty($row['nonTransaction'])) {
            continue;
        }
        if (array_key_exists('balancePaise', $row) && $row['balancePaise'] !== null) {
            $withBalances[] = $row;
        }
    }
    if (count($withBalances) >= 2) {
        $seq = $withBalances;
        if ($order === 'descending') {
            $seq = array_reverse($withBalances);
        }
        for ($i = 1; $i < count($seq); $i++) {
            $prev = $seq[$i - 1];
            $cur = $seq[$i];
            if (!empty($cur['nonTransaction'])) {
                continue;
            }
            $prevBal = (int)$prev['balancePaise'];
            $curBal = (int)$cur['balancePaise'];
            $expected = $prevBal + (int)($cur['creditPaise'] ?? 0) - (int)($cur['debitPaise'] ?? 0);
            if ($expected !== $curBal) {
                $id = (string)($cur['id'] ?? '?');
                $issues[] = "Row {$id}: running balance {$curBal} != expected {$expected}";
            }
        }
    }

    if ($openingPaise !== null && $closingPaise !== null) {
        $expectedClosing = $openingPaise + $totalCredit - $totalDebit;
        if ($expectedClosing !== $closingPaise) {
            $issues[] = "Opening + credits - debits = {$expectedClosing}, but closing is {$closingPaise}";
        }
    }

    $status = 'unknown';
    $hasMismatch = false;
    foreach ($issues as $issue) {
        if (str_contains($issue, 'running balance') || str_contains($issue, 'Opening + credits')) {
            $hasMismatch = true;
            break;
        }
    }
    if ($openingPaise === null && $closingPaise === null && count($withBalances) < 2) {
        $status = 'limited';
    } elseif ($hasMismatch) {
        $status = 'mismatched';
    } elseif ($openingPaise !== null && $closingPaise !== null) {
        $status = 'matched';
    } elseif (count($withBalances) >= 2 && !$hasMismatch) {
        $status = 'matched';
    } else {
        $status = 'limited';
    }

    return [
        'status' => $status,
        'openingPaise' => $openingPaise,
        'closingPaise' => $closingPaise,
        'totalDebitPaise' => $totalDebit,
        'totalCreditPaise' => $totalCredit,
        'issues' => $issues,
    ];
}

/**
 * @param array<string,mixed> $evidence
 * @return array{status:string,issues:array<int,string>,checks:array<string,string>}
 */
function statement_validate_completeness(array $rows, array $evidence = []): array {
    $issues = [];
    $checks = [
        'pageContinuity' => 'unavailable',
        'serialContinuity' => 'unavailable',
        'printedDebitCount' => 'unavailable',
        'printedCreditCount' => 'unavailable',
        'printedGrossDebit' => 'unavailable',
        'printedGrossCredit' => 'unavailable',
        'offsettingOmissionGuard' => 'unavailable',
    ];
    $txs = statement_verifier_transaction_rows($rows);
    $debitCount = 0;
    $creditCount = 0;
    $totalDebit = 0;
    $totalCredit = 0;
    foreach ($txs as $row) {
        $debit = (int)($row['debitPaise'] ?? 0);
        $credit = (int)($row['creditPaise'] ?? 0);
        if ($debit > 0) {
            $debitCount++;
            $totalDebit += $debit;
        }
        if ($credit > 0) {
            $creditCount++;
            $totalCredit += $credit;
        }
    }

    if (!empty($evidence['pageNumbers']) && array_key_exists('pageTotal', $evidence) && $evidence['pageTotal'] !== null) {
        $pages = array_map('intval', $evidence['pageNumbers']);
        $unique = array_values(array_unique($pages));
        sort($unique);
        $pageTotal = (int)$evidence['pageTotal'];
        $missing = [];
        for ($p = 1; $p <= $pageTotal; $p++) {
            if (!in_array($p, $unique, true)) {
                $missing[] = $p;
            }
        }
        $dupes = array_values(array_diff_assoc($pages, array_unique($pages)));
        if ($missing || $dupes || ($unique ? $unique[0] !== 1 : true) || ($unique ? end($unique) !== $pageTotal : true)) {
            $checks['pageContinuity'] = 'fail';
            if ($missing) {
                $issues[] = 'Missing pages: ' . implode(', ', $missing);
            }
            if ($dupes) {
                $issues[] = 'Duplicate pages: ' . implode(', ', array_values(array_unique($dupes)));
            }
        } else {
            $checks['pageContinuity'] = 'pass';
        }
    }

    if (array_key_exists('printedDebitCount', $evidence) && $evidence['printedDebitCount'] !== null) {
        $checks['printedDebitCount'] = ((int)$evidence['printedDebitCount'] === $debitCount) ? 'pass' : 'fail';
        if ($checks['printedDebitCount'] === 'fail') {
            $issues[] = "Printed debit count {$evidence['printedDebitCount']} != extracted {$debitCount}";
        }
    }
    if (array_key_exists('printedCreditCount', $evidence) && $evidence['printedCreditCount'] !== null) {
        $checks['printedCreditCount'] = ((int)$evidence['printedCreditCount'] === $creditCount) ? 'pass' : 'fail';
        if ($checks['printedCreditCount'] === 'fail') {
            $issues[] = "Printed credit count {$evidence['printedCreditCount']} != extracted {$creditCount}";
        }
    }
    if (array_key_exists('printedGrossDebitPaise', $evidence) && $evidence['printedGrossDebitPaise'] !== null) {
        $checks['printedGrossDebit'] = ((int)$evidence['printedGrossDebitPaise'] === $totalDebit) ? 'pass' : 'fail';
        if ($checks['printedGrossDebit'] === 'fail') {
            $issues[] = "Printed gross debit {$evidence['printedGrossDebitPaise']} != extracted {$totalDebit}";
        }
    }
    if (array_key_exists('printedGrossCreditPaise', $evidence) && $evidence['printedGrossCreditPaise'] !== null) {
        $checks['printedGrossCredit'] = ((int)$evidence['printedGrossCreditPaise'] === $totalCredit) ? 'pass' : 'fail';
        if ($checks['printedGrossCredit'] === 'fail') {
            $issues[] = "Printed gross credit {$evidence['printedGrossCreditPaise']} != extracted {$totalCredit}";
        }
    }
    if (array_key_exists('expectedTransactionCount', $evidence) && $evidence['expectedTransactionCount'] !== null) {
        $expected = (int)$evidence['expectedTransactionCount'];
        $checks['offsettingOmissionGuard'] = ($expected === count($txs)) ? 'pass' : 'fail';
        if ($checks['offsettingOmissionGuard'] === 'fail') {
            $issues[] = "Expected {$expected} transactions but extracted " . count($txs) . ' (offsetting omissions can preserve net balance)';
        }
    }

    $failed = in_array('fail', array_values($checks), true);
    $any = false;
    foreach ($checks as $c) {
        if ($c !== 'unavailable') {
            $any = true;
            break;
        }
    }
    return [
        'status' => $failed ? 'incomplete' : ($any ? 'complete' : 'unknown'),
        'issues' => $issues,
        'checks' => $checks,
    ];
}

/**
 * @return list<array<string,mixed>>
 */
function statement_report_bank_months(array $rows): array {
    $txs = statement_verifier_transaction_rows($rows);
    $byMonth = [];
    foreach ($txs as $row) {
        $date = (string)($row['bookingDate'] ?? $row['date'] ?? '');
        $month = substr($date, 0, 7);
        if (!isset($byMonth[$month])) {
            $byMonth[$month] = [];
        }
        $byMonth[$month][] = $row;
    }
    ksort($byMonth);
    $out = [];
    foreach ($byMonth as $month => $list) {
        $debitCount = 0;
        $creditCount = 0;
        $debitPaise = 0;
        $creditPaise = 0;
        $dates = [];
        foreach ($list as $row) {
            $debit = (int)($row['debitPaise'] ?? 0);
            $credit = (int)($row['creditPaise'] ?? 0);
            if ($debit > 0) {
                $debitCount++;
                $debitPaise += $debit;
            }
            if ($credit > 0) {
                $creditCount++;
                $creditPaise += $credit;
            }
            $dates[] = (string)($row['bookingDate'] ?? $row['date'] ?? '');
        }
        sort($dates);
        $out[] = [
            'month' => $month,
            'debitCount' => $debitCount,
            'creditCount' => $creditCount,
            'transactionCount' => count($list),
            'debitPaise' => $debitPaise,
            'creditPaise' => $creditPaise,
            'netPaise' => $creditPaise - $debitPaise,
            'firstDate' => $dates[0] ?? null,
            'lastDate' => $dates ? $dates[count($dates) - 1] : null,
            'coverage' => 'partial_month',
        ];
    }
    return $out;
}
