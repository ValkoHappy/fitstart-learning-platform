<?php
declare(strict_types=1);
namespace Course\Application;
use Course\Domain\OperationException;
final class ApplicationService
{
    public function __construct(private ApplicationStore $applications) {}

    public function list(array $user, array $filters): array
    {
        return $this->applications->listFor($user, $filters);
    }

    public function create(array $user, string $course, string $comment): int
    {
        if ($course === '' || strlen($course) > 255 || strlen($comment) > 5000) {
            throw new OperationException('Проверьте название курса и комментарий.');
        }
        return $this->applications->createPending((int) $user['id'], $course, $comment);
    }

    public function changeStatus(int $id, string $status): void
    {
        if ($id < 1 || !in_array($status, ['pending', 'approved', 'rejected'], true)) {
            throw new OperationException('Некорректный статус или номер заявки.');
        }
        if (!$this->applications->changeStatus($id, $status)) {
            throw new OperationException('Заявка не найдена.', 'missing');
        }
    }
}
