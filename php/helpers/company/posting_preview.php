<?php
declare(strict_types=1);

/**
 * Purpose engine → balanced lines via canonical purpose registry.
 *
 * @return list<array{ledgerId:string,side:string,amountPaise:int,partyRelationshipId?:string}>
 */
function company_preview_purpose(
    PDO $db,
    string $companyId,
    string $purpose,
    int $amountPaise,
    ?string $partyId,
    string $cashBankLedgerId,
    ?string $counterLedgerIdExplicit = null
): array {
    if ($amountPaise <= 0) {
        throw new CompanyPostingException("amountPaise must be positive");
    }
    $cash = $db->prepare(
        "SELECT id, is_cash_bank FROM company_ledgers WHERE id = ? AND company_id = ? AND active = 1 AND deleted_at IS NULL"
    );
    $cash->execute([$cashBankLedgerId, $companyId]);
    $cashRow = $cash->fetch(PDO::FETCH_ASSOC);
    if (!$cashRow || (int)$cashRow["is_cash_bank"] !== 1) {
        throw new CompanyPostingException("cashBankLedgerId must be an active cash/bank ledger");
    }

    $purpose = strtoupper(trim($purpose));
    company_assert_purpose_not_deprecated($purpose);
    $rule = company_purpose_rule($purpose);
    if ($rule === null) {
        throw new CompanyPostingException("Unknown purpose: " . $purpose . " — provide explicit lines");
    }

    if (!empty($rule["requiresParty"]) && ($partyId === null || $partyId === "")) {
        throw new CompanyPostingException("partyId required for purpose " . $purpose);
    }

    $direction = strtoupper((string)($rule["direction"] ?? ""));
    $voucherType = strtoupper((string)($rule["voucherType"] ?? ""));
    $isReceipt = $direction === "RECEIVED" || in_array($voucherType, ["RECEIPT", "SALE"], true);

    $counterLedgerId = null;
    $relId = null;
    $strategy = strtoupper((string)($rule["counterStrategy"] ?? ""));

    switch ($strategy) {
        case "PARTY_RELATIONSHIP":
            if ($partyId === null || $partyId === "") {
                throw new CompanyPostingException("partyId required for purpose " . $purpose);
            }
            $rel = company_resolve_party_relationship_ledger(
                $db,
                $companyId,
                $partyId,
                (string)$rule["relationshipType"],
                (string)$rule["controlLedgerCode"],
                (string)$rule["groupCode"]
            );
            $counterLedgerId = (string)$rel["ledger_id"];
            $relId = (string)$rel["id"];
            break;

        case "LEDGER_CODE":
            $code = (string)($rule["counterLedgerCode"] ?? "");
            $counterLedgerId = company_ledger_id_by_code($db, $companyId, $code);
            if ($counterLedgerId === null || $counterLedgerId === "") {
                throw new CompanyPostingException("Counter ledger missing for code " . $code, 500, "COA_INCOMPLETE");
            }
            break;

        case "EXPLICIT_COUNTER":
            if ($counterLedgerIdExplicit === null || $counterLedgerIdExplicit === "") {
                throw new CompanyPostingException("counterLedgerId required for purpose " . $purpose);
            }
            $ls = $db->prepare(
                "SELECT id FROM company_ledgers WHERE id = ? AND company_id = ? AND active = 1 AND deleted_at IS NULL"
            );
            $ls->execute([$counterLedgerIdExplicit, $companyId]);
            if (!$ls->fetch()) {
                throw new CompanyPostingException("counterLedgerId not found or inactive", 404, "LEDGER_NOT_FOUND");
            }
            $counterLedgerId = $counterLedgerIdExplicit;
            break;

        case "CONTRA_EXPLICIT":
            throw new CompanyPostingException("CONTRA requires explicit lines (from/to cash-bank ledgers)");

        default:
            throw new CompanyPostingException("Unknown counterStrategy for purpose " . $purpose);
    }

    if ($counterLedgerId === null || $counterLedgerId === "") {
        throw new CompanyPostingException("Could not resolve counter ledger for purpose");
    }

    if ($isReceipt) {
        $lines = [
            ["ledgerId" => $cashBankLedgerId, "side" => "DEBIT", "amountPaise" => $amountPaise],
            ["ledgerId" => $counterLedgerId, "side" => "CREDIT", "amountPaise" => $amountPaise],
        ];
        if ($relId !== null) {
            $lines[1]["partyRelationshipId"] = $relId;
        }
    } else {
        $lines = [
            ["ledgerId" => $counterLedgerId, "side" => "DEBIT", "amountPaise" => $amountPaise],
            ["ledgerId" => $cashBankLedgerId, "side" => "CREDIT", "amountPaise" => $amountPaise],
        ];
        if ($relId !== null) {
            $lines[0]["partyRelationshipId"] = $relId;
        }
    }
    return $lines;
}

