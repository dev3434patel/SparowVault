<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/cloud_data.php";
$collection = isset($_GET["collection"]) ? (string)$_GET["collection"] : "";
try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method === "GET") {
        cloud_entity_list($collection);
    } elseif ($method === "POST") {
        cloud_entity_create($collection);
    } elseif ($method === "PATCH") {
        cloud_entity_patch_many($collection);
    } elseif ($method === "DELETE") {
        cloud_entity_delete_bulk($collection);
    } else {
        json_error("Method not allowed", 405);
    }
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
