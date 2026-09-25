<?php
declare(strict_types=1);

require_once __DIR__ . "/ids.php";
require_once __DIR__ . "/authz.php";
require_once __DIR__ . "/audit.php";
require_once __DIR__ . "/seed.php";
require_once __DIR__ . "/purpose.php";

class CompanyPostingException extends RuntimeException {
    public function __construct(string $message, public int $status = 422, public string $errorCode = "VALIDATION_ERROR") {
        parent::__construct($message);
    }
}

require_once __DIR__ . "/posting_guards.php";
require_once __DIR__ . "/posting_preview.php";
require_once __DIR__ . "/posting_bills.php";
require_once __DIR__ . "/posting_commit.php";

function company_reverse_voucher(
    PDO $db,
    string $companyId,
    string $userId,
    string $voucherId,
    string $mutationId,
    string $reason
): array {
    $perms = company_user_permissions($db, $userId, $companyId);
    if (!in_array("reverse_voucher", $perms, true)) {
        throw new CompanyPostingException("Missing permission: reverse_voucher", 403, "COMPANY_PERMISSION_DENIED");
    }

    $db->beginTransaction();
    try {
        $lock = $db->prepare(
            "SELECT * FROM company_vouchers WHERE id = ? AND company_id = ? AND deleted_at IS NULL FOR UPDATE"
        );
        $lock->execute([$voucherId, $companyId]);
        $originalRow = $lock->fetch(PDO::FETCH_ASSOC);
        if (!$originalRow) {
            throw new CompanyPostingException("Voucher not found", 404, "NOT_FOUND");
        }

        if ((string)$originalRow["status"] === "REVERSED") {
            $existingId = (string)($originalRow["reversed_voucher_id"] ?? "");
            if ($existingId === "") {
                throw new CompanyPostingException("Reversal already applied but reversal voucher missing", 500, "INCONSISTENT_STATE");
            }
            $existing = company_load_voucher_with_lines($db, $companyId, $existingId);
            if ($existing === null) {
                throw new CompanyPostingException("Reversal voucher not found", 404, "NOT_FOUND");
            }
            $existing["reversesVoucherId"] = $voucherId;
            $db->commit();
            return $existing;
        }

        if ((string)$originalRow["status"] !== "POSTED") {
            throw new CompanyPostingException("Only POSTED vouchers can be reversed", 422, "INVALID_STATUS");
        }

        $original = company_load_voucher_with_lines($db, $companyId, $voucherId);
        if ($original === null) {
            throw new CompanyPostingException("Voucher not found", 404, "NOT_FOUND");
        }

        $lines = [];
        foreach ($original["lines"] as $line) {
            $lines[] = [
                "ledgerId" => $line["ledger_id"],
                "side" => $line["side"] === "DEBIT" ? "CREDIT" : "DEBIT",
                "amountPaise" => (int)$line["amount_paise"],
                "partyRelationshipId" => $line["party_relationship_id"],
                "costCentreId" => $line["cost_centre_id"],
                "projectId" => $line["project_id"],
                "areaId" => $line["area_id"],
                "narration" => "Reversal: " . ($line["narration"] ?? ""),
            ];
        }

        $payload = [
            "mutationId" => $mutationId,
            "voucherType" => $original["voucher_type"],
            "voucherDate" => gmdate("Y-m-d"),
            "partyId" => $original["party_id"],
            "purpose" => null,
            "narration" => "Reversal of " . $original["voucher_number"] . ": " . $reason,
            "referenceNumber" => $original["reference_number"],
            "dimensions" => [
                "businessUnitId" => $original["business_unit_id"],
                "branchId" => $original["branch_id"],
                "areaId" => $original["area_id"],
                "projectId" => $original["project_id"],
                "costCentreId" => $original["cost_centre_id"],
            ],
            "lines" => $lines,
            "status" => "POSTED",
            "isReversal" => true,
        ];

        $reversal = company_post_voucher($db, $companyId, $userId, $payload, false);

        $db->prepare(
            "UPDATE company_vouchers SET status = 'REVERSED', reversed_voucher_id = ?, updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND company_id = ?"
        )->execute([$reversal["id"], $voucherId, $companyId]);

        company_unwind_bill_allocations_tx($db, $companyId, $voucherId);

        company_audit_write($db, $companyId, $userId, "voucher.reverse", "company_voucher", $voucherId, $original, $reversal, $reason);
        $reversal["reversesVoucherId"] = $voucherId;

        $db->commit();
        return $reversal;
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

/**
 * Approve a pending voucher inside a transaction: period lock, balance, POSTED, apply deferred bill intent.
 */
function company_approve_voucher_tx(
    PDO $db,
    string $companyId,
    string $userId,
    string $approvalId,
    ?string $comment = null
): array {
    $db->beginTransaction();
    try {
        $st = $db->prepare(
            "SELECT * FROM company_approvals WHERE id = ? AND company_id = ? FOR UPDATE"
        );
        $st->execute([$approvalId, $companyId]);
        $approval = $st->fetch(PDO::FETCH_ASSOC);
        if (!$approval) {
            throw new CompanyPostingException("Approval not found", 404, "NOT_FOUND");
        }
        if ((string)$approval["status"] !== "PENDING") {
            throw new CompanyPostingException("Approval is not pending", 422, "INVALID_STATUS");
        }

        $voucherId = (string)$approval["voucher_id"];
        $vs = $db->prepare(
            "SELECT * FROM company_vouchers WHERE id = ? AND company_id = ? AND deleted_at IS NULL FOR UPDATE"
        );
        $vs->execute([$voucherId, $companyId]);
        $voucher = $vs->fetch(PDO::FETCH_ASSOC);
        if (!$voucher) {
            throw new CompanyPostingException("Voucher not found", 404, "NOT_FOUND");
        }
        if ((string)$voucher["status"] !== "PENDING_APPROVAL") {
            throw new CompanyPostingException("Voucher is not pending approval", 422, "INVALID_STATUS");
        }

        $voucherDate = (string)$voucher["voucher_date"];
        if (company_period_is_locked($db, $companyId, $voucherDate)) {
            throw new CompanyPostingException("Period is locked for this date", 423, "PERIOD_LOCKED");
        }

        $ls = $db->prepare(
            "SELECT side, amount_paise FROM company_voucher_lines WHERE voucher_id = ? AND company_id = ?"
        );
        $ls->execute([$voucherId, $companyId]);
        $debit = 0;
        $credit = 0;
        while ($row = $ls->fetch(PDO::FETCH_ASSOC)) {
            if ($row["side"] === "DEBIT") {
                $debit += (int)$row["amount_paise"];
            } else {
                $credit += (int)$row["amount_paise"];
            }
        }
        if ($debit !== $credit || $debit <= 0) {
            throw new CompanyPostingException("Sum debit must equal sum credit (exact paise)", 422, "UNBALANCED_VOUCHER");
        }

        $db->prepare(
            "UPDATE company_vouchers
             SET status = 'POSTED', approved_by = ?, posted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND company_id = ?"
        )->execute([$userId, $voucherId, $companyId]);

        $intent = company_parse_voucher_intent(isset($voucher["narration"]) ? (string)$voucher["narration"] : null);
        $billAllocations = $intent["billAllocations"] ?? [];
        if (!is_array($billAllocations)) {
            $billAllocations = [];
        }
        $partyId = $voucher["party_id"] !== null && $voucher["party_id"] !== ""
            ? (string)$voucher["party_id"] : null;
        company_apply_posted_side_effects_tx(
            $db,
            $companyId,
            $voucherId,
            $partyId,
            (string)$voucher["voucher_type"],
            $voucherDate,
            (string)$voucher["voucher_number"],
            $billAllocations
        );

        $db->prepare(
            "UPDATE company_approvals
             SET status = 'APPROVED', decided_by = ?, comment = ?, decided_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND company_id = ?"
        )->execute([$userId, $comment, $approvalId, $companyId]);

        $after = company_load_voucher_with_lines($db, $companyId, $voucherId);
        company_audit_write($db, $companyId, $userId, "voucher.approve", "company_voucher", $voucherId, $voucher, $after, $comment);

        $db->commit();
        return $after ?? ["id" => $voucherId, "status" => "POSTED"];
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}
