<?php
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if ($path === '/api' || str_starts_with($path, '/api/')) { require __DIR__ . '/index.php'; return true; }
$file = realpath(__DIR__ . $path);
if ($file && str_starts_with($file, __DIR__ . DIRECTORY_SEPARATOR) && is_file($file) && !preg_match('/\.(php|htaccess|env)$/i', $file)) {
    return false;
}
$dist = realpath(__DIR__ . '/../frontend/dist');
if ($dist) {
    $asset = realpath($dist . $path);
    if ($asset && str_starts_with($asset, $dist . DIRECTORY_SEPARATOR) && is_file($asset)) {
        $types = ['js' => 'text/javascript', 'css' => 'text/css', 'svg' => 'image/svg+xml', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'webp' => 'image/webp'];
        header('Content-Type: ' . ($types[pathinfo($asset, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
        readfile($asset); return true;
    }
    if (!str_contains(basename($path), '.')) { header('Content-Type: text/html; charset=utf-8'); readfile($dist . '/index.html'); return true; }
}
http_response_code(404);
return true;
