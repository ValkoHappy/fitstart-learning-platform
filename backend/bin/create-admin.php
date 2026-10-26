<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__) . '/bootstrap.php';
$login = getenv('ADMIN_LOGIN') ?: '';
$email = getenv('ADMIN_EMAIL') ?: '';
$password = getenv('ADMIN_PASSWORD') ?: '';
if ($login === '' || $email === '' || strlen($password) < 8 || strlen($password) > 72) {
    fwrite(STDERR, "Set ADMIN_LOGIN, ADMIN_EMAIL and ADMIN_PASSWORD (8-72 bytes).\n");
    exit(1);
}
$users = new Course\Infrastructure\PdoUserRepository(Course\Infrastructure\Database::connect());
$service = new Course\Application\AuthService($users);
$id = $service->register($login, $email, $password);
$db = Course\Infrastructure\Database::connect();
$db->prepare("UPDATE users SET role = 'admin' WHERE id = ?")->execute([$id]);
fwrite(STDOUT, "Administrator created.\n");
