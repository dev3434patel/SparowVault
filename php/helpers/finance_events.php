<?php

/**
 * Phase 5 — Persist financial_events / financial_effects from transaction payloads.
 * Mirrors src/services/financeEventBuilder.ts (keep in sync when changing rules).
 */

require_once __DIR__ . "/utils.php";
require_once __DIR__ . "/money_paise.php";

function fe_amount_paise(array $tx): int {
    if (isset($tx["amountPaise"]) && is_numeric($tx["amountPaise"])) {
        return (int)$tx["amountPaise"];
    }
    if (array_key_exists("amount", $tx)) {
        return cloud_parse_money_input_to_paise($tx["amount"], "amount");
    }
    return 0;
}

/** @return array<string, array> keyed by EMIPayment.transactionId */
function fe_emis_by_transaction_id(PDO $db, string $userId): array {
    $st = $db->prepare(
        "SELECT entity_id, payload FROM cloud_collection_rows
         WHERE user_id = ? AND collection_name = 'emis' AND deleted_at IS NULL",
    );
    $st->execute([$userId]);
    $map = [];
    while ($r = $st->fetch()) {
        $p = decode_payload($r["payload"]);
        $tid = $p["transactionId"] ?? null;
        if (is_string($tid) && $tid !== "") {
            $map[$tid] = $p;
        }
    }
    return $map;
}

function fe_event_id_for_transaction(string $txnId): string {
    return "fevt_" . $txnId;
}

/** Remove posted effects; keep the financial_events row for audit when possible. */
function fe_clear_effects_for_event(PDO $db, string $eventId): void {
    $st = $db->prepare("DELETE FROM financial_effects WHERE event_id = ?");
    $st->execute([$eventId]);
}

/** Transaction removed or invalid amount — void ledger (effects cleared; event soft-deleted). */
function fe_void_ledger_for_transaction(PDO $db, string $userId, string $txnId): void {
    $eid = fe_event_id_for_transaction($txnId);
    fe_clear_effects_for_event($db, $eid);
    $now = gmdate("Y-m-d H:i:s");
    $st = $db->prepare(
        "UPDATE financial_events SET deleted_at = ?, status = 'reversed', updated_at = ? WHERE user_id = ? AND id = ? AND deleted_at IS NULL",
    );
    $st->execute([$now, $now, $userId, $eid]);
}

/**
 * Replace effects and upsert the active posted row for this transaction (edit = reverse old effects + new effects).
 */
function fe_upsert_posted_ledger(
    PDO $db,
    string $userId,
    string $txnId,
    string $eventType,
    string $eventDate,
    int $amt,
    string $desc,
    string $status,
    string $now,
    array $effects,
): void {
    $eid = fe_event_id_for_transaction($txnId);
    fe_clear_effects_for_event($db, $eid);

    $sel = $db->prepare("SELECT id FROM financial_events WHERE id = ? AND user_id = ?");
    $sel->execute([$eid, $userId]);
    if ($sel->fetch()) {
        $up = $db->prepare(
            "UPDATE financial_events SET source_transaction_id = ?, event_type = ?, event_date = ?, amount_paise = ?, description = ?, status = ?, deleted_at = NULL, reversal_of_event_id = NULL, updated_at = ? WHERE id = ? AND user_id = ?",
        );
        $up->execute([$txnId, $eventType, $eventDate, $amt, $desc, $status, $now, $eid, $userId]);
    } else {
        $insEv = $db->prepare(
            "INSERT INTO financial_events (id, user_id, source_transaction_id, event_type, event_date, amount_paise, currency, description, source, status, reversal_of_event_id, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, 'INR', ?, 'transaction', ?, NULL, ?, ?, NULL)",
        );
        $insEv->execute([$eid, $userId, $txnId, $eventType, $eventDate, $amt, $desc, $status, $now, $now]);
    }

    $insFx = $db->prepare(
        "INSERT INTO financial_effects (id, event_id, user_id, target_type, target_id, effect_direction, amount_paise, component, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    foreach ($effects as $fx) {
        $insFx->execute([
            $fx["id"],
            $fx["event_id"],
            $fx["user_id"],
            $fx["target_type"],
            $fx["target_id"],
            $fx["effect_direction"],
            $fx["amount_paise"],
            $fx["component"],
            $fx["created_at"],
        ]);
    }
}

