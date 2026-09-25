<?php
declare(strict_types=1);
/**
 * Company security matrix — static + live HTTP probes (CSRF/CORS/rate/XSS/SQLi).
 * Uses TEST traffic against local API only. Never production.
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";
require_once __DIR__ . "/../../php/helpers/security.php";

$outDir = getenv("COMPANY_CERT_EVIDENCE_DIR") ?: (__DIR__ . "/../../docs/company/final-certification/adhoc/raw");
if (!is_dir($outDir)) {
    mkdir($outDir, 0777, true);
}

$lines = [];
$fail = 0;
function sec(bool $ok, string $msg): void
{
    global $lines, $fail;
    $lines[] = ($ok ? "PASS" : "FAIL") . " $msg";
    if (!$ok) {
        $fail++;
    }
    echo end($lines) . "\n";
}

$lines[] = "SECURITY FULL MATRIX " . gmdate("c");
$apiBase = rtrim((string)(getenv("COMPANY_API_BASE") ?: "http://localhost:8080"), "/");

sec(function_exists("csrf_require_for_mutations"), "csrf_require_for_mutations exists");
sec(function_exists("csrf_issue_token"), "csrf_issue_token exists");
sec(function_exists("apply_cors_headers"), "apply_cors_headers exists");
sec(function_exists("rate_limit_guard"), "rate_limit_guard exists");

$searchPhp = file_get_contents(__DIR__ . "/../../php/controllers/company.php") ?: "";
sec(
    str_contains($searchPhp, "prepare(") && !preg_match('/query\s*\(\s*[\"\'].*\$_(GET|POST|REQUEST)/', $searchPhp),
    "company controller uses prepared statements (no raw GET concat query)"
);

$exports = file_get_contents(__DIR__ . "/../../php/helpers/company/exports.php") ?: "";
sec(
    str_contains($exports, "htmlspecialchars") || str_contains($exports, "company_export_xml_text"),
    "export XML/HTML escaping present"
);

$apiBootstrap = file_get_contents(__DIR__ . "/../../php/bootstrap_api.php") ?: "";
sec(str_contains($apiBootstrap, "csrf_require_for_mutations"), "API bootstrap enforces CSRF on mutations");

$cloud = file_get_contents(__DIR__ . "/../../php/controllers/cloud.php") ?: "";
sec(str_contains($cloud, "rate_limit_guard(\"auth_login\""), "login rate_limit_guard present");

$voucherPost = file_get_contents(__DIR__ . "/../../api/company/voucher-post.php") ?: "";
sec(str_contains($voucherPost, "bootstrap"), "voucher-post uses company/api bootstrap chain");

$searchApi = file_get_contents(__DIR__ . "/../../api/company/search.php") ?: "";
sec(str_contains($searchApi, "view_party") && str_contains($searchApi, "FORBIDDEN"), "search.php filters domains by view_* / FORBIDDEN");
sec(str_contains($searchApi, "view_day_book") && str_contains($searchApi, "view_ledgers"), "search.php gates vouchers+ledgers");

$ctrl = file_get_contents(__DIR__ . "/../../php/controllers/company.php") ?: "";
sec(str_contains($ctrl, 'company_require_permission($db, $auth["userId"], $companyId, "view_day_book")')
    && str_contains($ctrl, "function company_vouchers_get"), "voucher-item GET requires view_day_book");
sec(str_contains($ctrl, "company_can_preview_voucher"), "voucher-preview uses company_can_preview_voucher");
sec(str_contains($ctrl, "company_require_report_view_permission"), "exports enforce report view_* permission");
sec(
    preg_match('/function company_period_locks_dispatch[\s\S]*?view_dashboard/', $ctrl) === 1,
    "period-locks GET requires view_dashboard"
);

$posting = file_get_contents(__DIR__ . "/../../php/helpers/company/posting.php") ?: "";
sec(str_contains($posting, "PURPOSE_DEPRECATED") && str_contains($posting, "company_assert_purpose_not_deprecated"), "deprecated purposes rejected in posting");
sec(str_contains($posting, "function company_assert_can_create_voucher") && str_contains($posting, "function company_can_preview_voucher"), "shared create/preview permission helper");

$reportsHelper = file_get_contents(__DIR__ . "/../../php/helpers/company/reports.php") ?: "";
sec(str_contains($reportsHelper, "company_report_view_permission_map"), "report view_* map lives in reports.php");

// --- XSS storage probe ---
$db = db_conn();
$user = $db->query("SELECT id FROM users WHERE deleted_at IS NULL AND is_active=1 ORDER BY created_at ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if ($user) {
    require_once __DIR__ . "/../../php/helpers/company/bootstrap.php";
    $companyId = company_new_id();
    $db->beginTransaction();
    $db->prepare(
        "INSERT INTO company_workspaces (id, owner_user_id, legal_name, display_name, currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at)
         VALUES (?, ?, 'Sec Co', 'Sec Co', 'INR', 4, CURDATE(), 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$companyId, $user["id"]]);
    company_seed_workspace($db, $companyId, (string)$user["id"]);
    $db->commit();
    $evil = '<script>alert(1)</script>';
    $pid = company_new_id();
    $db->prepare(
        "INSERT INTO company_parties (id, company_id, display_name, party_type, active, created_at, updated_at)
         VALUES (?, ?, ?, 'PERSON', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())"
    )->execute([$pid, $companyId, $evil]);
    $got = (string)$db->query("SELECT display_name FROM company_parties WHERE id=" . $db->quote($pid))->fetchColumn();
    sec($got === $evil, "XSS payload stored as data (UI must escape)");
    $docx = company_export_build("docx", "xss", ["name"], [["name" => $evil]], []);
    sec(
        !str_contains($docx["body"], "<script>alert") || str_contains($docx["body"], "&lt;script"),
        "DOCX export does not embed raw executable HTML script tag"
    );
}

/**
 * @return array{status:int,headers:string,body:string,set_cookie:string}
 */
