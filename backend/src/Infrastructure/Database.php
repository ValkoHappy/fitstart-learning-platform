<?php
declare(strict_types=1);
namespace Course\Infrastructure;
final class Database
{
    public static function connect(): \PDO
    {
        $dsn = getenv('DB_DSN') ?: 'mysql:host=127.0.0.1;dbname=course_registration;charset=utf8mb4';
        return new \PDO($dsn, getenv('DB_USER') ?: '', getenv('DB_PASSWORD') ?: '', [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
