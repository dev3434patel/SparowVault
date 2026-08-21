<?php

/**
 * Phase 3 — validate / derive integer paise fields on cloud entity payloads.
 */

function cloud_money_max_abs_paise(): int {
    return (int)1e15;
}

function cloud_parse_money_input_to_paise(
    mixed $value,
    string $field = "amount",
    bool $allowZero = true,
    bool $allowRounding = true
): int {
    if ($value === null) {
        if ($allowZero) return 0;
        throw new InvalidArgumentException("{$field} is required");
    }
    if (is_bool($value) || (is_float($value) && !is_finite($value))) {
        throw new InvalidArgumentException("{$field} must be a valid rupee amount");
    }

    $raw = trim((string)$value);
    $raw = preg_replace('/(?:Rs\.?|INR|\x{20B9})/iu', '', $raw);
    $raw = str_replace([",", " "], "", $raw ?? "");
    if ($raw === "" || $raw === "." || $raw === "-" || $raw === "+") {
        if ($allowZero) return 0;
        throw new InvalidArgumentException("{$field} is required");
    }

    $negative = false;
    if ($raw[0] === "-" || $raw[0] === "+") {
        $negative = $raw[0] === "-";
        $raw = substr($raw, 1);
    }
    if ($negative) {
        throw new InvalidArgumentException("{$field} must be non-negative");
    }
    if (!preg_match('/^(\d+)(?:\.(\d+))?$/', $raw, $m)) {
        throw new InvalidArgumentException("{$field} must be a valid rupee amount");
    }

    $integerPart = ltrim($m[1], "0");
    if ($integerPart === "") $integerPart = "0";
    $fractionalPart = $m[2] ?? "";
    if (strlen($fractionalPart) > 2 && !$allowRounding) {
        throw new InvalidArgumentException("{$field} cannot have more than 2 decimal places");
    }

    if (strlen($integerPart) > 13) {
        throw new InvalidArgumentException("{$field} exceeds maximum allowed magnitude");
    }
    $paise = ((int)$integerPart) * 100;
    $firstTwo = substr($fractionalPart . "00", 0, 2);
    $paise += (int)$firstTwo;
    if ($allowRounding && strlen($fractionalPart) > 2 && (int)$fractionalPart[2] >= 5) {
        $paise += 1;
    }

    if ($paise === 0 && !$allowZero) {
        throw new InvalidArgumentException("{$field} must be greater than 0");
    }
    if (abs($paise) > cloud_money_max_abs_paise()) {
        throw new InvalidArgumentException("{$field} exceeds allowed magnitude");
    }
    return $paise;
}

function cloud_try_money_input_to_paise(mixed $value, string $field = "amount", bool $allowZero = true, bool $allowRounding = true): ?int {
    try {
        return cloud_parse_money_input_to_paise($value, $field, $allowZero, $allowRounding);
    } catch (Throwable) {
        return null;
    }
}

function cloud_paise_to_rupee_amount(int $paise): float {
    return round($paise) / 100;
}

function cloud_validate_integer_paise_field(array $entity, string $field): void {
    if (!array_key_exists($field, $entity)) {
        return;
    }
    $v = $entity[$field];
    if ($v === null) {
        return;
    }
    if (!is_int($v) && !(is_float($v) && floor($v) === $v)) {
        throw new InvalidArgumentException("Field {$field} must be an integer paise value");
    }
    $iv = (int)$v;
    if ($iv < 0) {
        throw new InvalidArgumentException("Field {$field} must be non-negative");
    }
    if (abs($iv) > cloud_money_max_abs_paise()) {
        throw new InvalidArgumentException("Field {$field} exceeds allowed magnitude");
    }
}

