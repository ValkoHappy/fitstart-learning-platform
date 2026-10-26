<?php
declare(strict_types=1);
namespace Course\Application;
interface UserStore
{
    public function findByLogin(string $login): ?array;
    public function create(string $login, string $email, string $hash, string $role = 'user'): int;
}
