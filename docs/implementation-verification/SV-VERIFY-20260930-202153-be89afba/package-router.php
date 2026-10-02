<?php
declare(strict_types=1);
$uri = rawurldecode((string)(parse_url($_SERVER["REQUEST_URI"] ?? "/", PHP_URL_PATH) ?: "/"));
$root = realpath(__DIR__ . "/package/dist");
if ($uri === "/api/healthz.php" || str_starts_with($uri, "/api/")) {
    if (str_contains($uri, "..") || str_contains($uri, ".env") || str_ends_with($uri, ".sql")) {
        http_response_code(403);
        header("Content-Type: text/plain");
        echo "Forbidden";
        return true;
    }
    $api = realpath(__DIR__ . "/../../../api");
    $file = realpath($api . substr($uri, 4));
    if ($file && str_starts_with($file, $api) && is_file($file) && str_ends_with($file, ".php")) {
        require $file;
        return true;
    }
    http_response_code(404);
    echo "missing api";
    return true;
}
if (preg_match('/\.(env|sql|php)$/i', $uri)) {
    http_response_code(403);
    header("Content-Type: text/plain");
    echo "Forbidden";
    return true;
}
$target = realpath($root . $uri);
if ($uri !== "/" && $target && str_starts_with($target, $root) && is_file($target)) {
    $ext = strtolower(pathinfo($target, PATHINFO_EXTENSION));
    $types = [
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "wasm" => "application/wasm",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
    ];
    header("Content-Type: " . ($types[$ext] ?? "application/octet-stream"));
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'");
    readfile($target);
    return true;
}
header("Content-Type: text/html; charset=utf-8");
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'");
readfile($root . DIRECTORY_SEPARATOR . "index.html");
return true;
