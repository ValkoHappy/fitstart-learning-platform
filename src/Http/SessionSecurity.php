<?php
class SessionSecurity
{
    private const READ_ACTIONS = ['health', 'csrf', 'check_auth', 'getUserRole', 'getCourses', 'getCourse', 'checkAccess', 'getCourseContent', 'getApplications', 'getAllApplications', 'searchApplications', 'getUsers', 'getStaffPermissions', 'getProgressOverview', 'getQuizQuestions', 'getReviewQueue', 'validatePasswordResetToken'];

    public static function start(): void
    {
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: no-store');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = getenv('FRONTEND_ORIGIN') ?: '';
        $sameOrigin = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '');
        if ($origin && $origin !== $allowed && $origin !== $sameOrigin) {
            self::reject(403, 'Источник запроса запрещён');
        }
        if ($origin && $origin === $allowed) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
        }
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
        session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'path' => '/']);
        session_start();
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }

    public static function validate(string $action): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        if (!in_array($method, ['GET', 'POST'], true) || ($method === 'GET' && !in_array($action, self::READ_ACTIONS, true))) {
            header('Allow: POST');
            self::reject(405, 'Метод запроса не поддерживается');
        }
        if ($method === 'POST' && !hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
            self::reject(419, 'Обновите страницу и повторите запрос');
        }
    }

    private static function reject(int $status, string $message): never
    {
        http_response_code($status);
        echo json_encode(['success' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
