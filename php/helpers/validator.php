<?php

function validate_required_fields(array $body, array $fields): void {
    foreach ($fields as $field) {
        if (!array_key_exists($field, $body)) {
            throw new InvalidArgumentException("Missing required field: " . $field);
        }
    }
}

function validate_enum_field(array $body, string $key, array $allowed): string {
    $value = trim((string)($body[$key] ?? ""));
    if (!in_array($value, $allowed, true)) {
        throw new InvalidArgumentException("Invalid field: " . $key);
    }
    return $value;
}

function validate_string_length(array $body, string $key, int $min, int $max): string {
    $value = trim((string)($body[$key] ?? ""));
    if (strlen($value) < $min || strlen($value) > $max) {
        throw new InvalidArgumentException("Invalid field: " . $key);
    }
    return $value;
}
