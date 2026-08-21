<?php

function now_iso(): string {
    return gmdate("Y-m-d\TH:i:s.000\Z");
}

function uid(string $prefix = "id"): string {
    return $prefix . "_" . bin2hex(random_bytes(12));
}

function encode_payload($value): string {
    return json_encode($value ?? new stdClass(), JSON_UNESCAPED_SLASHES);
}

function decode_payload(?string $raw): array {
    if ($raw === null || trim($raw) === "") {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [];
    }
    return $decoded;
}

function cloud_collections(): array {
    static $list = null;
    if ($list === null) {
        require_once __DIR__ . "/cloud_payload.php";
        $list = cloud_collection_allowlist();
    }
    return $list;
}

function is_cloud_collection(string $name): bool {
    return in_array($name, cloud_collections(), true);
}
