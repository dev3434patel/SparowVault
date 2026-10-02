<?php
/**
 * Phase 13 — policy version bookkeeping + acceptance.
 *
 * Policy versions are stored as a constant map; bumping any value here forces
 * every user to accept on next sign-in.
 */
require_once __DIR__ . "/../config/db.php";

function policy_current_versions(): array {
    return [
        "terms"            => "2026-05-13",
        "privacy"          => "2026-05-13",
        "cookie"           => "2026-05-13",
        "data_processing"  => "2026-05-13",
    ];
}

function policy_required_for_auth(): array {
    return ["terms", "privacy"];
}

function policy_user_outstanding_keys(string $userId): array {
    $current = policy_current_versions();
    $db = db_conn();
    $st = $db->prepare(
        "SELECT policy_key, version
           FROM user_policy_acceptances
          WHERE user_id = ? AND withdrawn_at IS NULL"
    );
    $st->execute([$userId]);
    $accepted = [];
    while ($row = $st->fetch()) {
        $accepted[$row["policy_key"]] = $row["version"];
    }
    $outstanding = [];
    foreach (policy_required_for_auth() as $key) {
        $version = $current[$key] ?? null;
        if ($version === null) {
            continue;
        }
        if (!isset($accepted[$key]) || $accepted[$key] !== $version) {
            $outstanding[] = ["key" => $key, "version" => $version];
        }
    }
    return $outstanding;
}

function policy_record_acceptance(string $userId, string $policyKey, string $version, string $ip, string $userAgent): void {
    $current = policy_current_versions();
    if (!isset($current[$policyKey])) {
        throw new InvalidArgumentException("Unknown policy_key: {$policyKey}");
    }
    if ($current[$policyKey] !== $version) {
        throw new InvalidArgumentException("Version mismatch: server expects {$current[$policyKey]} for {$policyKey}");
    }
    $db = db_conn();
    $st = $db->prepare(
        "INSERT INTO user_policy_acceptances
           (user_id, policy_key, version, accepted_at, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, UTC_TIMESTAMP(), ?, ?, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
           accepted_at = VALUES(accepted_at),
           ip_address  = VALUES(ip_address),
           user_agent  = VALUES(user_agent),
           withdrawn_at = NULL"
    );
    $st->execute([$userId, $policyKey, $version, substr($ip, 0, 64), substr($userAgent, 0, 512)]);
}

function policy_mark_user_checked(string $userId): void {
    $db = db_conn();
    try {
        $db->prepare("UPDATE users SET last_policy_check_at = UTC_TIMESTAMP() WHERE id = ?")->execute([$userId]);
    } catch (Throwable) {
        // last_policy_check_at column may not exist on unmigrated environments.
    }
}