/**
 * Canonical preview fingerprint context — must match voucher-preview controller and post check.
 *
 * @return array{purpose:string,amountPaise:int,partyId:?string,cashBankLedgerId:string,counterLedgerId:?string}
 */
function company_preview_hash_context(
    string $purpose,
    int $amountPaise,
    ?string $partyId,
    string $cashBankLedgerId,
    ?string $counterLedgerId
): array {
    return [
        "purpose" => strtoupper(trim($purpose)),
        "amountPaise" => $amountPaise,
        "partyId" => $partyId,
        "cashBankLedgerId" => $cashBankLedgerId,
        "counterLedgerId" => $counterLedgerId,
    ];
}

/**
 * Enrich preview lines with ledger metadata + statement impacts and fingerprint.
 *
 * @param list<array> $lines
 * @return array{lines:list<array>,impacts:array,previewToken:string,previewHash:string}
 */
function company_enrich_preview_lines(PDO $db, string $companyId, array $lines, array $previewContext): array {
    $enriched = [];
    $impacts = [
        "profitPaise" => 0,
        "assetPaise" => 0,
        "liabilityPaise" => 0,
        "equityPaise" => 0,
        "cashPaise" => 0,
    ];

    $st = $db->prepare(
        "SELECT lg.id, lg.name, lg.code, lg.is_cash_bank, g.nature
         FROM company_ledgers lg
         INNER JOIN company_account_groups g ON g.id = lg.group_id AND g.company_id = lg.company_id
         WHERE lg.id = ? AND lg.company_id = ? AND lg.deleted_at IS NULL"
    );

    foreach ($lines as $line) {
        if (!is_array($line)) {
            throw new CompanyPostingException("Invalid preview line");
        }
        $ledgerId = (string)($line["ledgerId"] ?? $line["ledger_id"] ?? "");
        $side = strtoupper((string)($line["side"] ?? ""));
        $amount = (int)($line["amountPaise"] ?? $line["amount_paise"] ?? 0);
        if ($ledgerId === "" || !in_array($side, ["DEBIT", "CREDIT"], true) || $amount <= 0) {
            throw new CompanyPostingException("Each preview line needs ledgerId, side, amountPaise > 0");
        }
        $st->execute([$ledgerId, $companyId]);
        $ledger = $st->fetch(PDO::FETCH_ASSOC);
        if (!$ledger) {
            throw new CompanyPostingException("Ledger not found for preview", 404, "LEDGER_NOT_FOUND");
        }

        $nature = strtoupper((string)$ledger["nature"]);
        $isCashBank = (int)$ledger["is_cash_bank"] === 1;
        $sign = $side === "DEBIT" ? 1 : -1;

        $lineImpacts = [
            "profitPaise" => 0,
            "assetPaise" => 0,
            "liabilityPaise" => 0,
            "equityPaise" => 0,
            "cashPaise" => 0,
        ];

        if ($nature === "ASSET") {
            $lineImpacts["assetPaise"] = $sign * $amount;
        } elseif ($nature === "LIABILITY") {
            $lineImpacts["liabilityPaise"] = -$sign * $amount;
        } elseif ($nature === "EQUITY") {
            $lineImpacts["equityPaise"] = -$sign * $amount;
        } elseif ($nature === "INCOME" || $nature === "EXPENSE") {
            // Credit income / debit expense → profit moves with -sign
            $lineImpacts["profitPaise"] = -$sign * $amount;
        }

        if ($isCashBank) {
            $lineImpacts["cashPaise"] = $sign * $amount;
        }

        foreach ($lineImpacts as $k => $v) {
            $impacts[$k] += $v;
        }

        $out = [
            "ledgerId" => $ledgerId,
            "side" => $side,
            "amountPaise" => $amount,
            "ledgerName" => (string)$ledger["name"],
            "ledgerCode" => (string)$ledger["code"],
            "nature" => $nature,
            "impacts" => $lineImpacts,
        ];
        if (isset($line["partyRelationshipId"]) || isset($line["party_relationship_id"])) {
            $out["partyRelationshipId"] = $line["partyRelationshipId"] ?? $line["party_relationship_id"];
        }
        $enriched[] = $out;
    }

    $previewToken = company_new_id();
    $hashPayload = array_merge($previewContext, ["lines" => $enriched]);
    $previewHash = company_request_hash($hashPayload);

    return [
        "lines" => $enriched,
        "impacts" => $impacts,
        "previewToken" => $previewToken,
        "previewHash" => $previewHash,
    ];
}