function fe_principal_interest_paise(array $emi, int $totalPaise): array {
    $pp = isset($emi["principalComponentPaise"]) && is_numeric($emi["principalComponentPaise"])
        ? (int)$emi["principalComponentPaise"]
        : (array_key_exists("principalComponent", $emi)
            ? cloud_parse_money_input_to_paise($emi["principalComponent"], "principalComponent")
            : 0);
    $ip = isset($emi["interestComponentPaise"]) && is_numeric($emi["interestComponentPaise"])
        ? (int)$emi["interestComponentPaise"]
        : (array_key_exists("interestComponent", $emi)
            ? cloud_parse_money_input_to_paise($emi["interestComponent"], "interestComponent")
            : 0);
    $s = $pp + $ip;
    if ($s > 0 && $s !== $totalPaise) {
        $pp = (int)round($totalPaise * $pp / $s);
        $ip = $totalPaise - $pp;
    }
    return [$pp, $ip];
}

function fe_int_paise(array $row, string $paiseField, string $legacyField): int {
    if (isset($row[$paiseField]) && is_numeric($row[$paiseField])) {
        return (int)$row[$paiseField];
    }
    if (array_key_exists($legacyField, $row)) {
        return cloud_parse_money_input_to_paise($row[$legacyField], $legacyField);
    }
    return 0;
}

/**
 * Build + persist ledger for one transaction row (assoc array, camelCase keys).
 */
