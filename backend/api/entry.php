<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/bootstrap.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = getenv('FRONTEND_ORIGIN') ?: 'http://127.0.0.1:3000';
if ($origin !== '' && $origin !== $allowedOrigin && $origin !== ('http' . (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 's' : '') . '://' . ($_SERVER['HTTP_HOST'] ?? ''))) {
    Course\Http\Response::json(['error' => 'Источник запроса не разрешён.'], 403);
}
if ($origin === $allowedOrigin) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
$session = new Course\Http\SessionAuth();
$session->start();
$db = Course\Infrastructure\Database::connect();
$auth = new Course\Http\AuthController(new Course\Application\AuthService(new Course\Infrastructure\PdoUserRepository($db)), $session);
$applications = new Course\Http\ApplicationController(new Course\Application\ApplicationService(new Course\Infrastructure\PdoApplicationRepository($db)), $session);
