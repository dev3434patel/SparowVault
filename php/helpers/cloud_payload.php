<?php

/**
 * Phase 4 — payload size limits, collection allowlist enforcement, transaction
 * schema validation, and denormalized indexed columns on cloud_collection_rows.
 *
 * Canonical collection keys match the SPA / Dexie (`emis`, `goalContribs`,
 * `savingsContribs`). Names like emiPayments/goalContributions are not used
 * as storage keys in this codebase.
 */

require_once __DIR__ . "/money_paise.php";

/** Max JSON size for a single encoded entity row (bytes). */
function cloud_max_row_payload_bytes(): int {
    return 65536;
}

/** Max raw HTTP body for POST /api/cloud/sync/push (bytes). */
function cloud_max_sync_push_body_bytes(): int {
    return 4194304; // 4 MiB
}

/** Default max for generic JSON entity routes (bytes). */
function cloud_max_entity_json_body_bytes(): int {
    return 1048576; // 1 MiB
}

/**
 * Allowed cloud collection_name values (strict allowlist).
 * Unknown names are rejected on sync push; entity routes use is_cloud_collection().
 */
function cloud_collection_allowlist(): array {
    static $allowlist = null;
    if ($allowlist !== null) {
        return $allowlist;
    }

    $bundlePath = __DIR__ . "/../config/syncContracts.generated.json";
    $sourcePath = dirname(__DIR__, 2) . "/src/config/syncContracts.generated.json";
    $path = is_file($bundlePath) ? $bundlePath : $sourcePath;
    $raw = is_file($path) ? file_get_contents($path) : false;
    if ($raw === false) {
        throw new RuntimeException("Sync contract registry missing");
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || !isset($decoded["contracts"]) || !is_array($decoded["contracts"])) {
        throw new RuntimeException("Sync contract registry is invalid");
    }

    $list = [];
    foreach ($decoded["contracts"] as $contract) {
        if (!is_array($contract)) {
            continue;
        }
        $name = $contract["serverAllowlistName"] ?? null;
        if (is_string($name) && $name !== "") {
            $list[] = $name;
        }
    }
    $allowlist = array_values(array_unique($list));
    sort($allowlist);
    return $allowlist;
}

function cloud_is_allowed_collection(string $name): bool {
    return in_array($name, cloud_collection_allowlist(), true);
}

function cloud_validate_encoded_payload_size(string $json, ?string $context = null): void {
    $len = strlen($json);
    $max = cloud_max_row_payload_bytes();
    if ($len > $max) {
        $ctx = $context !== null ? " ({$context})" : "";
        throw new InvalidArgumentException("Payload exceeds {$max} bytes{$ctx}");
    }
}

function cloud_validate_sync_push_raw_size(string $raw): void {
    if (strlen($raw) > cloud_max_sync_push_body_bytes()) {
        throw new InvalidArgumentException("Sync push body exceeds maximum allowed size");
    }
}

function cloud_assert_entity_user_id(string $authUserId, array $entity): void {
    $uid = $entity["userId"] ?? null;
    if (!is_string($uid) || $uid === "" || $uid !== $authUserId) {
        throw new InvalidArgumentException("userId must match authenticated user");
    }
}

