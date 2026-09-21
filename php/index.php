<?php

declare(strict_types=1);

require_once __DIR__ . "/bootstrap_api.php";

require_once __DIR__ . "/routes.php";

try {
    dispatch_request();
} catch (Throwable $e) {
    error_log("[api] Unhandled request failure");
    json_error("Request could not be completed", 500);
}
