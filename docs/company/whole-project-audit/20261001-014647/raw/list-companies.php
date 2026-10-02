<?php
require __DIR__ . "/../../../../../php/config/db.php";
$db = db_conn();
$st = $db->prepare("SELECT w.id, w.display_name FROM company_memberships m JOIN company_workspaces w ON w.id=m.company_id JOIN users u ON u.id=m.user_id WHERE u.username='cert_211549' ORDER BY w.created_at DESC LIMIT 6");
$st->execute();
foreach ($st as $r) {
    echo $r["id"] . "\t" . $r["display_name"] . PHP_EOL;
}
