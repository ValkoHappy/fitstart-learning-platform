<?php
declare(strict_types=1);
namespace Course\Infrastructure;
use Course\Application\UserStore;
use Course\Domain\OperationException;
final class PdoUserRepository implements UserStore
{
    public function __construct(private \PDO $db) {}

    public function findByLogin(string $login): ?array
    {
        $statement = $this->db->prepare('SELECT id, login, email, password_hash, role FROM users WHERE login = ?');
        $statement->execute([$login]);
        return $statement->fetch() ?: null;
    }

    public function create(string $login, string $email, string $hash, string $role = 'user'): int
    {
        try {
            $statement = $this->db->prepare('INSERT INTO users (login, email, password_hash, role) VALUES (?, ?, ?, ?)');
            $statement->execute([$login, $email, $hash, $role]);
        } catch (\PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                throw new OperationException('Логин или email уже зарегистрирован.', 'conflict');
            }
            throw $error;
        }
        return (int) $this->db->lastInsertId();
    }
}
