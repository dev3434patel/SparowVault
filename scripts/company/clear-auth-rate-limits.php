<?php
require_once __DIR__ . "/../../php/config/db.php";
$db = db_conn();
$n = $db->exec("DELETE FROM api_rate_limits");
echo "cleared_rows=$n\n";
