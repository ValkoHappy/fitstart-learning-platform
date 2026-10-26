<?php
declare(strict_types=1);
require __DIR__ . '/entry.php';
$applications->handle($_SERVER['REQUEST_METHOD']);
