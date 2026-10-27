<?php
require_once dirname(__DIR__) . '/src/config/database.php';
try {
    $pdo = (new Database())->getPdo();
    $pdo->exec(file_get_contents(dirname(__DIR__) . '/database/schema.sql'));
    $pdo->exec("INSERT INTO application_statuses (id_status, status_name) VALUES (1, 'Ожидает проверки'), (2, 'На рассмотрении'), (3, 'Одобрена'), (4, 'Отклонена')");
    echo "Schema installed.\n";
} catch (Throwable $error) { fwrite(STDERR, "Cannot install schema into this database. Use an empty database.\n"); exit(1); }
