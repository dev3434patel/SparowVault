<?php

require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/app.php";
require_once __DIR__ . "/../config/db.php";

function public_config_get(): void {
    $settings = setting_get_map(true);
    $flags = flag_get_map();
    json_ok([
        "settings" => $settings,
        "featureFlags" => $flags,
    ]);
}

/**
 * Phase 17 — richer /api/health.php response.
 *
 * Reports app status + DB connectivity + (optional) DB ping latency +
 * environment marker + version (from schema_version) + timestamp +
 * request id so monitoring tools can correlate.
 *
 * Production setups should wire UptimeRobot / Better Uptime against
 * this endpoint, expecting `ok:true` and `data.status == "healthy"`.
 */
function health_check_get(): void {
    $started = microtime(true);
    $dbStatus = "unknown";
    $dbLatencyMs = null;
    $schemaVersion = null;
    try {
        $db = db_conn();
        $dbStart = microtime(true);
        $db->query("SELECT 1");
        $dbLatencyMs = (int)round((microtime(true) - $dbStart) * 1000);
        $dbStatus = "ok";
        try {
            $st = $db->query("SELECT version_key FROM schema_version ORDER BY applied_at DESC LIMIT 1");
            $row = $st->fetch();
            $schemaVersion = $row ? (string)$row["version_key"] : null;
        } catch (Throwable) {
            $schemaVersion = null; // table absent on legacy installs — that's fine
        }
    } catch (Throwable $e) {
        $dbStatus = "down: " . substr($e->getMessage(), 0, 64);
    }

    $env = app_env();
    $razorpayEnabled = strtolower((string)(env_value("ENABLE_RAZORPAY", "false") ?? "false")) === "true";

    $appHealthy = $dbStatus === "ok";
    json_ok([
        "status"          => $appHealthy ? "healthy" : "degraded",
        "appEnv"          => $env,
        "version"         => $schemaVersion,
        "razorpayEnabled" => $razorpayEnabled,
        "db"              => ["status" => $dbStatus, "latencyMs" => $dbLatencyMs],
        "requestId"       => (string)($_SERVER["REQUEST_ID"] ?? ""),
        "totalMs"         => (int)round((microtime(true) - $started) * 1000),
        "time"            => gmdate("c"),
    ], $appHealthy ? 200 : 503);
}

