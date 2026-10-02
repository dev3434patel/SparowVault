<?php
declare(strict_types=1);

function company_load_voucher_with_lines(PDO $db, string $companyId, string $voucherId): ?array {
    $st = $db->prepare("SELECT * FROM company_vouchers WHERE id = ? AND company_id = ? AND deleted_at IS NULL");
    $st->execute([$voucherId, $companyId]);
    $voucher = $st->fetch(PDO::FETCH_ASSOC);
    if (!$voucher) {
        return null;
    }
    $ls = $db->prepare(
        "SELECT * FROM company_voucher_lines WHERE voucher_id = ? AND company_id = ? ORDER BY line_no ASC"
    );
    $ls->execute([$voucherId, $companyId]);
    $voucher["lines"] = $ls->fetchAll(PDO::FETCH_ASSOC);
    return $voucher;
}

/** @return array{billAllocations?:list<array>} */
function company_parse_voucher_intent(?string $narration): array {
    if ($narration === null || $narration === "") {
        return [];
    }
    $marker = "__INTENT__:";
    $pos = strrpos($narration, $marker);
    if ($pos === false) {
        return [];
    }
    $json = substr($narration, $pos + strlen($marker));
    try {
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        return is_array($data) ? $data : [];
    } catch (Throwable $e) {
        return [];
    }
}

function company_encode_voucher_intent(?string $userNarration, array $intent): string {
    $intentJson = json_encode($intent, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    $suffix = "\n__INTENT__:" . $intentJson;
    $max = 1024;
    $budget = $max - strlen($suffix);
    $base = trim((string)($userNarration ?? ""));
    if ($budget < 0) {
        return substr("__INTENT__:" . $intentJson, 0, $max);
    }
    if (strlen($base) > $budget) {
        $base = substr($base, 0, $budget);
    }
    return $base === "" ? ltrim($suffix) : ($base . $suffix);
}

/**
 * Apply bill allocations inside an open transaction.
 * ON_ACCOUNT / ADVANCE allow bill_ref_id NULL. Never silent-skips.
 */
function company_apply_bill_allocations_tx(
    PDO $db,
    string $companyId,
    string $voucherId,
    ?string $partyId,
    string $voucherDate,
    string $voucherNumber,
    string $voucherType,
    array $billAllocations
): void {
    foreach ($billAllocations as $ba) {
        if (!is_array($ba)) {
            throw new CompanyPostingException("Invalid bill allocation entry", 422, "INVALID_BILL_ALLOCATION");
        }
        $allocType = strtoupper((string)($ba["allocationType"] ?? ""));
        if ($allocType === "") {
            throw new CompanyPostingException("allocationType required", 422, "INVALID_BILL_ALLOCATION");
        }
        if ($allocType === "ADVANCE") {
            $allocType = "ON_ACCOUNT";
        }
        $amount = (int)($ba["amountPaise"] ?? 0);
        if ($amount <= 0) {
            throw new CompanyPostingException("bill allocation amountPaise must be > 0", 422, "INVALID_BILL_ALLOCATION");
        }

        $billRefId = $ba["billRefId"] ?? $ba["bill_ref_id"] ?? null;
        if ($billRefId === "") {
            $billRefId = null;
        }

        if ($allocType === "NEW_REFERENCE") {
            if ($partyId === null || $partyId === "") {
                throw new CompanyPostingException("partyId required for NEW_REFERENCE", 422, "INVALID_BILL_ALLOCATION");
            }
            $billRefId = company_new_id();
            $side = strtoupper((string)($ba["side"] ?? ($voucherType === "RECEIPT" || $voucherType === "SALE" ? "RECEIVABLE" : "PAYABLE")));
            if (!in_array($side, ["RECEIVABLE", "PAYABLE"], true)) {
                throw new CompanyPostingException("Invalid bill side", 422, "INVALID_BILL_ALLOCATION");
            }
            $db->prepare(
                "INSERT INTO company_bill_refs (
                    id, company_id, party_id, ref_type, ref_number, bill_date, due_date,
                    original_amount_paise, outstanding_paise, side, status, source_voucher_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
            )->execute([
                $billRefId,
                $companyId,
                $partyId,
                $ba["refType"] ?? "BILL",
                (string)($ba["refNumber"] ?? $voucherNumber),
                $voucherDate,
                $ba["dueDate"] ?? null,
                $amount,
                $amount,
                $side,
                $voucherId,
            ]);
        } elseif ($allocType === "AGAINST_REFERENCE") {
            if ($billRefId === null) {
                throw new CompanyPostingException("billRefId required for AGAINST_REFERENCE", 422, "INVALID_BILL_ALLOCATION");
            }
            $br = $db->prepare("SELECT * FROM company_bill_refs WHERE id = ? AND company_id = ? FOR UPDATE");
            $br->execute([(string)$billRefId, $companyId]);
            $bill = $br->fetch(PDO::FETCH_ASSOC);
            if (!$bill) {
                throw new CompanyPostingException("Bill ref not found", 404, "BILL_NOT_FOUND");
            }
            if ($amount > (int)$bill["outstanding_paise"]) {
                throw new CompanyPostingException("Allocation exceeds outstanding", 422, "BILL_OVERALLOCATED");
            }
            $newOut = (int)$bill["outstanding_paise"] - $amount;
            $db->prepare(
                "UPDATE company_bill_refs SET outstanding_paise = ?, status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ? AND company_id = ?"
            )->execute([$newOut, $newOut === 0 ? "SETTLED" : "PARTIAL", $billRefId, $companyId]);
        } elseif ($allocType === "ON_ACCOUNT") {
            // Persist allocation with nullable bill_ref_id; do not invent a bill.
            $billRefId = $billRefId; // may be null
        } else {
            throw new CompanyPostingException("Unknown allocationType: " . $allocType, 422, "INVALID_BILL_ALLOCATION");
        }

        $db->prepare(
            "INSERT INTO company_bill_allocations (
                id, company_id, bill_ref_id, voucher_id, voucher_line_id, amount_paise, allocation_type, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())"
        )->execute([
            company_new_id(),
            $companyId,
            $billRefId,
            $voucherId,
            $ba["voucherLineId"] ?? $ba["voucher_line_id"] ?? null,
            $amount,
            $allocType,
        ]);
    }
}

