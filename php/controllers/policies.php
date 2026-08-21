<?php
/**
 * Phase 13 — policy acceptance endpoints.
 */
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/policy.php";
require_once __DIR__ . "/../helpers/user_audit.php";

function policies_current(): void {
    $current = policy_current_versions();
    $outstanding = [];
    try {
        $auth = auth_require_active_user();
        $outstanding = policy_user_outstanding_keys($auth["id"]);
        policy_mark_user_checked($auth["id"]);
    } catch (Throwable) {
        // unauthenticated → just return current versions
    }
    json_ok([
        "versions"    => $current,
        "outstanding" => $outstanding,
    ]);
}

function policies_accept(): void {
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error("Unauthorized", 401, "UNAUTHORIZED");
        return;
    }
    $body = require_json_body();
    $accept = $body["accept"] ?? [];
    if (!is_array($accept) || count($accept) === 0) {
        json_error("'accept' must be a non-empty array of {key, version}", 422, "VALIDATION_ERROR");
        return;
    }
    $ip = (string)($_SERVER["REMOTE_ADDR"] ?? "");
    $ua = (string)($_SERVER["HTTP_USER_AGENT"] ?? "");
    $accepted = [];
    foreach ($accept as $item) {
        $key = (string)($item["key"] ?? "");
        $ver = (string)($item["version"] ?? "");
        try {
            policy_record_acceptance($auth["id"], $key, $ver, $ip, $ua);
            $accepted[] = ["key" => $key, "version" => $ver];
        } catch (InvalidArgumentException $e) {
            json_error($e->getMessage(), 422, "VALIDATION_ERROR");
            return;
        }
    }
    user_audit_log($auth["id"], "POLICY_ACCEPTED", "policy", json_encode($accepted), null, $accepted);
    json_ok(["accepted" => $accepted]);
}
