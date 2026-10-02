<?php

function validate_string_field(array $body, string $key, int $min, int $max, ?string $pattern = null): string {
    $value = trim((string)($body[$key] ?? ""));
    if (strlen($value) < $min || strlen($value) > $max) {
        throw new InvalidArgumentException("Invalid field: " . $key);
    }
    if ($pattern !== null && preg_match($pattern, $value) !== 1) {
        throw new InvalidArgumentException("Invalid field: " . $key);
    }
    return $value;
}

function validate_enum(string $value, array $allowed, string $key): string {
    if (!in_array($value, $allowed, true)) {
        throw new InvalidArgumentException("Invalid field: " . $key);
    }
    return $value;
}

function validate_decimal_string(string $value, string $key): string {
    $normalized = trim($value);
    if (preg_match('/^\d{1,8}(\.\d{1,2})?$/', $normalized) !== 1) {
        throw new InvalidArgumentException("Invalid field: " . $key);
    }
    return $normalized;
}