/**
 * Unwind bill allocations for a reversed voucher (inside open transaction).
 */
function company_unwind_bill_allocations_tx(PDO $db, string $companyId, string $voucherId): void {
    $allocs = $db->prepare(
        "SELECT * FROM company_bill_allocations WHERE company_id = ? AND voucher_id = ?"
    );
    $allocs->execute([$companyId, $voucherId]);
    while ($a = $allocs->fetch(PDO::FETCH_ASSOC)) {
        $type = strtoupper((string)$a["allocation_type"]);
        $amount = (int)$a["amount_paise"];
        $billRefId = $a["bill_ref_id"] !== null ? (string)$a["bill_ref_id"] : null;

        if ($type === "AGAINST_REFERENCE" && $billRefId !== null) {
            $br = $db->prepare("SELECT * FROM company_bill_refs WHERE id = ? AND company_id = ? FOR UPDATE");
            $br->execute([$billRefId, $companyId]);
            $bill = $br->fetch(PDO::FETCH_ASSOC);
            if ($bill) {
                $newOut = (int)$bill["outstanding_paise"] + $amount;
                $status = $newOut >= (int)$bill["original_amount_paise"] ? "OPEN" : "PARTIAL";
                $db->prepare(
                    "UPDATE company_bill_refs
                     SET outstanding_paise = ?, status = ?, updated_at = UTC_TIMESTAMP()
                     WHERE id = ? AND company_id = ?"
                )->execute([$newOut, $status, $billRefId, $companyId]);
            }
        } elseif ($type === "NEW_REFERENCE" && $billRefId !== null) {
            $db->prepare(
                "UPDATE company_bill_refs
                 SET status = 'CANCELLED', outstanding_paise = 0, updated_at = UTC_TIMESTAMP()
                 WHERE id = ? AND company_id = ?"
            )->execute([$billRefId, $companyId]);
        }
        // ON_ACCOUNT / ADVANCE: no-op on bill_refs
    }
}

/**
 * Named post-side-effect hook for POSTED vouchers (bill allocations today; extend later).
 */
function company_apply_posted_side_effects_tx(
    PDO $db,
    string $companyId,
    string $voucherId,
    ?string $partyId,
    string $voucherType,
    string $voucherDate,
    string $voucherNumber,
    array $billAllocations
): void {
    if ($billAllocations !== []) {
        company_apply_bill_allocations_tx(
            $db,
            $companyId,
            $voucherId,
            $partyId,
            $voucherDate,
            $voucherNumber,
            $voucherType,
            $billAllocations
        );
    }
}

