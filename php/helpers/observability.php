<?php

function request_log(string $scope, array $extra = []): void {
    $entry = [
        "ts" => gmdate("c"),
        "scope" => $scope,
        "method" => $_SERVER["REQUEST_METHOD"] ?? "GET",
        "uri" => $_SERVER["REQUEST_URI"] ?? "/",
        "ip" => $_SERVER["REMOTE_ADDR"] ?? "unknown",
        "ua" => $_SERVER["HTTP_USER_AGENT"] ?? "unknown",
        "extra" => $extra,
    ];
    error_log(json_encode($entry, JSON_UNESCAPED_SLASHES));
}

