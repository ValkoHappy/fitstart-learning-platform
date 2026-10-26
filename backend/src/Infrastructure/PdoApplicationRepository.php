<?php
declare(strict_types=1);
namespace Course\Infrastructure;
use Course\Application\ApplicationStore;
use Course\Domain\OperationException;
final class PdoApplicationRepository implements ApplicationStore
{
    public function __construct(private \PDO $db) {}

    public function listFor(array $user, array $filters): array
    {
        $admin = $user['role'] === 'admin';
        $sql = $admin
            ? 'SELECT a.*, u.login, u.email FROM applications a JOIN users u ON a.user_id = u.id WHERE 1=1'
            : 'SELECT a.* FROM applications a WHERE a.user_id = ?';
        $params = $admin ? [] : [(int) $user['id']];
        if ($admin) {
            if (($filters['search'] ?? '') !== '') {
                $sql .= ' AND (u.login LIKE ? OR u.email LIKE ? OR a.course_name LIKE ? OR a.comment LIKE ?)';
                $params = array_merge($params, array_fill(0, 4, '%' . $filters['search'] . '%'));
            }
            foreach (['status' => 'a.status', 'user_id' => 'a.user_id'] as $key => $column) {
                if (($filters[$key] ?? '') !== '') {
                    $sql .= ' AND ' . $column . ' = ?';
                    $params[] = $filters[$key];
                }
            }
        }
        $statement = $this->db->prepare($sql . ' ORDER BY a.created_at DESC, a.id DESC');
        $statement->execute($params);
        return $statement->fetchAll();
    }

    public function createPending(int $userId, string $course, string $comment): int
    {
        try {
            $statement = $this->db->prepare('INSERT INTO applications (user_id, course_name, comment) VALUES (?, ?, ?)');
            $statement->execute([$userId, $course, $comment]);
        } catch (\PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                throw new OperationException('У вас уже есть заявка на рассмотрении.', 'conflict');
            }
            throw $error;
        }
        return (int) $this->db->lastInsertId();
    }

    public function changeStatus(int $id, string $status): bool
    {
        $statement = $this->db->prepare('SELECT id FROM applications WHERE id = ?');
        $statement->execute([$id]);
        if (!$statement->fetch()) {
            return false;
        }
        try {
            $statement = $this->db->prepare('UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            $statement->execute([$status, $id]);
        } catch (\PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                throw new OperationException('У пользователя уже есть другая ожидающая заявка.', 'conflict');
            }
            throw $error;
        }
        return true;
    }
}
