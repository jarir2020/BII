<?php

// TEST DATABASE - Uses SQLite for CI/CD, never connects to production/development MySQL
// This file is loaded by config/test.php for all Codeception tests

return [
    'class' => 'yii\db\Connection',
    'dsn' => 'sqlite:' . dirname(__DIR__) . '/tests/Support/sqlite_test.db',
    'schemaCache' => false,
];