function cloud_validate_money_fields(string $collection, array $entity): void {
    switch ($collection) {
        case "transactions":
            cloud_validate_integer_paise_field($entity, "amountPaise");
            break;
        case "accounts":
            cloud_validate_integer_paise_field($entity, "openingBalancePaise");
            break;
        case "cards":
            cloud_validate_integer_paise_field($entity, "creditLimitPaise");
            break;
        case "budgets":
            cloud_validate_integer_paise_field($entity, "limitPaise");
            break;
        case "loans":
            cloud_validate_integer_paise_field($entity, "principalPaise");
            cloud_validate_integer_paise_field($entity, "emiPaise");
            cloud_validate_integer_paise_field($entity, "outstandingPrincipalPaise");
            break;
        case "emis":
            cloud_validate_integer_paise_field($entity, "amountPaise");
            cloud_validate_integer_paise_field($entity, "amountPaidPaise");
            cloud_validate_integer_paise_field($entity, "principalComponentPaise");
            cloud_validate_integer_paise_field($entity, "interestComponentPaise");
            break;
        case "goals":
            cloud_validate_integer_paise_field($entity, "targetAmountPaise");
            cloud_validate_integer_paise_field($entity, "savedAmountPaise");
            break;
        case "udhari":
            cloud_validate_integer_paise_field($entity, "amountPaise");
            cloud_validate_integer_paise_field($entity, "amountSettledPaise");
            break;
        case "udhariSettlements":
        case "goalContribs":
        case "savingsContribs":
        case "recurringRules":
            cloud_validate_integer_paise_field($entity, "amountPaise");
            break;
        case "investments":
            cloud_validate_integer_paise_field($entity, "amountPaise");
            cloud_validate_integer_paise_field($entity, "totalContributedPaise");
            break;
        default:
            break;
    }
}

/** Best-effort primary amount for cloud_collection_rows.amount_paise */
function cloud_entity_primary_amount_paise(string $collection, array $entity): ?int {
    if (isset($entity["amountPaise"]) && is_numeric($entity["amountPaise"])) {
        return (int)$entity["amountPaise"];
    }
    switch ($collection) {
        case "transactions":
            return array_key_exists("amount", $entity) ? cloud_try_money_input_to_paise($entity["amount"], "amount") : null;
        case "accounts":
            if (isset($entity["openingBalancePaise"]) && is_numeric($entity["openingBalancePaise"])) {
                return (int)$entity["openingBalancePaise"];
            }
            return array_key_exists("openingBalance", $entity)
                ? cloud_try_money_input_to_paise($entity["openingBalance"], "openingBalance")
                : null;
        case "cards":
            if (isset($entity["creditLimitPaise"]) && is_numeric($entity["creditLimitPaise"])) {
                return (int)$entity["creditLimitPaise"];
            }
            return array_key_exists("creditLimit", $entity)
                ? cloud_try_money_input_to_paise($entity["creditLimit"], "creditLimit")
                : null;
        case "budgets":
            if (isset($entity["limitPaise"]) && is_numeric($entity["limitPaise"])) {
                return (int)$entity["limitPaise"];
            }
            return array_key_exists("amount", $entity) ? cloud_try_money_input_to_paise($entity["amount"], "amount") : null;
        case "loans":
            if (isset($entity["principalPaise"]) && is_numeric($entity["principalPaise"])) {
                return (int)$entity["principalPaise"];
            }
            return array_key_exists("principal", $entity)
                ? cloud_try_money_input_to_paise($entity["principal"], "principal")
                : null;
        case "emis":
            if (isset($entity["amountPaise"]) && is_numeric($entity["amountPaise"])) {
                return (int)$entity["amountPaise"];
            }
            return array_key_exists("amount", $entity) ? cloud_try_money_input_to_paise($entity["amount"], "amount") : null;
        case "goals":
            if (isset($entity["targetAmountPaise"]) && is_numeric($entity["targetAmountPaise"])) {
                return (int)$entity["targetAmountPaise"];
            }
            return array_key_exists("targetAmount", $entity)
                ? cloud_try_money_input_to_paise($entity["targetAmount"], "targetAmount")
                : null;
        case "udhari":
            if (isset($entity["amountPaise"]) && is_numeric($entity["amountPaise"])) {
                return (int)$entity["amountPaise"];
            }
            return array_key_exists("amount", $entity) ? cloud_try_money_input_to_paise($entity["amount"], "amount") : null;
        case "goalContribs":
        case "udhariSettlements":
        case "savingsContribs":
        case "recurringRules":
            if (isset($entity["amountPaise"]) && is_numeric($entity["amountPaise"])) {
                return (int)$entity["amountPaise"];
            }
            return array_key_exists("amount", $entity) ? cloud_try_money_input_to_paise($entity["amount"], "amount") : null;
        case "investments":
            if (isset($entity["amountPaise"]) && is_numeric($entity["amountPaise"])) {
                return (int)$entity["amountPaise"];
            }
            return array_key_exists("amount", $entity) ? cloud_try_money_input_to_paise($entity["amount"], "amount") : null;
        default:
            return null;
    }
}
