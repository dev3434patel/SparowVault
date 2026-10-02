<?php

require_once __DIR__ . "/../config/env.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";

function aa_configuration_message(): string {
    return "Account Aggregator is not configured. Set AA_BASE_URL, AA_CLIENT_ID, and AA_CLIENT_SECRET on the server. No accounts were linked and no ledger rows were created.";
}

function aa_operator_ready(): bool {
    foreach (["AA_BASE_URL", "AA_CLIENT_ID", "AA_CLIENT_SECRET"] as $name) {
        $value = env_value($name);
        if (!is_string($value) || trim($value) === "") return false;
    }
    return aa_base_url_or_null() !== null;
}

function aa_local_provider_enabled(): bool {
    $value = env_value("AA_LOCAL_PROVIDER");
    if (!is_string($value)) return false;
    $flag = strtolower(trim($value));
    return $flag === "true" || $flag === "1";
}

/** Local development provider only. http://127.0.0.1:8791 when AA_LOCAL_PROVIDER=true. */
function aa_local_base_url_or_null(): ?string {
    if (!aa_local_provider_enabled()) return null;
    $base = env_value("AA_BASE_URL");
    if (!is_string($base) || trim($base) === "") return null;
    $parts = parse_url(trim($base));
    if (!is_array($parts)) return null;
    $scheme = strtolower((string)($parts["scheme"] ?? ""));
    $host = strtolower((string)($parts["host"] ?? ""));
    $port = isset($parts["port"]) ? (int)$parts["port"] : 0;
    $path = isset($parts["path"]) ? rtrim((string)$parts["path"], "/") : "";
    if ($path === "/") $path = "";
    if ($scheme !== "http" || $host !== "127.0.0.1" || $port !== 8791) return null;
    if ($path !== "" || isset($parts["user"]) || isset($parts["pass"]) || isset($parts["query"]) || isset($parts["fragment"])) return null;
    return "http://127.0.0.1:8791";
}

function aa_base_url_or_null(): ?string {
    $local = aa_local_base_url_or_null();
    if ($local !== null) return $local;
    $base = env_value("AA_BASE_URL");
    if (!is_string($base) || trim($base) === "") return null;
    $parts = parse_url(trim($base));
    if (!is_array($parts)) return null;
    $scheme = strtolower((string)($parts["scheme"] ?? ""));
    $host = (string)($parts["host"] ?? "");
    if ($scheme !== "https" || $host === "" || isset($parts["user"]) || isset($parts["pass"])) return null;
    $port = isset($parts["port"]) ? ":" . (int)$parts["port"] : "";
    $path = isset($parts["path"]) ? rtrim((string)$parts["path"], "/") : "";
    if ($path === "/") $path = "";
    return "https://" . $host . $port . $path;
}

function aa_status(): void {
    auth_require_active_user();
    $ready = aa_operator_ready();
    $local = $ready && aa_local_base_url_or_null() !== null;
    json_ok([
        "configured" => $ready,
        "localProvider" => $local,
        "message" => !$ready
            ? aa_configuration_message()
            : ($local
                ? "Local development provider. This is not a licensed Account Aggregator. A licensed provider is still required for production. Nothing is imported until you confirm a review."
                : "Operator settings are present. Consent still has to be approved with a licensed Account Aggregator."),
    ]);
}

function aa_allow_path(string $method, string $path): bool {
    if (aa_local_base_url_or_null() !== null && $method === "POST" && $path === "/local/consent/status") {
        return true;
    }
    if ($method === "POST" && in_array($path, [
        "/Accounts/discover",
        "/Accounts/link",
        "/Accounts/link/verify",
        "/Consent",
        "/FI/request",
    ], true)) {
        return true;
    }
    if ($method === "GET" && preg_match('#^/Consent/handle/[A-Za-z0-9_-]{1,80}$#', $path) === 1) return true;
    if ($method === "GET" && preg_match('#^/FI/fetch/[A-Za-z0-9_-]{1,80}$#', $path) === 1) return true;
    return false;
}

function aa_redact(string $text): string {
    foreach (["AA_CLIENT_SECRET", "AA_CLIENT_ID", "AA_FIU_ID"] as $name) {
        $value = env_value($name);
        if (is_string($value) && $value !== "") {
            $text = str_replace($value, "[redacted]", $text);
        }
    }
    return $text;
}