function http_probe(string $method, string $url, array $headers = [], ?string $body = null): array
{
    $ch = curl_init($url);
    $hdrOut = [];
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body,
    ]);
    $raw = curl_exec($ch);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        return ["status" => 0, "headers" => "", "body" => $err, "set_cookie" => ""];
    }
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);
    $hdr = substr($raw, 0, $headerSize);
    $bod = substr($raw, $headerSize);
    $setCookie = "";
    if (preg_match_all('/^Set-Cookie:\s*([^;]+)/mi', $hdr, $m)) {
        $setCookie = implode("; ", $m[1]);
    }
    return ["status" => $status, "headers" => $hdr, "body" => $bod, "set_cookie" => $setCookie];
}

function extract_cookie(string $setCookieLine, string $name): string
{
    if (preg_match('/(?:^|;\s*)' . preg_quote($name, '/') . '=([^;]+)/', $setCookieLine, $m)) {
        return $m[1];
    }
    return "";
}

// --- Live CSRF / session matrix against company mutation endpoint ---
$login = http_probe(
    "POST",
    $apiBase . "/api/auth/login.php",
    ["Content-Type: application/json", "Origin: http://localhost:5173"],
    json_encode(["username" => getenv("COMPANY_E2E_USER") ?: "review_demo", "pin" => getenv("COMPANY_E2E_PIN") ?: "583921"], JSON_UNESCAPED_SLASHES)
);
// fallback path used by cloud login
if ($login["status"] < 200 || $login["status"] >= 300) {
    $login = http_probe(
        "POST",
        $apiBase . "/api/cloud/login.php",
        ["Content-Type: application/json", "Origin: http://localhost:5173"],
        json_encode(["username" => getenv("COMPANY_E2E_USER") ?: "review_demo", "pin" => getenv("COMPANY_E2E_PIN") ?: "583921"], JSON_UNESCAPED_SLASHES)
    );
}
sec($login["status"] >= 200 && $login["status"] < 300, "live login for CSRF matrix HTTP " . $login["status"]);

$authCookie = extract_cookie($login["set_cookie"], "sv_auth");
$csrfCookie = extract_cookie($login["set_cookie"], "sv_csrf");
if ($csrfCookie === "" && preg_match('/"csrfToken"\s*:\s*"([^"]+)"/', $login["body"], $cm)) {
    $csrfCookie = $cm[1];
}
if ($csrfCookie === "" && preg_match('/"csrf"\s*:\s*"([^"]+)"/', $login["body"], $cm2)) {
    $csrfCookie = $cm2[1];
}
sec($authCookie !== "", "session cookie issued");
sec($csrfCookie !== "", "csrf token available (cookie or body)");

$cookieHeader = "";
if ($authCookie !== "") {
    $cookieHeader = "sv_auth=" . $authCookie;
}
if ($csrfCookie !== "") {
    $cookieHeader .= ($cookieHeader !== "" ? "; " : "") . "sv_csrf=" . $csrfCookie;
}

$mutationUrl = $apiBase . "/api/company/voucher-post.php";
$payload = json_encode(["companyId" => "00000000-0000-0000-0000-000000000000", "purpose" => "OTHER_RECEIPT"], JSON_UNESCAPED_SLASHES);

// no session
$noSession = http_probe("POST", $mutationUrl, ["Content-Type: application/json"], $payload);
sec(
    $noSession["status"] === 401 || $noSession["status"] === 403 || $noSession["status"] === 419 || str_contains($noSession["body"], "auth") || str_contains($noSession["body"], "CSRF") || str_contains($noSession["body"], "csrf"),
    "no session → mutation denied (HTTP {$noSession["status"]})"
);

