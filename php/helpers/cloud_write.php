<?php

require_once __DIR__ . "/cloud_payload.php";
require_once __DIR__ . "/finance_events.php";
require_once __DIR__ . "/household_auth.php";
require_once __DIR__ . "/user_audit.php";
require_once __DIR__ . "/expense_contributions.php";
require_once __DIR__ . "/billing.php";

class CloudWriteException extends RuntimeException {
    public function __construct(string $message, public int $status, public string $errorCode) {
        parent::__construct($message);
    }
}

function cloud_write_canonical($value) {
    if (!is_array($value)) return $value;
    if (!array_is_list($value)) ksort($value, SORT_STRING);
    foreach ($value as $key => $item) $value[$key] = cloud_write_canonical($item);
    return $value;
}

function cloud_write_hash(array $request): string {
    return hash("sha256", json_encode(cloud_write_canonical($request), JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION));
}

/** Serialize a user's writes, including missing-row inserts and reference checks. */
function cloud_write_atomic(PDO $db, string $userId, array $request, callable $write, int $status = 200): array {
    $key = $request["mutationId"] ?? "";
    if (!is_string($key) || ($key !== "" && !preg_match('/^[A-Za-z0-9_:.-]{1,128}$/D', $key))) {
        throw new CloudWriteException("Invalid mutationId", 422, "VALIDATION_ERROR");
    }
    $hash = cloud_write_hash($request);
    $db->beginTransaction();
    try {
        $lock = $db->prepare("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL FOR UPDATE");
        $lock->execute([$userId]);
        if (!$lock->fetch()) throw new CloudWriteException("User unavailable", 401, "UNAUTHORIZED");
        if ($key !== "") {
            $receipt = $db->prepare("SELECT request_hash, response_json, http_status FROM financial_write_receipts WHERE user_id = ? AND mutation_id = ?");
            $receipt->execute([$userId, $key]);
            if ($found = $receipt->fetch()) {
                if (!hash_equals($found["request_hash"], $hash)) {
                    throw new CloudWriteException("Mutation key was already used for a different request", 409, "IDEMPOTENCY_CONFLICT");
                }
                $db->commit();
                return [json_decode($found["response_json"], true, 512, JSON_THROW_ON_ERROR), (int)$found["http_status"]];
            }
            // Old keys have no payload hash or immutable result. Never replay them blindly.
            $legacyTable = $db->query("SHOW TABLES LIKE 'financial_mutation_keys'")->fetch();
            if ($legacyTable) {
                $legacy = $db->prepare("SELECT 1 FROM financial_mutation_keys WHERE user_id = ? AND mutation_id = ?");
                $legacy->execute([$userId, $key]);
                if ($legacy->fetch()) throw new CloudWriteException("Legacy mutation requires reconciliation", 409, "LEGACY_MUTATION_CONFLICT");
            }
        }
        $result = $write();
        if ($key !== "") {
            $save = $db->prepare("INSERT INTO financial_write_receipts (user_id, mutation_id, request_hash, response_json, http_status) VALUES (?, ?, ?, ?, ?)");
            $save->execute([$userId, $key, $hash, json_encode($result, JSON_THROW_ON_ERROR), $status]);
        }
        $db->commit();
        return [$result, $status];
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

function cloud_write_respond(string $userId, array $request, callable $write, int $status = 200): void {
    try {
        [$result, $code] = cloud_write_atomic(db_conn(), $userId, $request, $write, $status);
        json_ok($result, $code);
    } catch (CloudWriteException $error) {
        json_error($error->getMessage(), $error->status, $error->errorCode);
    } catch (InvalidArgumentException $error) {
        json_error($error->getMessage(), 422, "VALIDATION_ERROR");
    } catch (Throwable $error) {
        error_log("[cloud_write] " . $error->getMessage());
        json_error("The write could not be completed. Your changes were not committed.", 503, "WRITE_UNAVAILABLE");
    }
}

function cloud_write_row(PDO $db, string $userId, string $collection, string $id): ?array {
    $st = $db->prepare("SELECT payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ? AND entity_id = ?");
    $st->execute([$userId, $collection, $id]);
    $row = $st->fetch();
    return $row ? decode_payload($row["payload"]) : null;
}

function cloud_write_check_version(array $current, $expected, bool $required = false): void {
    if ($expected === null && !$required) return; // Legacy endpoints remain compatible during client rollout.
    if (!is_int($expected) || $expected < 1) {
        throw new CloudWriteException("expectedVersion is required for an existing record", 428, "VERSION_REQUIRED");
    }
    if ($expected !== (int)($current["version"] ?? 1)) {
        throw new CloudWriteException("Record changed on the server. Review before retrying.", 409, "VERSION_CONFLICT");
    }
}

function cloud_transaction_references(): array {
    return [
        "accountId" => "accounts", "fromAccountId" => "accounts", "toAccountId" => "accounts",
        "categoryId" => "categories", "linkedCardId" => "cards", "linkedLoanId" => "loans",
        "linkedGoalId" => "goals", "linkedUdhariId" => "udhari", "linkedInvestmentId" => "investments",
        "linkedSavingsId" => "investments", "originalTransactionId" => "transactions",
        "linkedTransactionId" => "transactions", "cardEmiPlanId" => "cardEmiPlans",
        "linkedOriginalTransactionId" => "transactions", "linkedCardEmiPlanId" => "cardEmiPlans",
    ];
}

function cloud_write_validate_references(PDO $db, string $userId, string $collection, array $entity): void {
    if ($collection !== "transactions" || (int)($entity["isDeleted"] ?? 0) === 1) return;
    validate_expense_recoveries($db, $userId, $entity);
    foreach (cloud_transaction_references() as $field => $target) {
        $id = $entity[$field] ?? null;
        if ($id === null || $id === "") continue;
        $parent = is_string($id) ? cloud_write_row($db, $userId, $target, $id) : null;
        if (!$parent || (int)($parent["isDeleted"] ?? 0) === 1 || ($target === "transactions" && $id === $entity["id"])) {
            throw new InvalidArgumentException($field . " must reference an active record owned by this user");
        }
    }
}

function cloud_write_prevent_orphans(PDO $db, string $userId, string $collection, string $id): void {
    $fields = array_keys(array_filter(cloud_transaction_references(), fn($target) => $target === $collection));
    if (!$fields) return;
    $st = $db->prepare("SELECT payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = 'transactions' AND deleted_at IS NULL");
    $st->execute([$userId]);
    while ($row = $st->fetch()) {
        $tx = decode_payload($row["payload"]);
        foreach ($fields as $field) {
            if (($tx[$field] ?? null) === $id) {
                throw new CloudWriteException("Record is referenced by an active transaction", 409, "REFERENCE_CONFLICT");
            }
        }
    }
}

/** Caller owns the transaction; source, derived ledger and server audit commit together. */
function cloud_write_save(PDO $db, string $userId, string $collection, array $next, ?array $before = null, bool $deferReferences = false): array {
    if (!$db->inTransaction()) throw new LogicException("Financial writes require a transaction");
    $id = $next["id"] ?? null;
    if (!is_string($id) || $id === "" || strlen($id) > 191) throw new InvalidArgumentException("Invalid entity id");
    $tombstone = $db->prepare("SELECT 1 FROM financial_entity_tombstones WHERE user_id = ? AND collection_name = ? AND entity_id = ?");
    $tombstone->execute([$userId, $collection, $id]);
    if ($tombstone->fetch()) throw new CloudWriteException("This record was permanently deleted", 409, "DELETED_ENTITY_CONFLICT");
    cloud_validate_entity_for_collection($userId, $collection, $next);
    cloud_validate_money_fields($collection, $next);
    if ($collection === "transactions") {
        if ($before !== null || (int)($next["isDeleted"] ?? 0) === 1) {
            // edits, soft-deletes, and ledger reversals are not capped
        } else {
            $limit = billing_max_transactions_per_month($userId);
            if ($limit !== null) {
                $used = billing_count_transactions_in_month($db, $userId, gmdate("Y-m"));
                if ($used >= $limit) {
                    throw new CloudWriteException(
                        "Monthly transaction limit reached for your plan.",
                        422,
                        "PLAN_QUOTA_EXCEEDED"
                    );
                }
            }
        }
    }
    if ($before) cloud_enforce_household_write($db, $userId, $collection, $before);
    cloud_enforce_household_write($db, $userId, $collection, $next);
    if (!$deferReferences) cloud_write_validate_references($db, $userId, $collection, $next);
    $deleted = (int)($next["isDeleted"] ?? 0) === 1;
    if ($deleted && !$deferReferences) cloud_write_prevent_orphans($db, $userId, $collection, $id);
    [$sql, $params] = cloud_ccr_build_upsert($userId, $collection, $id, $next, gmdate("Y-m-d H:i:s"), $deleted ? gmdate("Y-m-d H:i:s") : null, uid("row"));
    $db->prepare($sql)->execute($params);
    if ($collection === "transactions" && !$deferReferences) finance_events_sync_transaction($db, $userId, $next);
    user_audit_log($userId, $collection . ($deleted ? ".delete" : ($before ? ".edit" : ".create")), $collection, $id, $before, $next, "", true);
    return $next;
}

function cloud_write_hard_delete(PDO $db, string $userId, string $collection, string $id): void {
    $before = cloud_write_row($db, $userId, $collection, $id);
    if (!$before) throw new CloudWriteException("Entity not found", 404, "NOT_FOUND");
    cloud_enforce_household_write($db, $userId, $collection, $before);
    cloud_write_prevent_orphans($db, $userId, $collection, $id);
    if ($collection === "transactions") fe_void_ledger_for_transaction($db, $userId, $id);
    $db->prepare("INSERT INTO financial_entity_tombstones (user_id, collection_name, entity_id) VALUES (?, ?, ?)")->execute([$userId, $collection, $id]);
    $db->prepare("DELETE FROM cloud_collection_rows WHERE user_id = ? AND collection_name = ? AND entity_id = ?")->execute([$userId, $collection, $id]);
    user_audit_log($userId, $collection . ".hard_delete", $collection, $id, $before, null, "", true);
}