/** @return array<string, mixed> SQL column => value (nullable) */
function cloud_ccr_compute_indexed(string $collection, array $entity, string $payloadJson): array {
    $schemaVersion = isset($entity["schemaVersion"]) && is_numeric($entity["schemaVersion"])
        ? (int)$entity["schemaVersion"]
        : 1;
    if ($schemaVersion < 1) {
        $schemaVersion = 1;
    }

    $amountPaise = cloud_entity_primary_amount_paise($collection, $entity);
    $payloadHash = hash("sha256", $payloadJson, false);

    $srcDev = $entity["sourceDeviceId"] ?? null;
    $sourceDeviceId = is_string($srcDev) && strlen($srcDev) <= 191 ? $srcDev : null;

    $txnLocalDate = null;
    $txnMonth = null;
    $txnType = null;
    $paymentMode = null;
    $categoryId = null;
    $accountId = null;
    $cardId = null;
    $loanId = null;
    $goalId = null;
    $udhariId = null;
    $businessOrPersonal = null;

    if ($collection === "transactions") {
        $dateRaw = $entity["date"] ?? null;
        if (is_string($dateRaw) && trim($dateRaw) !== "") {
            $ts = strtotime($dateRaw);
            if ($ts !== false) {
                $txnLocalDate = gmdate("Y-m-d", $ts);
                $txnMonth = substr($txnLocalDate, 0, 7);
            }
        }
        $t = $entity["type"] ?? null;
        $txnType = is_string($t) ? substr($t, 0, 32) : null;
        $pm = $entity["paymentMode"] ?? null;
        $paymentMode = is_string($pm) ? substr($pm, 0, 32) : null;

        $cid = $entity["categoryId"] ?? null;
        $categoryId = is_string($cid) && $cid !== "" ? substr($cid, 0, 191) : null;
        $aid = $entity["accountId"] ?? null;
        $accountId = is_string($aid) && $aid !== "" ? substr($aid, 0, 191) : null;
        $cardId = cloud_str_id($entity["linkedCardId"] ?? null);
        $loanId = cloud_str_id($entity["linkedLoanId"] ?? null);
        $goalId = cloud_str_id($entity["linkedGoalId"] ?? null);
        $udhariId = cloud_str_id($entity["linkedUdhariId"] ?? null);

        $bop = $entity["businessOrPersonal"] ?? null;
        $businessOrPersonal = is_string($bop) ? substr($bop, 0, 32) : null;
    }

    return [
        "schema_version" => $schemaVersion,
        "amount_paise" => $amountPaise,
        "txn_local_date" => $txnLocalDate,
        "txn_month" => $txnMonth,
        "txn_type" => $txnType,
        "payment_mode" => $paymentMode,
        "category_id" => $categoryId,
        "account_id" => $accountId,
        "card_id" => $cardId,
        "loan_id" => $loanId,
        "goal_id" => $goalId,
        "udhari_id" => $udhariId,
        "business_or_personal" => $businessOrPersonal,
        "source_device_id" => $sourceDeviceId,
        "payload_hash" => $payloadHash,
    ];
}

function cloud_str_id($v): ?string {
    if (!is_string($v) || $v === "") {
        return null;
    }
    return substr($v, 0, 191);
}

function cloud_transaction_types(): array {
    return [
        "income",
        "expense",
        "transfer",
        "loan_disbursement",
        "emi_payment",
        "loan_prepayment",
        "cc_payment",
        "udhari_given",
        "udhari_received",
        "udhari_collect",
        "udhari_repay",
        "udhari_write_off",
        "savings_contribution",
        "goal_withdrawal",
        "investment_contribution",
        "investment_sell",
        "refund",
        "adjustment",
    ];
}

function cloud_transaction_payment_modes(): array {
    return [
        "cash",
        "upi",
        "bank_transfer",
        "cheque",
        "debit_card",
        "credit_card",
        "wallet",
        "auto_debit",
        "other",
    ];
}

/**
 * Validates a transaction entity for cloud write paths.
 * Soft-deleted rows: only userId binding (caller); skip finance rules.
 * Mutates $entity with safe defaults for classification fields when absent.
 */
