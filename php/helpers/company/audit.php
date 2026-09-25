<?php
declare(strict_types=1);

require_once __DIR__ . "/ids.php";

function company_audit_write(
    PDO $db,
    string $companyId,
    ?string $actorUserId,
    string $action,
    string $entityType,
    string $entityId,
    $before,
    $after,
    ?string $reason = null
): void {
    $ip = (string)($_SERVER["REMOTE_ADDR"] ?? "");
    $ua = (string)($_SERVER["HTTP_USER_AGENT"] ?? "");
    $sessionId = null;
    $st = $db->prepare(
        "INSERT INTO company_audit_logs (
            id, company_id, actor_user_id, action, entity_type, entity_id,
            before_json, after_json, reason, ip, user_agent, session_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())"
    );
    $st->execute([
        company_new_id(),
        $companyId,
        $actorUserId,
        $action,
        $entityType,
        $entityId,
        $before === null ? null : json_encode($before, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        $after === null ? null : json_encode($after, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        $reason,
        $ip === "" ? null : substr($ip, 0, 64),
        $ua === "" ? null : substr($ua, 0, 512),
        $sessionId,
    ]);
}
