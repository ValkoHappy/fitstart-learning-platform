<?php
declare(strict_types=1);
namespace Course\Application;
use Course\Domain\OperationException;
final class AuthService
{
    public function __construct(private UserStore $users) {}

    public function register(string $login, string $email, string $password): int
    {
        if (!preg_match('/^[\p{L}\p{N}_.-]{3,50}$/u', $login)) {
            throw new OperationException('Логин должен содержать от 3 до 50 букв, цифр или символов _ . -');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
            throw new OperationException('Проверьте email.');
        }
        if (strlen($password) < 8 || strlen($password) > 72) {
            throw new OperationException('Пароль должен содержать от 8 до 72 байт.');
        }
        return $this->users->create($login, strtolower($email), password_hash($password, PASSWORD_DEFAULT));
    }

    public function login(string $login, string $password): array
    {
        $user = $this->users->findByLogin($login);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new OperationException('Неверный логин или пароль.', 'unauthorized');
        }
        return array_intersect_key($user, array_flip(['id', 'login', 'email', 'role']));
    }
}