function cloud_validate_transaction_payload(string $authUserId, array &$entity): void {
    cloud_assert_entity_user_id($authUserId, $entity);

    if (((int)($entity["isDeleted"] ?? 0)) === 1) {
        return;
    }

    if (!isset($entity["businessOrPersonal"])) {
        $entity["businessOrPersonal"] = "personal";
    }
    if (!isset($entity["needWant"])) {
        $entity["needWant"] = "unassigned";
    }
    if (!isset($entity["fixedVariable"])) {
        $entity["fixedVariable"] = "unassigned";
    }
    if (!isset($entity["plannedUnplanned"])) {
        $entity["plannedUnplanned"] = "unassigned";
    }

    $id = $entity["id"] ?? null;
    if (!is_string($id) || trim($id) === "") {
        throw new InvalidArgumentException("Transaction id is required");
    }

    $type = $entity["type"] ?? null;
    if (!is_string($type) || !in_array($type, cloud_transaction_types(), true)) {
        throw new InvalidArgumentException("Invalid transaction type");
    }

    $amountPaise = null;
    if (array_key_exists("amountPaise", $entity) && $entity["amountPaise"] !== null) {
        $rawAp = $entity["amountPaise"];
        if (is_bool($rawAp)) {
            throw new InvalidArgumentException("amountPaise must be numeric");
        }
        if (is_int($rawAp)) {
            $amountPaise = $rawAp;
        } elseif (is_string($rawAp) && preg_match('/^\d+$/', $rawAp) === 1) {
            $amountPaise = (int)$rawAp;
        } elseif (is_float($rawAp) && is_finite($rawAp) && floor($rawAp) == $rawAp) {
            $amountPaise = (int)$rawAp;
        } else {
            throw new InvalidArgumentException("amountPaise must be a positive integer");
        }
        if ($amountPaise < 1) {
            throw new InvalidArgumentException("amountPaise must be a positive integer");
        }
    }
    if ($amountPaise !== null) {
        // ok
        $entity["amountPaise"] = $amountPaise;
    } elseif (array_key_exists("amount", $entity)) {
        $amountPaise = cloud_parse_money_input_to_paise($entity["amount"], "amount", false, true);
        $entity["amountPaise"] = $amountPaise;
    } else {
        throw new InvalidArgumentException("amountPaise or amount is required");
    }

    $dateRaw = $entity["date"] ?? null;
    if (!is_string($dateRaw) || trim($dateRaw) === "") {
        throw new InvalidArgumentException("date is required");
    }
    if (strtotime($dateRaw) === false) {
        throw new InvalidArgumentException("date is invalid");
    }

    $pm = $entity["paymentMode"] ?? null;
    if (!is_string($pm) || !in_array($pm, cloud_transaction_payment_modes(), true)) {
        throw new InvalidArgumentException("Invalid paymentMode");
    }

    $typesNeedCategory = ["income", "expense", "refund", "udhari_write_off"];
    if (in_array($type, $typesNeedCategory, true)) {
        $cat = $entity["categoryId"] ?? null;
        if (!is_string($cat) || trim($cat) === "") {
            throw new InvalidArgumentException("categoryId is required for this transaction type");
        }
    }

    if (($type === "expense" || $type === "refund") && $pm === "credit_card") {
        $lc = $entity["linkedCardId"] ?? null;
        if (!is_string($lc) || trim($lc) === "") {
            throw new InvalidArgumentException("linkedCardId is required for credit card expenses/refunds");
        }
    }

    $cashLikeModes = ["cash", "upi", "bank_transfer", "debit_card", "cheque", "wallet", "auto_debit", "other"];
    if (($type === "expense" || $type === "refund") && in_array($pm, $cashLikeModes, true)) {
        $acc = $entity["accountId"] ?? null;
        if (!is_string($acc) || trim($acc) === "") {
            throw new InvalidArgumentException("accountId is required for this payment mode");
        }
    }

    if (in_array($type, ["emi_payment", "loan_disbursement"], true)) {
        $ll = $entity["linkedLoanId"] ?? null;
        if (!is_string($ll) || trim($ll) === "") {
            throw new InvalidArgumentException("linkedLoanId is required for this transaction type");
        }
    }

    if ($type === "emi_payment") {
        $acc = $entity["accountId"] ?? null;
        if (!is_string($acc) || trim($acc) === "") {
            throw new InvalidArgumentException("accountId is required for emi_payment");
        }
    }

    if ($type === "loan_disbursement") {
        $acc = $entity["accountId"] ?? null;
        if (!is_string($acc) || trim($acc) === "") {
            throw new InvalidArgumentException("accountId is required for loan_disbursement");
        }
    }

    if ($type === "cc_payment") {
        $acc = $entity["accountId"] ?? null;
        if (!is_string($acc) || trim($acc) === "") {
            throw new InvalidArgumentException("accountId is required for cc_payment");
        }
        $lc = $entity["linkedCardId"] ?? null;
        if (!is_string($lc) || trim($lc) === "") {
            throw new InvalidArgumentException("linkedCardId is required for cc_payment");
        }
    }

    if ($type === "savings_contribution") {
        $lg = $entity["linkedGoalId"] ?? null;
        if (!is_string($lg) || trim($lg) === "") {
            throw new InvalidArgumentException("linkedGoalId is required for savings_contribution");
        }
        $acc = $entity["accountId"] ?? null;
        if (!is_string($acc) || trim($acc) === "") {
            throw new InvalidArgumentException("accountId is required for savings_contribution");
        }
    }

    if ($type === "investment_contribution") {
        $inv = $entity["linkedSavingsId"] ?? null;
        if (!is_string($inv) || trim($inv) === "") {
            throw new InvalidArgumentException("linkedSavingsId is required for investment_contribution");
        }
        $acc = $entity["accountId"] ?? null;
        if (!is_string($acc) || trim($acc) === "") {
            throw new InvalidArgumentException("accountId is required for investment_contribution");
        }
    }

    if ($type === "udhari_given" || $type === "udhari_received" || $type === "udhari_collect" || $type === "udhari_repay") {
        $ud = $entity["linkedUdhariId"] ?? null;
        if (!is_string($ud) || trim($ud) === "") {
            throw new InvalidArgumentException("linkedUdhariId is required for udhari transactions");
        }
        $acc = $entity["accountId"] ?? null;
        if (!is_string($acc) || trim($acc) === "") {
            throw new InvalidArgumentException("accountId is required for udhari transactions");
        }
        $person = $entity["merchantOrPerson"] ?? null;
        if (!is_string($person) || trim($person) === "") {
            throw new InvalidArgumentException("merchantOrPerson is required for udhari transactions");
        }
    }

    if ($type === "udhari_write_off") {
        $ud = $entity["linkedUdhariId"] ?? null;
        if (!is_string($ud) || trim($ud) === "") {
            throw new InvalidArgumentException("linkedUdhariId is required for udhari_write_off");
        }
        $cat = $entity["categoryId"] ?? null;
        if (!is_string($cat) || trim($cat) === "") {
            throw new InvalidArgumentException("categoryId is required for udhari_write_off");
        }
    }

    if ($type === "income" || $type === "refund") {
        $acc = $entity["accountId"] ?? null;
        if (!is_string($acc) || trim($acc) === "") {
            throw new InvalidArgumentException("accountId is required for this transaction type");
        }
    }

    if ($type === "adjustment") {
        $acc = $entity["accountId"] ?? null;
        if (!is_string($acc) || trim($acc) === "") {
            throw new InvalidArgumentException("accountId is required for adjustment");
        }
    }

    if ($type === "transfer") {
        $from = $entity["accountId"] ?? null;
        $to = $entity["toAccountId"] ?? null;
        if (!is_string($from) || trim($from) === "" || !is_string($to) || trim($to) === "") {
            throw new InvalidArgumentException("transfer requires accountId and toAccountId");
        }
        if ($from === $to) {
            throw new InvalidArgumentException("transfer from and to account must differ");
        }
    }

    $bop = $entity["businessOrPersonal"] ?? "personal";
    if (!is_string($bop) || !in_array($bop, ["personal", "business", "mixed"], true)) {
        throw new InvalidArgumentException("businessOrPersonal must be personal, business, or mixed");
    }

    $nw = $entity["needWant"] ?? "unassigned";
    if (!is_string($nw) || !in_array($nw, ["need", "want", "luxury", "unassigned"], true)) {
        throw new InvalidArgumentException("needWant must be need, want, luxury, or unassigned");
    }

    $fv = $entity["fixedVariable"] ?? "unassigned";
    if (!is_string($fv) || !in_array($fv, ["fixed", "variable", "unassigned"], true)) {
        throw new InvalidArgumentException("fixedVariable must be fixed, variable, or unassigned");
    }

    $pu = $entity["plannedUnplanned"] ?? "unassigned";
    if (!is_string($pu) || !in_array($pu, ["planned", "unplanned", "unassigned"], true)) {
        throw new InvalidArgumentException("plannedUnplanned must be planned, unplanned, or unassigned");
    }
}

