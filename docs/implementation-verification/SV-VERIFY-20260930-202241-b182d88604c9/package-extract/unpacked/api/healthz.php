<?php
/**
 * /api/healthz.php — production liveness/readiness for company + personal stack.
 * GET only. Returns 200 when DB is up and company schema is present; else 503.
 */
require_once __DIR__ . "/../php/bootstrap_api.php";
require_once __DIR__ . "/../php/config/db.php";
require_once __DIR__ . "/../php/helpers/http.php";

if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "GET") {
    json_error("Method not allowed", 405);
    exit;
}

$started = microtime(true);
$checks = [
    "db" => ["ok" => false, "latencyMs" => null, "error" => null],
    "companyTables" => ["ok" => false, "count" => 0, "minRequired" => 20],
    "version" => ["app" => null, "schema" => null],
];

try {
    $pkgPath = dirname(__DIR__) . "/package.json";
    if (is_file($pkgPath)) {
        $pkg = json_decode((string)file_get_contents($pkgPath), true);
        $checks["version"]["app"] = is_array($pkg) ? (string)($pkg["version"] ?? "0.0.0") : null;
    }
} catch (Throwable) {
    /* ignore */
}

try {
    $db = db_conn();
    $t0 = microtime(true);
    $db->query("SELECT 1");
    $checks["db"]["latencyMs"] = (int)round((microtime(true) - $t0) * 1000);
    $checks["db"]["ok"] = true;

    $tables = $db->query("SHOW TABLES LIKE 'company_%'")->fetchAll(PDO::FETCH_COLUMN);
    $checks["companyTables"]["count"] = count($tables);
    $checks["companyTables"]["ok"] = count($tables) >= $checks["companyTables"]["minRequired"];

    try {
        $row = $db->query("SELECT version_key FROM schema_version ORDER BY applied_at DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        $checks["version"]["schema"] = $row ? (string)$row["version_key"] : null;
    } catch (Throwable) {
        $checks["version"]["schema"] = null;
    }
} catch (Throwable $e) {
    $checks["db"]["error"] = substr($e->getMessage(), 0, 120);
}

$healthy = $checks["db"]["ok"] && $checks["companyTables"]["ok"];
json_ok(
    [
        "status" => $healthy ? "healthy" : "degraded",
        "service" => "sparowvault-company",
        "checks" => $checks,
        "appEnv" => env_value("APP_ENV", "development"),
        "time" => gmdate("c"),
        "totalMs" => (int)round((microtime(true) - $started) * 1000),
    ],
    $healthy ? 200 : 503,
);
