<?php

require_once __DIR__ . "/../config/db.php";

function actor_ip_address(): string {
    $value = (string)($_SERVER["REMOTE_ADDR"] ?? "");
    return $value === "" ? "unknown" : substr($value, 0, 64);
}

function actor_user_agent(): string {
    $value = (string)($_SERVER["HTTP_USER_AGENT"] ?? "");
    return $value === "" ? "unknown" : substr($value, 0, 512);
}

function audit_log_action(?string $actorUserId, string $actorRole, string $actionKey, string $entityType, string $entityId, $before, $after): void {
    $db = db_conn();
    $st = $db->prepare(
        "INSERT INTO audit_logs (
            actor_user_id, actor_role, action_key, entity_type, entity_id, before_json, after_json, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())"
    );
    $st->execute([
        $actorUserId,
        $actorRole,
        $actionKey,
        $entityType,
        $entityId,
        $before === null ? null : json_encode($before, JSON_UNESCAPED_SLASHES),
        $after === null ? null : json_encode($after, JSON_UNESCAPED_SLASHES),
        actor_ip_address(),
        actor_user_agent(),
    ]);
}

