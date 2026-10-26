<?php
declare(strict_types=1);
namespace Course\Application;
interface ApplicationStore
{
    public function listFor(array $user, array $filters): array;
    public function createPending(int $userId, string $course, string $comment): int;
    public function changeStatus(int $id, string $status): bool;
}
