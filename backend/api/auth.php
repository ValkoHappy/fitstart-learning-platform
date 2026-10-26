<?php
declare(strict_types=1);
require __DIR__ . '/entry.php';
$auth->handle($_SERVER['REQUEST_METHOD'], is_string($_GET['action'] ?? '') ? ($_GET['action'] ?? '') : '');
