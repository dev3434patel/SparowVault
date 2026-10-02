<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/../../php/controllers/cloud_data.php";
$collection = isset($_GET["collection"]) ? (string)$_GET["collection"] : "";
$id = isset($_GET["id"]) ? (string)$_GET["id"] : "";
try {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method === "GET") {
        cloud_entity_get_one($collection, $id);
    } elseif ($method === "PATCH") {
        cloud_entity_patch_one($collection, $id);
    } elseif ($method === "DELETE") {
        cloud_entity_delete_one($collection, $id);
    } else {
        json_error("Not found", 404);
    }
} catch (Throwable $e) {
    json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500);
}
