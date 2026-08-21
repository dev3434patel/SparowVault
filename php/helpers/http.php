<?php

function json_input(): array {
    $raw = file_get_contents("php://input");
    if ($raw === false || trim($raw) === "") {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [];
    }
    return $decoded;
}

function json_ok($data, int $status = 200): void {
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["ok" => true, "data" => $data], JSON_UNESCAPED_SLASHES);
}

function json_error(string $message, int $status = 400, ?string $code = null): void {
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    $payload = [
        "ok" => false,
        "error" => $message,
        "requestId" => (string)($_SERVER["REQUEST_ID"] ?? ""),
    ];
    if ($code !== null && $code !== "") {
        $payload["code"] = $code;
    }
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
}

function require_json_body(): array {
    $max = 1048576; // 1 MiB — keep in sync with cloud_max_entity_json_body_bytes() in cloud_payload.php
    $cl = (int)($_SERVER["CONTENT_LENGTH"] ?? 0);
    if ($cl > $max) {
        json_error("Request body too large", 413, "PAYLOAD_TOO_LARGE");
        exit;
    }
    $raw = file_get_contents("php://input");
    if ($raw === false || trim($raw) === "") {
        json_error("Invalid JSON payload", 400, "INVALID_JSON");
        exit;
    }
    if (strlen($raw) > $max) {
        json_error("Request body too large", 413, "PAYLOAD_TOO_LARGE");
        exit;
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
        json_error("Invalid JSON payload", 400, "INVALID_JSON");
        exit;
    }
    return $decoded;
}

function get_bearer_token(): ?string {
    $header = $_SERVER["HTTP_AUTHORIZATION"] ?? "";
    if (is_string($header) && str_starts_with($header, "Bearer ")) {
        return substr($header, 7);
    }
    $cookie = $_COOKIE["sv_auth"] ?? null;
    return is_string($cookie) && $cookie !== "" ? $cookie : null;
}
