<?php
declare(strict_types=1);
namespace Course\Http;
use Course\Application\ApplicationService;
final class ApplicationController
{
    public function __construct(private ApplicationService $applications, private SessionAuth $session) {}

    public function handle(string $method): never
    {
        $user = $this->session->requireUser();
        if ($method === 'GET') {
            $filters = [];
            foreach (['search', 'status', 'user_id'] as $key) {
                $filters[$key] = Request::text($_GET, $key, 200, false);
            }
            Response::json(['applications' => $this->applications->list($user, $filters)]);
        }
        if (!in_array($method, ['POST', 'PATCH'], true)) {
            header('Allow: GET, POST, PATCH');
            throw new ApiException('Метод не поддерживается.', 405);
        }
        $this->session->verifyCsrf();
        if ($method === 'PATCH') {
            $this->session->requireAdmin();
        }
        $data = Request::json();
        if ($method === 'POST') {
            $id = $this->applications->create($user, Request::text($data, 'course_name', 255, false) ?: 'Как стать тренером', Request::text($data, 'comment', 5000, false));
            Response::json(['application_id' => $id], 201);
        }
        $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id === false || $id === null) {
            throw new ApiException('Некорректный номер заявки.');
        }
        $this->applications->changeStatus($id, Request::text($data, 'status', 20));
        Response::json(['message' => 'Статус обновлён.']);
    }
}