function cloud_validate_goal_contrib_payload(string $authUserId, array &$entity): void {
    cloud_assert_entity_user_id($authUserId, $entity);
    $goalId = $entity["goalId"] ?? null;
    if (!is_string($goalId) || $goalId === "" || strlen($goalId) > 191) {
        throw new InvalidArgumentException("goalContribs.goalId is required");
    }
    $amountPaise = $entity["amountPaise"] ?? null;
    if (!is_int($amountPaise) || $amountPaise < 0 || $amountPaise > 1000000000000) {
        throw new InvalidArgumentException("goalContribs.amountPaise must be a non-negative paise integer");
    }
    $mode = null;
    $notes = $entity["notes"] ?? "";
    if (is_string($notes) && preg_match('/fundingMode:(earmark|funded_transfer|linked_asset_allocation)\b/', $notes, $m)) {
        $mode = $m[1];
    }
    if (isset($entity["fundingMode"])) {
        if (!in_array($entity["fundingMode"], ["earmark", "funded_transfer", "linked_asset_allocation"], true)) {
            throw new InvalidArgumentException("Invalid goal fundingMode");
        }
        $mode = $entity["fundingMode"];
    }
    if ($mode === "funded_transfer") {
        $txId = $entity["transactionId"] ?? null;
        $source = $entity["sourceAccountId"] ?? null;
        if (!is_string($txId) || $txId === "") {
            throw new InvalidArgumentException("funded_transfer contributions require transactionId");
        }
        if (!is_string($source) || $source === "") {
            throw new InvalidArgumentException("funded_transfer contributions require sourceAccountId");
        }
        if ($amountPaise <= 0) {
            throw new InvalidArgumentException("funded_transfer amount must be positive");
        }
    }
    if ($mode === "earmark") {
        // Earmark must not invent a cash-moving transaction id.
        if (!empty($entity["transactionId"])) {
            throw new InvalidArgumentException("earmark contributions must not reference a cash-moving transactionId");
        }
    }
}

