<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/statements.php";
try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") {
        header("Allow: POST");
        json_error("Method not allowed", 405, "METHOD_NOT_ALLOWED");
    } else statements_import();
} catch (Throwable $error) {
    error_log("[statement_import] " . get_class($error));
    json_error("Statement import could not be verified. Retry the same reviewed statement before changing it.", 503, "IMPORT_UNAVAILABLE");
}
