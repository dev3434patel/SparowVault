<?php
require_once __DIR__ . "/../../../php/bootstrap_api.php";
require_once __DIR__ . "/../../../php/controllers/cloud_data.php";
try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") {
        json_error("Method not allowed", 405);
        exit;
    }
    cloud_sync_push();
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
