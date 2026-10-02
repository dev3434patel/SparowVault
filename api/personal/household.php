<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/helpers/personal_household.php";

try {
    personal_household_dispatch();
} catch (PersonalHouseholdException $error) {
    json_error($error->getMessage(), $error->status, $error->errorCode);
} catch (RuntimeException $error) {
    json_error("Sign in is required", 401, "UNAUTHORIZED");
} catch (Throwable $error) {
    error_log("[personal_household] " . $error->getMessage());
    json_error("Household request failed", 500, "HOUSEHOLD_FAILED");
}
