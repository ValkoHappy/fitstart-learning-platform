<?php
declare(strict_types=1);
namespace Course\Http;
final class SessionAuth
{
    public function start(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_name('course_session');
            session_start([
                'use_strict_mode' => 1,
                'cookie_httponly' => true,
                'cookie_samesite' => 'Lax',
                'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
                'cookie_path' => '/',
            ]);
        }
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }

    public function token(): string
    {
        return $_SESSION['csrf'];
    }

    public function verifyCsrf(): void
    {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if ($token === '' || !hash_equals($this->token(), $token)) {
            throw new ApiException('Обновите страницу и повторите запрос.', 403);
        }
    }

    public function user(): ?array
    {
        return $_SESSION['user'] ?? null;
    }

    public function requireUser(): array
    {
        return $this->user() ?? throw new ApiException('Необходим вход.', 401);
    }

    public function requireAdmin(): array
    {
        $user = $this->requireUser();
        if ($user['role'] !== 'admin') {
            throw new ApiException('Недостаточно прав.', 403);
        }
        return $user;
    }

    public function login(array $user): void
    {
        session_regenerate_id(true);
        $_SESSION['user'] = $user;
    }

    public function logout(): void
    {
        $_SESSION = ['csrf' => bin2hex(random_bytes(32))];
        session_regenerate_id(true);
    }
}
