<?php

require_once __DIR__ . "/../php/config/db.php";

$db = db_conn();
$rows = [];
$st = $db->query("SELECT user_id, collection_name, entity_id, payload, updated_at, deleted_at FROM cloud_collection_rows ORDER BY updated_at DESC");
while ($row = $st->fetch()) {
    $rows[] = $row;
}

$ts = gmdate("Ymd_His");
$outDir = __DIR__ . "/../backups";
if (!is_dir($outDir)) {
    mkdir($outDir, 0775, true);
}
$file = $outDir . "/cloud_rows_" . $ts . ".json";
file_put_contents($file, json_encode(["exportedAt" => gmdate("c"), "rows" => $rows], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
echo "JSON backup created: " . $file . PHP_EOL;
