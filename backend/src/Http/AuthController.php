<?php
declare(strict_types=1);
namespace Course\Http;
use Course\Application\AuthService;
final class AuthController
{
    public function __construct(private AuthService $auth, private SessionAuth $session) {}

    public function handle(string $method, string $action): never
    {
        if ($method === 'GET') {
            Response::json(['authenticated' => $this->session->user() !== null, 'user' => $this->session->user(), 'csrfToken' => $this->session->token()]);
        }
        if ($method !== 'POST') {
            header('Allow: GET, POST');
            throw new ApiException('Метод не поддерживается.', 405);
        }
        $this->session->verifyCsrf();
        $data = Request::json();
        if ($action === 'register') {
            $id = $this->auth->register(Request::text($data, 'login', 100), Request::text($data, 'email', 100), Request::password($data));
            Response::json(['message' => 'Регистрация завершена.', 'user_id' => $id], 201);
        }
        if ($action === 'login') {
            $user = $this->auth->login(Request::text($data, 'login', 100), Request::password($data));
            $this->session->login($user);
            Response::json(['user' => $user, 'csrfToken' => $this->session->token()]);
        }
        if ($action === 'logout') {
            $this->session->logout();
            Response::json(['message' => 'Вы вышли.', 'csrfToken' => $this->session->token()]);
        }
        throw new ApiException('Неизвестное действие.');
    }
}