function aa_redact_value(mixed $value): mixed {
    if (is_string($value)) return aa_redact($value);
    if (!is_array($value)) return $value;
    $out = [];
    foreach ($value as $key => $item) {
        $safeKey = is_string($key) ? aa_redact($key) : $key;
        $out[$safeKey] = aa_redact_value($item);
    }
    return $out;
}

function aa_fill_consumer(array $body): array {
    $fiu = env_value("AA_FIU_ID");
    $client = env_value("AA_CLIENT_ID");
    $id = is_string($fiu) && trim($fiu) !== "" ? trim($fiu) : (is_string($client) ? trim($client) : "");
    if ($id === "") return $body;
    if (isset($body["ConsentDetail"]) && is_array($body["ConsentDetail"])) {
        $consumer = $body["ConsentDetail"]["DataConsumer"] ?? [];
        if (!is_array($consumer)) $consumer = [];
        $current = isset($consumer["id"]) && is_string($consumer["id"]) ? trim($consumer["id"]) : "";
        if ($current === "") $consumer["id"] = $id;
        if (!isset($consumer["type"]) || $consumer["type"] === "") $consumer["type"] = "FIU";
        $body["ConsentDetail"]["DataConsumer"] = $consumer;
    }
    return $body;
}

function aa_forward(): void {
    auth_require_active_user();
    if (!aa_operator_ready()) {
        json_error(aa_configuration_message(), 424, "AA_NOT_CONFIGURED");
        return;
    }
    $payload = require_json_body();
    $method = strtoupper((string)($payload["method"] ?? ""));
    $path = (string)($payload["path"] ?? "");
    if (!aa_allow_path($method, $path)) {
        json_error("That Account Aggregator path is not available. Nothing was imported.", 400, "AA_PATH_REJECTED");
        return;
    }
    $base = aa_base_url_or_null();
    if ($base === null) {
        json_error(aa_configuration_message(), 424, "AA_NOT_CONFIGURED");
        return;
    }
    $body = $payload["body"] ?? null;
    if ($body !== null && !is_array($body)) {
        json_error("Account Aggregator request body was not JSON. Nothing was imported.", 400, "INVALID_JSON");
        return;
    }
    if (is_array($body)) $body = aa_fill_consumer($body);

    $clientId = (string)env_value("AA_CLIENT_ID");
    $clientSecret = (string)env_value("AA_CLIENT_SECRET");
    $headers = [
        "Content-Type: application/json",
        "Accept: application/json",
        "client_id: " . $clientId,
        "client_api_key: " . $clientSecret,
    ];
    $ch = curl_init($base . $path);
    if ($ch === false) {
        json_error("Account Aggregator request failed. Nothing was imported.", 502, "AA_PROVIDER_REJECTED");
        return;
    }
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    $usingLocal = aa_local_base_url_or_null() !== null;
    if ($usingLocal && defined("CURLPROTO_HTTP")) {
        curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP);
    } elseif (defined("CURLPROTO_HTTPS")) {
        curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
    }
    if ($method !== "GET" && is_array($body)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_SLASHES));
    }
    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($raw === false || $errno === 28) {
        json_error("Account Aggregator request timed out. Nothing was imported.", 504, "AA_TIMEOUT");
        return;
    }
    if ($errno !== 0 || !is_string($raw)) {
        json_error("Account Aggregator request failed. Nothing was imported.", 502, "AA_PROVIDER_REJECTED");
        return;
    }
    if (strlen($raw) > 2_000_000) {
        json_error("Account Aggregator response was too large. Nothing was imported.", 502, "AA_PROVIDER_REJECTED");
        return;
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
        json_error("Account Aggregator response was not JSON. Nothing was imported.", 502, "AA_PROVIDER_REJECTED");
        return;
    }
    if ($status < 200 || $status >= 300) {
        $message = "Account Aggregator rejected the request (" . $status . "). Nothing was imported.";
        if (isset($decoded["message"]) && is_string($decoded["message"])) {
            $safe = aa_redact(substr(trim($decoded["message"]), 0, 180));
            if ($safe !== "" && preg_match('/secret|api[_-]?key|authorization/i', $safe) !== 1) {
                $message = "Account Aggregator rejected the request (" . $status . "): " . $safe . " Nothing was imported.";
            }
        }
        json_error($message, $status >= 400 && $status < 500 ? $status : 502, "AA_PROVIDER_REJECTED");
        return;
    }
    json_ok([
        "status" => $status,
        "body" => aa_redact_value($decoded),
    ]);
}
