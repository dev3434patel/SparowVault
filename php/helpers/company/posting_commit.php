<?php
declare(strict_types=1);

/**
 * Core double-entry poster with idempotency, period lock, balance check, audit + receipt.
 *
 * @param bool $manageTransaction When false, caller owns begin/commit (used by reverse).
 */
function company_post_voucher(
    PDO $db,
    string $companyId,
    string $userId,
    array $payload,
    bool $manageTransaction = true
): array {
    $mutationId = (string)($payload["mutationId"] ?? "");
    if ($mutationId === "" || !preg_match('/^[A-Za-z0-9_:.-]{1,128}$/D', $mutationId)) {
        throw new CompanyPostingException("Invalid mutationId", 422, "VALIDATION_ERROR");
    }
    $hash = company_request_hash(array_merge($payload, ["companyId" => $companyId]));

    $voucherType = strtoupper((string)($payload["voucherType"] ?? ""));
    $purposeKey = isset($payload["purpose"]) ? strtoupper(trim((string)$payload["purpose"])) : "";
    if ($voucherType === "" && $purposeKey !== "") {
        $inferred = company_purpose_voucher_type($purposeKey);
        if ($inferred === null || $inferred === "") {
            throw new CompanyPostingException("Unknown purpose: " . $purposeKey);
        }
        $voucherType = strtoupper($inferred);
    }
    if ($voucherType === "") {
        throw new CompanyPostingException("voucherType required");
    }

    $memSt = $db->prepare(
        "SELECT id FROM company_memberships WHERE company_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1"
    );
    $memSt->execute([$companyId, $userId]);
    if (!$memSt->fetch()) {
        throw new CompanyPostingException("Company membership required", 403, "COMPANY_FORBIDDEN");
    }
    if ($purposeKey !== "") {
        company_assert_purpose_not_deprecated($purposeKey);
    }
    company_assert_can_create_voucher($db, $userId, $companyId, $voucherType);
    $perms = company_user_permissions($db, $userId, $companyId);
    $canPost = in_array("post_voucher", $perms, true);

    if ($manageTransaction) {
        $db->beginTransaction();
    }
    try {
        $lock = $db->prepare("SELECT id FROM company_workspaces WHERE id = ? FOR UPDATE");
        $lock->execute([$companyId]);
        if (!$lock->fetch()) {
            throw new CompanyPostingException("Company not found", 404, "NOT_FOUND");
        }

        $receipt = $db->prepare(
            "SELECT request_hash, response_json FROM company_financial_write_receipts
             WHERE company_id = ? AND mutation_id = ?"
        );
        $receipt->execute([$companyId, $mutationId]);
        if ($found = $receipt->fetch(PDO::FETCH_ASSOC)) {
            if (!hash_equals((string)$found["request_hash"], $hash)) {
                throw new CompanyPostingException("Mutation key was already used for a different request", 409, "IDEMPOTENCY_CONFLICT");
            }
            if ($manageTransaction) {
                $db->commit();
            }
            return json_decode((string)$found["response_json"], true, 512, JSON_THROW_ON_ERROR);
        }

        $voucherDate = (string)($payload["voucherDate"] ?? "");
        $parsed = DateTimeImmutable::createFromFormat("!Y-m-d", $voucherDate);
        if (!$parsed || $parsed->format("Y-m-d") !== $voucherDate) {
            throw new CompanyPostingException("Invalid voucherDate");
        }
        if (company_period_is_locked($db, $companyId, $voucherDate)) {
            throw new CompanyPostingException("Period is locked for this date", 423, "PERIOD_LOCKED");
        }

        $lines = $payload["lines"] ?? null;
        $usedPurposePath = false;
        $counterLedgerId = isset($payload["counterLedgerId"]) && $payload["counterLedgerId"] !== "" && $payload["counterLedgerId"] !== null
            ? (string)$payload["counterLedgerId"] : null;
        $partyId = isset($payload["partyId"]) && $payload["partyId"] !== "" && $payload["partyId"] !== null
            ? (string)$payload["partyId"] : null;

        if ((!is_array($lines) || $lines === []) && $purposeKey !== "" && isset($payload["cashBankLedgerId"], $payload["amountPaise"])) {
            $lines = company_preview_purpose(
                $db,
                $companyId,
                $purposeKey,
                (int)$payload["amountPaise"],
                $partyId,
                (string)$payload["cashBankLedgerId"],
                $counterLedgerId
            );
            $usedPurposePath = true;
        }
        if (!is_array($lines) || count($lines) < 2) {
            throw new CompanyPostingException("At least two voucher lines required");
        }

        if ($usedPurposePath && !empty($payload["previewHash"])) {
            $previewContext = company_preview_hash_context(
                $purposeKey,
                (int)$payload["amountPaise"],
                $partyId,
                (string)$payload["cashBankLedgerId"],
                $counterLedgerId
            );
            $enriched = company_enrich_preview_lines($db, $companyId, $lines, $previewContext);
            if (!hash_equals((string)$enriched["previewHash"], (string)$payload["previewHash"])) {
                throw new CompanyPostingException("Preview is stale; re-preview before posting", 409, "PREVIEW_STALE");
            }
        }

        $debit = 0;
        $credit = 0;
        $normalized = [];
        $lineNo = 0;
        foreach ($lines as $line) {
            if (!is_array($line)) {
                throw new CompanyPostingException("Invalid line");
            }
            $ledgerId = (string)($line["ledgerId"] ?? $line["ledger_id"] ?? "");
            $side = strtoupper((string)($line["side"] ?? ""));
            $amount = (int)($line["amountPaise"] ?? $line["amount_paise"] ?? 0);
            if ($ledgerId === "" || !in_array($side, ["DEBIT", "CREDIT"], true) || $amount <= 0) {
                throw new CompanyPostingException("Each line needs ledgerId, side DEBIT|CREDIT, amountPaise > 0");
            }
            $ls = $db->prepare(
                "SELECT id, is_cash_bank, active FROM company_ledgers
                 WHERE id = ? AND company_id = ? AND deleted_at IS NULL"
            );
            $ls->execute([$ledgerId, $companyId]);
            $ledger = $ls->fetch(PDO::FETCH_ASSOC);
            if (!$ledger || (int)$ledger["active"] !== 1) {
                throw new CompanyPostingException("Ledger not found or inactive", 404, "LEDGER_NOT_FOUND");
            }
            if ($side === "DEBIT") {
                $debit += $amount;
            } else {
                $credit += $amount;
            }
            $lineNo++;
            $dims = is_array($payload["dimensions"] ?? null) ? $payload["dimensions"] : [];
            $normalized[] = [
                "line_no" => $lineNo,
                "ledger_id" => $ledgerId,
                "side" => $side,
                "amount_paise" => $amount,
                "party_relationship_id" => $line["partyRelationshipId"] ?? $line["party_relationship_id"] ?? null,
                "cost_centre_id" => $line["costCentreId"] ?? $dims["costCentreId"] ?? null,
                "project_id" => $line["projectId"] ?? $dims["projectId"] ?? null,
                "area_id" => $line["areaId"] ?? $dims["areaId"] ?? null,
                "narration" => $line["narration"] ?? null,
                "is_cash_bank" => (int)$ledger["is_cash_bank"] === 1,
            ];
        }
        if ($debit !== $credit) {
            throw new CompanyPostingException("Sum debit must equal sum credit (exact paise)", 422, "UNBALANCED_VOUCHER");
        }

        $isReversal = !empty($payload["isReversal"]);
        $cashDebit = 0;
        $cashCredit = 0;
        foreach ($normalized as $n) {
            if (!$n["is_cash_bank"]) {
                continue;
            }
            if ($n["side"] === "DEBIT") {
                $cashDebit += $n["amount_paise"];
            } else {
                $cashCredit += $n["amount_paise"];
            }
        }
        if (!$isReversal) {
            if ($voucherType === "RECEIPT" && $cashDebit <= 0) {
                throw new CompanyPostingException("RECEIPT requires Cash/Bank debit");
            }
            if ($voucherType === "PAYMENT" && $cashCredit <= 0) {
                throw new CompanyPostingException("PAYMENT requires Cash/Bank credit");
            }
            if ($voucherType === "CONTRA") {
                foreach ($normalized as $n) {
                    if (!$n["is_cash_bank"]) {
                        throw new CompanyPostingException("CONTRA lines must be Cash/Bank only");
                    }
                }
            }
        }

        if ($partyId !== null) {
            $ps = $db->prepare("SELECT id FROM company_parties WHERE id = ? AND company_id = ? AND deleted_at IS NULL");
            $ps->execute([$partyId, $companyId]);
            if (!$ps->fetch()) {
                throw new CompanyPostingException("Party not found", 404, "PARTY_NOT_FOUND");
            }
        }

        $forceStatus = isset($payload["status"]) ? strtoupper((string)$payload["status"]) : null;
        $status = "POSTED";
        if ($forceStatus === "DRAFT") {
            $status = "DRAFT";
        } elseif ($forceStatus === "PENDING_APPROVAL" || !$canPost) {
            $status = "PENDING_APPROVAL";
        }
        $threshold = (int)($payload["approvalThresholdPaise"] ?? 0);
        if ($status === "POSTED" && $threshold > 0 && $debit >= $threshold && !in_array("approve_voucher", $perms, true)) {
            $status = "PENDING_APPROVAL";
        }

        $billAllocations = $payload["billAllocations"] ?? [];
        if (!is_array($billAllocations)) {
            throw new CompanyPostingException("billAllocations must be an array", 422, "INVALID_BILL_ALLOCATION");
        }

        $narration = isset($payload["narration"]) ? (string)$payload["narration"] : null;
        if ($status === "PENDING_APPROVAL" && $billAllocations !== []) {
            $narration = company_encode_voucher_intent($narration, ["billAllocations" => $billAllocations]);
        }

        $dims = is_array($payload["dimensions"] ?? null) ? $payload["dimensions"] : [];
        $voucherId = company_new_id();
        $voucherNumber = company_next_voucher_number($db, $companyId, $voucherType, $voucherDate);
        $correctionOf = $payload["correctionOfVoucherId"] ?? $payload["correction_of_voucher_id"] ?? null;
        if ($correctionOf === "") {
            $correctionOf = null;
        }

        $db->prepare(
            "INSERT INTO company_vouchers (
                id, company_id, voucher_number, voucher_type, voucher_date, effective_date,
                party_id, business_unit_id, branch_id, area_id, project_id, cost_centre_id,
                purpose, narration, reference_number, external_reference, status,
                created_by, mutation_id, correction_of_voucher_id, posted_at, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP()
            )"
        )->execute([
            $voucherId,
            $companyId,
            $voucherNumber,
            $voucherType,
            $voucherDate,
            $payload["effectiveDate"] ?? $voucherDate,
            $partyId,
            $dims["businessUnitId"] ?? ($payload["businessUnitId"] ?? null),
            $dims["branchId"] ?? ($payload["branchId"] ?? null),
            $dims["areaId"] ?? ($payload["areaId"] ?? null),
            $dims["projectId"] ?? ($payload["projectId"] ?? null),
            $dims["costCentreId"] ?? ($payload["costCentreId"] ?? null),
            $purposeKey !== "" ? $purposeKey : null,
            $narration,
            $payload["referenceNumber"] ?? null,
            $payload["externalReference"] ?? null,
            $status,
            $userId,
            $mutationId,
            $correctionOf,
            $status === "POSTED" ? gmdate("Y-m-d H:i:s") : null,
        ]);

        $lineIns = $db->prepare(
            "INSERT INTO company_voucher_lines (
                id, company_id, voucher_id, line_no, ledger_id, side, amount_paise,
                party_relationship_id, cost_centre_id, project_id, area_id, narration, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())"
        );
        foreach ($normalized as $n) {
            $lineIns->execute([
                company_new_id(),
                $companyId,
                $voucherId,
                $n["line_no"],
                $n["ledger_id"],
                $n["side"],
                $n["amount_paise"],
                $n["party_relationship_id"],
                $n["cost_centre_id"],
                $n["project_id"],
                $n["area_id"],
                $n["narration"],
            ]);
        }

        if ($status === "POSTED") {
            company_apply_posted_side_effects_tx(
                $db,
                $companyId,
                $voucherId,
                $partyId,
                $voucherType,
                $voucherDate,
                $voucherNumber,
                $billAllocations
            );
        }

        if ($status === "PENDING_APPROVAL") {
            $db->prepare(
                "INSERT INTO company_approvals (id, company_id, voucher_id, status, requested_by, created_at, updated_at)
                 VALUES (?, ?, ?, 'PENDING', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
            )->execute([company_new_id(), $companyId, $voucherId, $userId]);
        }

        $result = company_load_voucher_with_lines($db, $companyId, $voucherId);
        company_audit_write($db, $companyId, $userId, "voucher.post", "company_voucher", $voucherId, null, $result);

        $db->prepare(
            "INSERT INTO company_financial_write_receipts (company_id, mutation_id, request_hash, response_json, http_status, created_at)
             VALUES (?, ?, ?, ?, 200, UTC_TIMESTAMP())"
        )->execute([$companyId, $mutationId, $hash, json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)]);

        if ($manageTransaction) {
            $db->commit();
        }
        return $result;
    } catch (Throwable $e) {
        if ($manageTransaction && $db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}
