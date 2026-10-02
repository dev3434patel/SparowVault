<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

try {
    company_period_locks_dispatch();
} catch (Throwable $e) {
    company_handle_exception($e);
}