/**
 * Allocate prior ON_ACCOUNT capacity against an open bill via a net-zero JOURNAL vehicle.
 */
function company_allocate_on_account_to_bill(
    PDO $db,
    string $companyId,
    string $userId,
    string $partyId,
    string $billRefId,
    int $amountPaise,
    string $mutationId
): array {
    if ($amountPaise <= 0) {
        throw new CompanyPostingException("amountPaise must be positive", 422, "VALIDATION_ERROR");
    }
    if ($mutationId === "" || !preg_match('/^[A-Za-z0-9_:.-]{1,128}$/D', $mutationId)) {
        throw new CompanyPostingException("Invalid mutationId", 422, "VALIDATION_ERROR");
    }

    company_require_permission($db, $userId, $companyId, "post_voucher");

    $db->beginTransaction();
    try {
        $br = $db->prepare("SELECT * FROM company_bill_refs WHERE id = ? AND company_id = ? FOR UPDATE");
        $br->execute([$billRefId, $companyId]);
        $bill = $br->fetch(PDO::FETCH_ASSOC);
        if (!$bill) {
            throw new CompanyPostingException("Bill ref not found", 404, "BILL_NOT_FOUND");
        }
        if ((string)$bill["party_id"] !== $partyId) {
            throw new CompanyPostingException("Bill does not belong to party", 422, "VALIDATION_ERROR");
        }
        if ($amountPaise > (int)$bill["outstanding_paise"]) {
            throw new CompanyPostingException("Allocation exceeds outstanding", 422, "BILL_OVERALLOCATED");
        }

        $onAccountSt = $db->prepare(
            "SELECT COALESCE(SUM(a.amount_paise), 0) AS total
             FROM company_bill_allocations a
             INNER JOIN company_vouchers v ON v.id = a.voucher_id AND v.company_id = a.company_id
             WHERE a.company_id = ? AND v.party_id = ? AND a.allocation_type = 'ON_ACCOUNT'
               AND v.status = 'POSTED' AND v.deleted_at IS NULL"
        );
        $onAccountSt->execute([$companyId, $partyId]);
        $onAccountTotal = (int)$onAccountSt->fetchColumn();

        $appliedSt = $db->prepare(
            "SELECT COALESCE(SUM(a.amount_paise), 0) AS total
             FROM company_bill_allocations a
             INNER JOIN company_vouchers v ON v.id = a.voucher_id AND v.company_id = a.company_id
             WHERE a.company_id = ? AND v.party_id = ? AND a.allocation_type = 'AGAINST_REFERENCE'
               AND v.voucher_type = 'JOURNAL' AND v.narration LIKE 'Allocate on-account%'
               AND v.status = 'POSTED' AND v.deleted_at IS NULL"
        );
        $appliedSt->execute([$companyId, $partyId]);
        $appliedTotal = (int)$appliedSt->fetchColumn();
        $available = $onAccountTotal - $appliedTotal;
        if ($available < $amountPaise) {
            throw new CompanyPostingException(
                "Insufficient on-account balance (available " . $available . " paise)",
                422,
                "ON_ACCOUNT_INSUFFICIENT"
            );
        }

        $side = strtoupper((string)$bill["side"]);
        $controlCode = $side === "RECEIVABLE" ? "AR_CONTROL" : "AP_CONTROL";
        $controlId = company_ledger_id_by_code($db, $companyId, $controlCode);
        if ($controlId === null || $controlId === "") {
            throw new CompanyPostingException("Control ledger missing: " . $controlCode, 500, "COA_INCOMPLETE");
        }

        $voucherDate = gmdate("Y-m-d");
        $payload = [
            "mutationId" => $mutationId,
            "voucherType" => "JOURNAL",
            "voucherDate" => $voucherDate,
            "partyId" => $partyId,
            "narration" => "Allocate on-account to bill " . (string)$bill["ref_number"],
            "status" => "POSTED",
            "lines" => [
                ["ledgerId" => $controlId, "side" => "DEBIT", "amountPaise" => $amountPaise],
                ["ledgerId" => $controlId, "side" => "CREDIT", "amountPaise" => $amountPaise],
            ],
            "billAllocations" => [
                [
                    "allocationType" => "AGAINST_REFERENCE",
                    "billRefId" => $billRefId,
                    "amountPaise" => $amountPaise,
                ],
            ],
        ];

        $result = company_post_voucher($db, $companyId, $userId, $payload, false);
        $db->commit();
        return $result;
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}
