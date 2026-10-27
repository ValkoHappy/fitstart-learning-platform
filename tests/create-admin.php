<?php
require_once dirname(__DIR__) . '/src/config/database.php';
if (!preg_match('/_test$/', getenv('DB_NAME') ?: '')) { fwrite(STDERR, "Tests require a database ending in _test.\n"); exit(1); }
require dirname(__DIR__) . '/bin/create-admin.php';
