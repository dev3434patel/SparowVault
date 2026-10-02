<?php
require_once __DIR__ . "/../helpers/app.php";

$owner = destructive_database_target_decision("sparowvault");
if (($owner["outcome"] ?? "") !== "refused") {
    fwrite(STDERR, "owner database was not refused\n");
    exit(1);
}
echo "owner-target-refused\n";

$ready = health_configuration_decision();
echo "health-outcome=" . ($ready["outcome"] ?? "") . "\n";
