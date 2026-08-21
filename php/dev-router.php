<?php

$uri = parse_url($_SERVER["REQUEST_URI"] ?? "/", PHP_URL_PATH);
if (!is_string($uri)) {
    $uri = "/";
}

// Mirror hosting deny rules in local PHP runtime so sensitive project files are
// never served by the built-in server during QA or demos.
$blockedPatterns = [
    '#^/\.env(?:$|\.)#',
    '#^/\.jwt-secret$#',
    '#^/sql(?:/|$)#',
    '#^/data(?:/|$)#',
    '#^/backups(?:/|$)#',
    '#^/php/config(?:/|$)#',
    '#\.(?:sql|zip|map)$#i',
];
foreach ($blockedPatterns as $pattern) {
    if (preg_match($pattern, $uri) === 1) {
        http_response_code(403);
        header("Content-Type: text/plain; charset=utf-8");
        echo "Forbidden";
        return true;
    }
}

// Let PHP built-in server serve existing files directly.
$fullPath = __DIR__ . "/../" . ltrim($uri, "/");
if ($uri !== "/" && file_exists($fullPath) && !is_dir($fullPath)) {
    return false;
}

// API files are served directly; extensionless API routes go through the router.
if (str_starts_with($uri, "/api/")) {
    require __DIR__ . "/index.php";
    return true;
}

// Frontend is served by Vite dev server.
header("Location: http://localhost:5173" . $uri, true, 302);
exit;
