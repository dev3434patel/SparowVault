<?php
/**
 * Phase 17 — request id + structured logging primitive.
 *
 * Mint a unique request id at the top of every request (use bootstrap_api.php
 * to require this), attach it to $_SERVER and to the response header so
 * monitoring + customer support can correlate.
 *
 * Honours an inbound `X-Request-Id` if the caller already supplied one
 * (useful when a reverse proxy / Cloudflare assigns it).
 */

function ensure_request_id(): string {
    if (!empty($_SERVER["REQUEST_ID"]) && is_string($_SERVER["REQUEST_ID"])) {
        return $_SERVER["REQUEST_ID"];
    }
    $inbound = trim((string)($_SERVER["HTTP_X_REQUEST_ID"] ?? ""));
    if ($inbound !== "" && preg_match('/^[A-Za-z0-9_\-]{1,64}$/', $inbound)) {
        $rid = $inbound;
    } else {
        $rid = bin2hex(random_bytes(8));
    }
    $_SERVER["REQUEST_ID"] = $rid;
    if (!headers_sent()) {
        header("X-Request-Id: " . $rid);
    }
    return $rid;
}

/**
 * Structured JSON log line. Includes request id automatically so log
 * aggregators can group lines by request.
 *
 * Sensitive keys (pin / password / token / authorization / secret) are
 * scrubbed before serialisation.
 */
function structured_log(string $level, string $message, array $context = []): void {
    $scrubKeys = ["pin", "password", "token", "authorization", "secret", "pinSalt", "pin_hash", "pin_salt"];
    $clean = [];
    foreach ($context as $k => $v) {
        if (in_array(strtolower((string)$k), $scrubKeys, true)) continue;
        $clean[$k] = $v;
    }
    $entry = [
        "ts"        => gmdate("c"),
        "level"     => $level,
        "msg"       => $message,
        "requestId" => $_SERVER["REQUEST_ID"] ?? "",
        "userId"    => $_SERVER["AUTH_USER_ID"] ?? null,
        "ctx"       => $clean,
    ];
    // One JSON line per log entry — keeps it grep-able and aggregator-friendly.
    error_log(json_encode($entry, JSON_UNESCAPED_SLASHES));
}
