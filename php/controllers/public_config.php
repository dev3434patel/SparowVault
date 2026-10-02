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
 * Personal readiness for /api/health.php.
 *
 * A 200 body means status "healthy": SELECT 1 succeeded and the personal schema
 * is present. Process existence is not health. An empty secret or missing database
 * is not_configured (non-200) and does not open a socket. Database-down and a
 * missing schema are non-200. The body is bounded and contains no credentials
 * and no schema dump.
 *
 * This check does not read /api/healthz.php and does not require a company table count.
 * /api/healthz.php remains company liveness.
 */
function health_check_get(): void {
    if (health_block_unready()) {
        return;
    }
    $started = microtime(true);
    $dbOk = false;
    $schemaOk = false;
    try {
        $db = db_conn();
        $db->query("SELECT 1");
        $dbOk = true;
        $schemaOk = personal_readiness_schema_present($db);
    } catch (Throwable) {
        $dbOk = false;
        $schemaOk = false;
    }

    $healthy = $dbOk && $schemaOk;
    json_ok([
        "status" => $healthy ? "healthy" : "unavailable",
        "appEnv" => app_env(),
        "checks" => [
            "db" => $dbOk ? "ok" : "down",
            "schema" => $schemaOk ? "ok" : "missing",
        ],
        "requestId" => (string)($_SERVER["REQUEST_ID"] ?? ""),
        "totalMs" => (int)round((microtime(true) - $started) * 1000),
        "time" => gmdate("c"),
    ], $healthy ? 200 : 503);
}

/**
 * Personal tables only. Company table counts are not part of this result.
 */
function personal_readiness_schema_present(PDO $db): bool {
    $required = ["users", "cloud_collection_rows", "schema_version"];
    $st = $db->prepare(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?,?,?)"
    );
    $st->execute($required);
    $found = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $found[strtolower((string)($row["table_name"] ?? $row["TABLE_NAME"] ?? ""))] = true;
    }
    foreach ($required as $name) {
        if (!isset($found[$name])) {
            return false;
        }
    }
    $count = $db->query("SELECT COUNT(*) FROM schema_version")->fetchColumn();
    return (int)$count > 0;
}

