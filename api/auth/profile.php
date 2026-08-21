<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/cloud.php";
try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "PATCH") {
        json_error("Method not allowed", 405);
        exit;
    }
    cloud_profile_update();
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
