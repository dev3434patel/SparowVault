<?php
/**
 * Financial mutation idempotency — unique (user_id, mutation_id).
 */

function financial_mutation_table_ready(PDO $db): bool {
    static $ready = null;
    if ($ready !== null) return $ready;
    try {
        $db->query("SELECT 1 FROM financial_mutation_keys LIMIT 0");
        $ready = true;
        return true;
    } catch (Throwable) {
        // Auto-provision for cert/dev environments so idempotency is enforceable.
        try {
            $db->exec(
                "CREATE TABLE IF NOT EXISTS financial_mutation_keys (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  user_id VARCHAR(64) NOT NULL,
                  mutation_id VARCHAR(128) NOT NULL,
                  collection_name VARCHAR(64) NOT NULL,
                  entity_id VARCHAR(64) NOT NULL,
                  operation VARCHAR(32) NOT NULL DEFAULT 'create',
                  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  UNIQUE KEY uq_fin_mut_user_mutation (user_id, mutation_id),
                  KEY idx_fin_mut_entity (user_id, collection_name, entity_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
            );
            $ready = true;
            return true;
        } catch (Throwable) {
            $ready = false;
            return false;
        }
    }
}

/**
 * @return array{hit:bool,entityId:?string}|null null if table missing (soft skip)
 */
function financial_mutation_lookup(PDO $db, string $userId, string $mutationId): ?array {
    if ($mutationId === "" || !financial_mutation_table_ready($db)) {
        return null;
    }
    $st = $db->prepare(
        "SELECT entity_id FROM financial_mutation_keys WHERE user_id = ? AND mutation_id = ? LIMIT 1"
    );
    $st->execute([$userId, $mutationId]);
    $row = $st->fetch();
    if (!$row) {
        return ["hit" => false, "entityId" => null];
    }
    return ["hit" => true, "entityId" => (string)$row["entity_id"]];
}

function financial_mutation_record(
    PDO $db,
    string $userId,
    string $mutationId,
    string $collection,
    string $entityId,
    string $operation = "create"
): void {
    if ($mutationId === "" || !financial_mutation_table_ready($db)) {
        return;
    }
    try {
        $st = $db->prepare(
            "INSERT INTO financial_mutation_keys (user_id, mutation_id, collection_name, entity_id, operation)
             VALUES (?, ?, ?, ?, ?)"
        );
        $st->execute([$userId, $mutationId, $collection, $entityId, $operation]);
    } catch (Throwable $e) {
        // Unique race — caller should re-lookup
        throw $e;
    }
}