function cloud_validate_entity_for_collection(string $authUserId, string $collection, array &$entity): void {
    cloud_assert_entity_user_id($authUserId, $entity);
    if ($collection === "transactions") {
        cloud_validate_transaction_payload($authUserId, $entity);
    }
    if ($collection === "goalContribs") {
        cloud_validate_goal_contrib_payload($authUserId, $entity);
    }
}

/** Column list for INSERT / ON DUPLICATE KEY UPDATE (matches migration phase_04). */
function cloud_ccr_indexed_column_sql(): string {
    return "schema_version, amount_paise, txn_local_date, txn_month, txn_type, payment_mode, "
        . "category_id, account_id, card_id, loan_id, goal_id, udhari_id, business_or_personal, "
        . "source_device_id, payload_hash";
}

function cloud_ccr_upsert_on_duplicate_sql(): string {
    $parts = [];
    foreach (explode(", ", cloud_ccr_indexed_column_sql()) as $c) {
        $parts[] = "{$c} = VALUES({$c})";
    }
    return "payload = VALUES(payload), updated_at = VALUES(updated_at), deleted_at = VALUES(deleted_at), "
        . implode(", ", $parts);
}

/**
 * @return array{0: string, 1: array<int, mixed>} SQL with placeholders + execute params
 */
function cloud_ccr_build_upsert(string $authUserId, string $collection, string $entityId, array $entity, string $updatedDateSql, ?string $deletedAtSql, string $newRowPkId): array {
    $payloadJson = encode_payload($entity);
    cloud_validate_encoded_payload_size($payloadJson, $collection . "/" . $entityId);
    $idx = cloud_ccr_compute_indexed($collection, $entity, $payloadJson);
    $indexedCols = cloud_ccr_indexed_column_sql();
    $dup = cloud_ccr_upsert_on_duplicate_sql();
    $sql = "INSERT INTO cloud_collection_rows (id, user_id, collection_name, entity_id, payload, updated_at, deleted_at, {$indexedCols})
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE {$dup}";
    $params = [
        $newRowPkId,
        $authUserId,
        $collection,
        $entityId,
        $payloadJson,
        $updatedDateSql,
        $deletedAtSql,
        $idx["schema_version"],
        $idx["amount_paise"],
        $idx["txn_local_date"],
        $idx["txn_month"],
        $idx["txn_type"],
        $idx["payment_mode"],
        $idx["category_id"],
        $idx["account_id"],
        $idx["card_id"],
        $idx["loan_id"],
        $idx["goal_id"],
        $idx["udhari_id"],
        $idx["business_or_personal"],
        $idx["source_device_id"],
        $idx["payload_hash"],
    ];
    return [$sql, $params];
}

/**
 * @return array{0: string, 1: array<int, mixed>}
 */
function cloud_ccr_build_update_by_table_id(array $entity, string $collection, string $updatedDateSql, ?string $deletedAtSql, string $tableRowId): array {
    $payloadJson = encode_payload($entity);
    $entityId = (string)($entity["id"] ?? "");
    cloud_validate_encoded_payload_size($payloadJson, $collection . "/" . $entityId);
    $idx = cloud_ccr_compute_indexed($collection, $entity, $payloadJson);
    $sql = "UPDATE cloud_collection_rows SET payload = ?, updated_at = ?, deleted_at = ?, schema_version = ?, amount_paise = ?, "
        . "txn_local_date = ?, txn_month = ?, txn_type = ?, payment_mode = ?, category_id = ?, account_id = ?, "
        . "card_id = ?, loan_id = ?, goal_id = ?, udhari_id = ?, business_or_personal = ?, source_device_id = ?, payload_hash = ? "
        . "WHERE id = ?";
    $params = [
        $payloadJson,
        $updatedDateSql,
        $deletedAtSql,
        $idx["schema_version"],
        $idx["amount_paise"],
        $idx["txn_local_date"],
        $idx["txn_month"],
        $idx["txn_type"],
        $idx["payment_mode"],
        $idx["category_id"],
        $idx["account_id"],
        $idx["card_id"],
        $idx["loan_id"],
        $idx["goal_id"],
        $idx["udhari_id"],
        $idx["business_or_personal"],
        $idx["source_device_id"],
        $idx["payload_hash"],
        $tableRowId,
    ];
    return [$sql, $params];
}
