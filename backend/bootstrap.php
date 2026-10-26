<?php
declare(strict_types=1);
spl_autoload_register(static function (string $class): void {
    $prefix = 'Course\\';
    if (str_starts_with($class, $prefix)) {
        $file = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) {
            require_once $file;
        }
    }
});
set_exception_handler(static function (Throwable $error): never {
    if ($error instanceof Course\Http\ApiException) {
        Course\Http\Response::json(['error' => $error->getMessage()], $error->status);
    }
    if ($error instanceof Course\Domain\OperationException) {
        $status = ['validation' => 400, 'conflict' => 409, 'unauthorized' => 401, 'missing' => 404][$error->reason] ?? 400;
        Course\Http\Response::json(['error' => $error->getMessage()], $status);
    }
    error_log('Course API: ' . get_class($error));
    Course\Http\Response::json(['error' => 'Сервис временно недоступен.'], 500);
});
$environment = dirname(__DIR__) . '/.env';
if (is_readable($environment)) {
    foreach (file($environment, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        if (preg_match('/^[A-Z_][A-Z0-9_]*$/', $key) && getenv($key) === false) {
            putenv($key . '=' . trim(trim($value), '\"\''));
        }
    }
}
