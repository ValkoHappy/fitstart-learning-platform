<?php
declare(strict_types=1);
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$routes = ['/api/auth.php' => 'auth.php', '/api/applications.php' => 'applications.php'];
if (!is_string($path) || !isset($routes[$path])) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":"Not found"}';
    return;
}
require __DIR__ . '/api/' . $routes[$path];
