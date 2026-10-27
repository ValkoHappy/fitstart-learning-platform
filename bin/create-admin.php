<?php
require_once dirname(__DIR__) . '/src/config/database.php';
$login = getenv('ADMIN_LOGIN') ?: '';
$email = getenv('ADMIN_EMAIL') ?: '';
$password = getenv('ADMIN_PASSWORD') ?: '';
if (!$login || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) { fwrite(STDERR, "Set ADMIN_LOGIN, ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters).\n"); exit(1); }
$pdo = (new Database())->getPdo();
$pdo->prepare("INSERT INTO users (login,password,first_name,last_name,email,role) VALUES (?,?, 'Администратор','Платформы',?,'admin')")->execute([$login,password_hash($password,PASSWORD_DEFAULT),$email]);
echo "Administrator created.\n";
