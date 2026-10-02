<?php
$uri = rawurldecode((string)(parse_url($_SERVER["REQUEST_URI"] ?? "/", PHP_URL_PATH) ?: "/"));
if (str_contains($uri, "\0") || str_contains($uri, "\\") || str_contains($uri, "%") || preg_match('#(?:^|/)\\.[^/]*(?:/|$)#', $uri)) {
    http_response_code(403); echo "Forbidden"; return true;
}
if (str_starts_with($uri, "/api/")) {
    $apiRoot = realpath(__DIR__ . "/../api");
    $file = realpath(__DIR__ . "/.." . $uri);
    if ($file && str_starts_with($file, $apiRoot . DIRECTORY_SEPARATOR) && is_file($file) && str_ends_with($file, ".php")) {
        require $file; return true;
    }
    require __DIR__ . "/index.php"; return true;
}
if ($uri === "/") { header("Location: http://localhost:5173/", true, 302); return true; }
http_response_code(403);
header("Content-Type: text/plain; charset=utf-8");
echo "Forbidden";
return true;
