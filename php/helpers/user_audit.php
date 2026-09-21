<?php
/**
 * Phase 13 — user-side audit trail.
 *
 * Companion to admin_audit_logs. Use for high-value user actions:
 * PIN change, profile update, subscription cancel, data export,
 * account deletion, bulk import, card/loan create/delete.
 *
 * On unmigrated environments (where user_audit_logs is missing) this
 * silently swallows the exception so the calling endpoint still succeeds.
 */
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/audit.php"; // for actor_ip_address / actor_user_agent

function user_audit_log(string $userId, string $actionKey, string $entityType = "", string $entityId = "", $before = null, $after = null, string $requestId = "", bool $strict = false): void {
    try {
        $db = db_conn();
        $st = $db->prepare(
            "INSERT INTO user_audit_logs
               (user_id, action_key, entity_type, entity_id, before_json, after_json, ip_address, user_agent, request_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())"
        );
        $st->execute([
            $userId,
            $actionKey,
            $entityType,
            $entityId,
            $before === null ? null : json_encode($before, JSON_UNESCAPED_SLASHES),
            $after === null ? null : json_encode($after, JSON_UNESCAPED_SLASHES),
            actor_ip_address(),
            actor_user_agent(),
            substr($requestId, 0, 64),
        ]);
    } catch (Throwable $e) {
        if ($strict) throw $e;
        // Phase 13 known issue: tolerate the table being absent on legacy
        // environments. Still log to error_log so it isn't invisible.
        error_log("[user_audit_log] " . $e->getMessage());
    }
}
