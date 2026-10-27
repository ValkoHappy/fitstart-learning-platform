<?php
const ROOT_DIR = __DIR__ . '/..';
require_once ROOT_DIR . '/src/config/database.php';
require_once ROOT_DIR . '/src/Http/SessionSecurity.php';
require_once ROOT_DIR . '/src/Http/ApiRouter.php';

SessionSecurity::start();
$action = $_GET['action'] ?? '';
if ($action === 'csrf') {
    echo json_encode(['success' => true, 'token' => $_SESSION['csrf']]);
    exit;
}
SessionSecurity::validate($action);
try {
    $router = new ApiRouter(new Database(), require ROOT_DIR . '/src/config/routes.php');
    $router->dispatch($action);
} catch (Throwable $error) {
    error_log($error->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Внутренняя ошибка сервера'], JSON_UNESCAPED_UNICODE);
}
