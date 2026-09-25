<?php
declare(strict_types=1);

/**
 * Canonical purpose registry loader — single source shared with frontend JSON.
 * Purpose *data* lives only in config/company-purpose-rules.json.
 * Purpose *execution* (line building) lives in posting.php.
 */
function company_purpose_rules_path(): string {
    return dirname(__DIR__, 3) . "/config/company-purpose-rules.json";
}

/** @return array{version:int,purposes:list<array>} */
function company_purpose_registry(): array {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $path = company_purpose_rules_path();
    if (!is_readable($path)) {
        throw new RuntimeException("Purpose registry missing: " . $path);
    }
    $data = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data) || !isset($data["purposes"]) || !is_array($data["purposes"])) {
        throw new RuntimeException("Invalid purpose registry");
    }
    $cache = $data;
    return $cache;
}

/** @return array<string,array> keyed by purpose key */
function company_purpose_map(): array {
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $map = [];
    foreach (company_purpose_registry()["purposes"] as $p) {
        $map[strtoupper((string)$p["key"])] = $p;
    }
    return $map;
}

function company_purpose_rule(string $key): ?array {
    $map = company_purpose_map();
    return $map[strtoupper(trim($key))] ?? null;
}

function company_purpose_voucher_type(string $key): ?string {
    $rule = company_purpose_rule($key);
    return $rule ? (string)$rule["voucherType"] : null;
}

/**
 * Canonical replacements for retired purpose keys — derived from JSON `replacedBy`.
 * @return array<string,string>
 */
function company_purpose_deprecated_replacements(): array {
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $map = [];
    foreach (company_purpose_registry()["purposes"] as $p) {
        if (!empty($p["deprecated"]) && !empty($p["replacedBy"])) {
            $map[strtoupper((string)$p["key"])] = strtoupper((string)$p["replacedBy"]);
        }
    }
    return $map;
}

function company_purpose_deprecated_replacement(string $key): ?string {
    $map = company_purpose_deprecated_replacements();
    $k = strtoupper(trim($key));
    return $map[$k] ?? null;
}

function company_purpose_is_deprecated(string $key): bool {
    $k = strtoupper(trim($key));
    $rule = company_purpose_rule($k);
    if ($rule !== null && !empty($rule["deprecated"])) {
        return true;
    }
    return company_purpose_deprecated_replacement($k) !== null;
}
