<?php

/** Runs under the user's write lock, including the final graph of sync batches. */
function validate_expense_recoveries(PDO $db, string $userId, array $entity): void {
    $originalIds = [$entity["id"], $entity["linkedOriginalTransactionId"] ?? $entity["id"]];
    $st = $db->prepare("SELECT payload FROM cloud_collection_rows WHERE user_id=? AND collection_name='transactions' AND deleted_at IS NULL AND (entity_id IN (?, ?) OR JSON_UNQUOTE(JSON_EXTRACT(payload, '$.linkedOriginalTransactionId')) IN (?, ?))");
    $st->execute([$userId, ...$originalIds, ...$originalIds]);
    $transactions = [];
    while ($row = $st->fetch()) {
        $tx = decode_payload($row["payload"]);
        if (empty($tx["isDeleted"])) $transactions[$tx["id"]] = $tx;
    }
    $transactions[$entity["id"]] = $entity;
    if (($entity["transactionIntent"] ?? null) === "expense_contribution" && (($entity["type"] ?? null) !== "refund" || empty($entity["linkedOriginalTransactionId"]) || ($entity["paymentMode"] ?? null) === "credit_card")) {
        throw new InvalidArgumentException("Contribution return requires a linked expense and a cash/bank credit");
    }
    foreach (array_unique($originalIds) as $originalId) {
        $recoveries = array_filter($transactions, fn($tx) => empty($tx["isDeleted"]) && ($tx["type"] ?? null) === "refund" && ($tx["linkedOriginalTransactionId"] ?? null) === $originalId);
        if (!$recoveries) continue;
        $original = $transactions[$originalId] ?? null;
        if (!$original || !empty($original["isDeleted"]) || ($original["type"] ?? null) !== "expense") throw new InvalidArgumentException("Recovery must link to an active original expense");
        $recovered = 0;
        foreach ($recoveries as $tx) {
            if (($tx["categoryId"] ?? null) !== ($original["categoryId"] ?? null)) throw new InvalidArgumentException("Recovery category must match the original expense");
            if (substr((string)($tx["date"] ?? ""), 0, 10) < substr((string)($original["date"] ?? ""), 0, 10)) throw new InvalidArgumentException("Recovery cannot precede the original expense");
            if (($tx["transactionIntent"] ?? null) === "expense_contribution") {
                if (!empty($original["isReimbursable"])) throw new InvalidArgumentException("Use the reimbursement workflow for a receivable expense");
                if (($original["businessOrPersonal"] ?? "personal") === "mixed" || ($tx["businessOrPersonal"] ?? "personal") !== ($original["businessOrPersonal"] ?? "personal")) throw new InvalidArgumentException("Contribution requires the original non-mixed personal/business scope");
            }
            $recovered += (int)($tx["amountPaise"] ?? round(($tx["amount"] ?? 0) * 100));
        }
        if ($recovered > (int)($original["amountPaise"] ?? round(($original["amount"] ?? 0) * 100))) throw new InvalidArgumentException("Total contributions and refunds exceed the original expense");
    }
}
