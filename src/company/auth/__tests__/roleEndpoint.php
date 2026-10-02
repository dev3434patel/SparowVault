<?php
declare(strict_types=1);

require_once __DIR__ . "/../../../../php/helpers/company/seed.php";

$matrix = company_seed_role_permissions();
$owner = $matrix["OWNER"];
$viewer = $matrix["VIEWER"];
$empty = [];

$writes = ["create_receipt", "create_payment", "create_journal", "create_contra", "manage_opening_balances", "reopen_period"];

foreach ($writes as $key) {
    if (!in_array($key, $owner, true)) {
        fwrite(STDERR, "owner missing {$key}\n");
        exit(1);
    }
    if (in_array($key, $viewer, true)) {
        fwrite(STDERR, "viewer must not have {$key}\n");
        exit(1);
    }
    if (in_array($key, $empty, true)) {
        fwrite(STDERR, "empty permissions must deny {$key}\n");
        exit(1);
    }
}

if (!in_array("view_day_book", $viewer, true)) {
    fwrite(STDERR, "viewer should read the day book\n");
    exit(1);
}

echo "role-endpoint ok\n";
