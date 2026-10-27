<?php
class ApiRouter
{
    public function __construct(private Database $database, private array $routes) {}

    public function dispatch(string $action): void
    {
        foreach ($this->routes as $class => $actions) {
            if (!in_array($action, $actions, true)) continue;
            require_once dirname(__DIR__) . '/controllers/' . $class . '.php';
            if ($class === SystemController::class) {
                (new SystemController())->health();
            } else {
                (new $class($this->database))->handle($action);
            }
            return;
        }
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Неизвестное действие API']);
    }
}