function finance_events_sync_transaction(PDO $db, string $userId, array $tx): void {
    $txnId = isset($tx["id"]) && is_string($tx["id"]) ? $tx["id"] : "";
    if ($txnId === "" || (($tx["isDeleted"] ?? 0) === 1 || ($tx["isDeleted"] ?? false) === true)) {
        if ($txnId !== "") {
            fe_void_ledger_for_transaction($db, $userId, $txnId);
        }
        return;
    }

    $amt = fe_amount_paise($tx);
    if ($amt < 1) {
        fe_void_ledger_for_transaction($db, $userId, $txnId);
        return;
    }

    $emisByTxn = fe_emis_by_transaction_id($db, $userId);
    $eventId = "fevt_" . $txnId;
    $now = gmdate("Y-m-d H:i:s");
    $dateRaw = $tx["date"] ?? "";
    $eventDate = is_string($dateRaw) && strtotime($dateRaw) !== false
        ? gmdate("Y-m-d", strtotime($dateRaw))
        : gmdate("Y-m-d");

    $type = (string)($tx["type"] ?? "");
    $pm = (string)($tx["paymentMode"] ?? "");
    $status = "posted";
    $eventType = "adjustment";
    $effects = [];
    $reasons = [];

    $pushReason = function (string $code) use (&$status, &$reasons): void {
        $status = "needs_review";
        $reasons[] = $code;
    };

    $addFx = function (
        string $targetType,
        string $targetId,
        string $dir,
        int $paise,
        string $component,
    ) use (&$effects, $eventId, $userId, $now): void {
        $effects[] = [
            "id" => uid("fef"),
            "event_id" => $eventId,
            "user_id" => $userId,
            "target_type" => $targetType,
            "target_id" => $targetId,
            "effect_direction" => $dir,
            "amount_paise" => $paise,
            "component" => $component,
            "created_at" => $now,
        ];
    };

    if ($type === "expense") {
        if ($pm === "credit_card") {
            $eventType = "credit_card_purchase";
            $cid = $tx["linkedCardId"] ?? null;
            if (!is_string($cid) || $cid === "") {
                $pushReason("MISSING_CARD");
            } else {
                $addFx("credit_card", $cid, "increase", $amt, "liability");
            }
            $cat = $tx["categoryId"] ?? null;
            if (is_string($cat) && $cat !== "") {
                $addFx("expense_category", $cat, "increase", $amt, "expense");
            } else {
                $pushReason("MISSING_CATEGORY");
            }
        } else {
            $eventType = "expense";
            $acc = $tx["accountId"] ?? null;
            if (is_string($acc) && $acc !== "") {
                $addFx("account", $acc, "decrease", $amt, "cash");
            } else {
                $pushReason("MISSING_ACCOUNT");
            }
            $cat = $tx["categoryId"] ?? null;
            if (is_string($cat) && $cat !== "") {
                $addFx("expense_category", $cat, "increase", $amt, "expense");
            } else {
                $pushReason("MISSING_CATEGORY");
            }
        }
    } elseif ($type === "income") {
        $eventType = "income";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "increase", $amt, "cash");
        } else {
            $pushReason("MISSING_ACCOUNT");
        }
        $cat = $tx["categoryId"] ?? null;
        if (is_string($cat) && $cat !== "") {
            $addFx("income_category", $cat, "increase", $amt, "income");
        } else {
            $pushReason("MISSING_CATEGORY");
        }
    } elseif ($type === "refund") {
        $eventType = "refund";
        if ($pm === "credit_card") {
            $cid = $tx["linkedCardId"] ?? null;
            if (is_string($cid) && $cid !== "") {
                $addFx("credit_card", $cid, "decrease", $amt, "liability");
            } else {
                $pushReason("MISSING_CARD");
            }
            $cat = $tx["categoryId"] ?? null;
            if (is_string($cat) && $cat !== "") {
                $addFx("expense_category", $cat, "decrease", $amt, "expense");
            } else {
                $pushReason("MISSING_CATEGORY");
            }
        } else {
            $acc = $tx["accountId"] ?? null;
            if (is_string($acc) && $acc !== "") {
                $addFx("account", $acc, "increase", $amt, "cash");
            } else {
                $pushReason("MISSING_ACCOUNT");
            }
            $cat = $tx["categoryId"] ?? null;
            if (is_string($cat) && $cat !== "") {
                $addFx("expense_category", $cat, "decrease", $amt, "expense");
            } else {
                $pushReason("MISSING_CATEGORY");
            }
        }
    } elseif ($type === "transfer") {
        $eventType = "transfer";
        $from = $tx["accountId"] ?? "";
        $to = $tx["toAccountId"] ?? "";
        if (!is_string($from) || !is_string($to) || $from === "" || $to === "" || $from === $to) {
            $pushReason("INVALID_TRANSFER");
        } else {
            $addFx("account", $from, "decrease", $amt, "cash");
            $addFx("account", $to, "increase", $amt, "cash");
        }
    } elseif ($type === "cc_payment") {
        $eventType = "credit_card_payment";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "decrease", $amt, "cash");
        } else {
            $pushReason("MISSING_ACCOUNT");
        }
        $cid = $tx["linkedCardId"] ?? null;
        if (is_string($cid) && $cid !== "") {
            $addFx("credit_card", $cid, "decrease", $amt, "liability");
        } else {
            $pushReason("MISSING_CARD");
        }
    } elseif ($type === "emi_payment") {
        $eventType = "emi_payment";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "decrease", $amt, "cash");
        } else {
            $pushReason("MISSING_ACCOUNT");
        }
        $loanId = $tx["linkedLoanId"] ?? null;
        if (!is_string($loanId) || $loanId === "") {
            $pushReason("MISSING_LOAN");
        } else {
            $emi = $emisByTxn[$txnId] ?? null;
            if (is_array($emi)) {
                $penaltyPaise = fe_int_paise($emi, "penaltyPaise", "penalty");
                $feePaise = fe_int_paise($emi, "feePaise", "fee");
                $charges = $penaltyPaise + $feePaise;
                $core = max(0, $amt - $charges);
                [$pp, $ip] = fe_principal_interest_paise($emi, $core);
                $icat = $tx["categoryId"] ?? null;
                if ($penaltyPaise > 0) {
                    if (is_string($icat) && $icat !== "") {
                        $addFx("expense_category", $icat, "increase", $penaltyPaise, "penalty");
                    } else {
                        $pushReason("MISSING_CATEGORY");
                    }
                }
                if ($feePaise > 0) {
                    if (is_string($icat) && $icat !== "") {
                        $addFx("expense_category", $icat, "increase", $feePaise, "fee");
                    } else {
                        $pushReason("MISSING_CATEGORY");
                    }
                }
                if ($pp > 0) {
                    $addFx("loan", $loanId, "decrease", $pp, "principal");
                }
                if ($ip > 0) {
                    if (is_string($icat) && $icat !== "") {
                        $addFx("expense_category", $icat, "increase", $ip, "interest");
                    } else {
                        $pushReason("MISSING_INTEREST_CATEGORY");
                    }
                }
            } else {
                $addFx("loan", $loanId, "decrease", $amt, "principal");
                $pushReason("MISSING_EMI_ROW");
            }
        }
    } elseif ($type === "loan_prepayment") {
        $eventType = "loan_prepayment";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "decrease", $amt, "cash");
        } else {
            $pushReason("MISSING_ACCOUNT");
        }
        $loanId = $tx["linkedLoanId"] ?? null;
        if (is_string($loanId) && $loanId !== "") {
            $addFx("loan", $loanId, "decrease", $amt, "principal");
        } else {
            $pushReason("MISSING_LOAN");
        }
    } elseif ($type === "loan_disbursement") {
        $eventType = "loan_disbursement";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "increase", $amt, "cash");
        }
        $loanId = $tx["linkedLoanId"] ?? null;
        if (is_string($loanId) && $loanId !== "") {
            $addFx("loan", $loanId, "increase", $amt, "principal");
        }
    } elseif ($type === "udhari_given") {
        $eventType = "udhari_given";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "decrease", $amt, "cash");
        }
        $ud = $tx["linkedUdhariId"] ?? null;
        if (is_string($ud) && $ud !== "") {
            $addFx("udhari_person", $ud, "increase", $amt, "receivable");
        }
    } elseif ($type === "udhari_received") {
        $eventType = "udhari_received";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "increase", $amt, "cash");
        }
        $ud = $tx["linkedUdhariId"] ?? null;
        if (is_string($ud) && $ud !== "") {
            $addFx("udhari_person", $ud, "increase", $amt, "payable");
        }
    } elseif ($type === "udhari_collect") {
        $eventType = "udhari_settlement";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "increase", $amt, "cash");
        }
        $ud = $tx["linkedUdhariId"] ?? null;
        if (is_string($ud) && $ud !== "") {
            $addFx("udhari_person", $ud, "decrease", $amt, "receivable");
        }
    } elseif ($type === "udhari_repay") {
        $eventType = "udhari_settlement";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "decrease", $amt, "cash");
        }
        $ud = $tx["linkedUdhariId"] ?? null;
        if (is_string($ud) && $ud !== "") {
            $addFx("udhari_person", $ud, "decrease", $amt, "payable");
        }
    } elseif ($type === "udhari_write_off") {
        $eventType = "udhari_write_off";
        $ud = $tx["linkedUdhariId"] ?? null;
        if (is_string($ud) && $ud !== "") {
            $addFx("udhari_person", $ud, "decrease", $amt, "receivable");
        }
        $cat = $tx["categoryId"] ?? null;
        if (is_string($cat) && $cat !== "") {
            $addFx("expense_category", $cat, "increase", $amt, "expense");
        }
    } elseif ($type === "savings_contribution") {
        $eventType = "goal_contribution";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "decrease", $amt, "cash");
        }
        $gid = $tx["linkedGoalId"] ?? null;
        if (is_string($gid) && $gid !== "") {
            $addFx("goal", $gid, "increase", $amt, "asset");
        }
    } elseif ($type === "goal_withdrawal") {
        $eventType = "goal_withdrawal";
        $gid = $tx["linkedGoalId"] ?? null;
        if (is_string($gid) && $gid !== "") {
            $addFx("goal", $gid, "decrease", $amt, "asset");
        } else {
            $pushReason("MISSING_GOAL");
        }
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "increase", $amt, "cash");
        } else {
            $pushReason("MISSING_ACCOUNT");
        }
    } elseif ($type === "investment_contribution") {
        $eventType = "investment_buy";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "decrease", $amt, "cash");
        }
        $inv = $tx["linkedSavingsId"] ?? null;
        if (is_string($inv) && $inv !== "") {
            $addFx("investment", $inv, "increase", $amt, "asset");
        }
    } elseif ($type === "investment_sell") {
        $eventType = "investment_sell";
        $inv = $tx["linkedSavingsId"] ?? null;
        if (is_string($inv) && $inv !== "") {
            $addFx("investment", $inv, "decrease", $amt, "asset");
        } else {
            $pushReason("MISSING_INVESTMENT");
        }
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $addFx("account", $acc, "increase", $amt, "cash");
        } else {
            $pushReason("MISSING_ACCOUNT");
        }
    } elseif ($type === "adjustment") {
        $eventType = "adjustment";
        $acc = $tx["accountId"] ?? null;
        if (is_string($acc) && $acc !== "") {
            $desc = strtolower((string)($tx["description"] ?? ""));
            $dir = str_contains($desc, "decrease") ? "decrease" : "increase";
            $addFx("account", $acc, $dir, $amt, "cash");
        }
    } elseif ($type === "card_emi_conversion") {
        $eventType = "card_emi_conversion";
        $cid = $tx["linkedCardId"] ?? null;
        $planId = $tx["linkedCardEmiPlanId"] ?? null;
        if (!is_string($cid) || $cid === "") {
            $pushReason("MISSING_CARD");
        } elseif (!is_string($planId) || $planId === "") {
            $pushReason("MISSING_EMI_PLAN");
        } else {
            $addFx("credit_card", $cid, "decrease", $amt, "liability");
            $addFx("card_emi_plan", $planId, "increase", $amt, "principal");
            $feeP = fe_int_paise($tx, "feePaise", "fee");
            $taxP = fe_int_paise($tx, "taxPaise", "tax");
            $cat = $tx["categoryId"] ?? null;
            if ($feeP > 0) {
                $addFx("credit_card", $cid, "increase", $feeP, "liability");
                if (is_string($cat) && $cat !== "") {
                    $addFx("expense_category", $cat, "increase", $feeP, "fee");
                }
            }
            if ($taxP > 0) {
                $addFx("credit_card", $cid, "increase", $taxP, "liability");
                if (is_string($cat) && $cat !== "") {
                    $addFx("expense_category", $cat, "increase", $taxP, "tax");
                }
            }
        }
    } elseif ($type === "card_emi_charge") {
        $eventType = "card_emi_charge";
        $cid = $tx["linkedCardId"] ?? null;
        $planId = $tx["linkedCardEmiPlanId"] ?? null;
        $cat = $tx["categoryId"] ?? null;
        if (!is_string($cid) || $cid === "") {
            $pushReason("MISSING_CARD");
        } else {
            $principalP = fe_int_paise($tx, "principalComponentPaise", "principal");
            $interestP = fe_int_paise($tx, "interestPaise", "interest");
            $feeP = fe_int_paise($tx, "feePaise", "fee");
            $taxP = fe_int_paise($tx, "taxPaise", "tax");
            if ($principalP > 0 && is_string($planId) && $planId !== "") {
                $addFx("card_emi_plan", $planId, "decrease", $principalP, "principal");
                $addFx("credit_card", $cid, "increase", $principalP, "liability");
            }
            $finance = $interestP + $feeP + $taxP;
            if ($finance > 0) {
                $addFx("credit_card", $cid, "increase", $finance, "liability");
            }
            if ($interestP > 0 && is_string($cat) && $cat !== "") {
                $addFx("expense_category", $cat, "increase", $interestP, "interest");
            }
            if ($feeP > 0 && is_string($cat) && $cat !== "") {
                $addFx("expense_category", $cat, "increase", $feeP, "fee");
            }
            if ($taxP > 0 && is_string($cat) && $cat !== "") {
                $addFx("expense_category", $cat, "increase", $taxP, "tax");
            }
        }
    } else {
        $pushReason("UNSUPPORTED_TYPE");
    }

    $desc = is_string($tx["description"] ?? null) ? (string)$tx["description"] : "";
    if ($desc === "") {
        $desc = is_string($tx["merchantOrPerson"] ?? null) ? (string)$tx["merchantOrPerson"] : $type;
    }

    fe_upsert_posted_ledger($db, $userId, $txnId, $eventType, $eventDate, $amt, $desc, $status, $now, $effects);
}

/** Swallow errors when tables are not migrated yet. */
function finance_events_sync_transaction_safe(PDO $db, string $userId, array $tx): void {
    try {
        finance_events_sync_transaction($db, $userId, $tx);
    } catch (Throwable) {
    }
}