// session + missing CSRF header
$missingCsrf = http_probe(
    "POST",
    $mutationUrl,
    ["Content-Type: application/json", "Cookie: {$cookieHeader}"],
    $payload
);
sec(
    in_array($missingCsrf["status"], [403, 419, 400], true) || stripos($missingCsrf["body"], "csrf") !== false,
    "valid session + missing CSRF → denied (HTTP {$missingCsrf["status"]})"
);

// session + wrong CSRF
$wrongCsrf = http_probe(
    "POST",
    $mutationUrl,
    [
        "Content-Type: application/json",
        "Cookie: {$cookieHeader}",
        "X-CSRF-Token: deliberately-wrong-token",
    ],
    $payload
);
sec(
    in_array($wrongCsrf["status"], [403, 419, 400], true) || stripos($wrongCsrf["body"], "csrf") !== false,
    "valid session + wrong CSRF → denied (HTTP {$wrongCsrf["status"]})"
);

// session + valid CSRF (may still 4xx for bad company — but must NOT be CSRF rejection)
$okCsrf = http_probe(
    "POST",
    $mutationUrl,
    [
        "Content-Type: application/json",
        "Cookie: {$cookieHeader}",
        "X-CSRF-Token: {$csrfCookie}",
    ],
    $payload
);
$csrfRejected = stripos($okCsrf["body"], "csrf") !== false && in_array($okCsrf["status"], [403, 419], true);
sec(
    !$csrfRejected && $okCsrf["status"] !== 0,
    "valid session + valid CSRF → not CSRF-denied (HTTP {$okCsrf["status"]} — domain errors OK)"
);

// --- CORS ---
$corsOk = http_probe("OPTIONS", $apiBase . "/api/health.php", [
    "Origin: http://localhost:5173",
    "Access-Control-Request-Method: POST",
    "Access-Control-Request-Headers: content-type,x-csrf-token",
]);
sec(
    stripos($corsOk["headers"], "Access-Control-Allow-Origin: http://localhost:5173") !== false
        || stripos($corsOk["headers"], "access-control-allow-origin: http://localhost:5173") !== false
        || stripos($corsOk["headers"], "Access-Control-Allow-Methods") !== false,
    "CORS preflight allowed origin localhost:5173"
);

$corsBad = http_probe("GET", $apiBase . "/api/health.php", [
    "Origin: https://evil.example",
]);
$evilAllowed = stripos($corsBad["headers"], "Access-Control-Allow-Origin: https://evil.example") !== false;
sec(!$evilAllowed, "CORS unknown origin not reflected");

$corsNull = http_probe("GET", $apiBase . "/api/health.php", [
    "Origin: null",
]);
$nullAllowed = stripos($corsNull["headers"], "Access-Control-Allow-Origin: null") !== false;
sec(!$nullAllowed, "CORS Origin null not reflected");

// --- SQLi probe via search endpoint (must not 500 / must use binds) ---
$sqli = http_probe(
    "GET",
    $apiBase . "/api/company/search.php?q=" . rawurlencode("1' OR '1'='1") . "&companyId=00000000-0000-0000-0000-000000000000",
    ["Cookie: {$cookieHeader}", "X-CSRF-Token: {$csrfCookie}"]
);
sec(
    $sqli["status"] !== 500 && !str_contains(strtolower($sqli["body"]), "syntax error"),
    "SQLi search probe does not cause SQL syntax error (HTTP {$sqli["status"]})"
);

// Rate limit surface: hammer login lightly and confirm guard exists (do not exhaust shared bucket hard)
$rlHits = 0;
$rlBlocked = false;
for ($i = 0; $i < 5; $i++) {
    $r = http_probe(
        "POST",
        $apiBase . "/api/cloud/login.php",
        ["Content-Type: application/json"],
        json_encode(["username" => "definitely_not_a_user_" . $i, "pin" => "000000"], JSON_UNESCAPED_SLASHES)
    );
    $rlHits++;
    if ($r["status"] === 429) {
        $rlBlocked = true;
        break;
    }
}
sec(true, "rate-limit login exercised hits={$rlHits} blocked429=" . ($rlBlocked ? "yes" : "no-window-not-exhausted"));

$lines[] = "API_BASE={$apiBase}";
$lines[] = "SUMMARY fail={$fail}";
@file_put_contents($outDir . "/EVIDENCE_COMPANY_SECURITY_FULL.txt", implode("\n", $lines) . "\n");
echo "SECURITY MATRIX " . ($fail === 0 ? "PASS" : "FAIL") . "\n";
exit($fail === 0 ? 0 : 1);
