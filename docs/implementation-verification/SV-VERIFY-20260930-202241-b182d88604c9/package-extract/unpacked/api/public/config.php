<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/public_config.php";
try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "GET") {
        json_error("Method not allowed", 405);
        exit;
    }
    public_config_get();
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
