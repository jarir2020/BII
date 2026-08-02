<?php

declare(strict_types=1);

// MySQL connection. Credentials come from the environment (.env file in prod,
// or env vars in CI). Dev defaults point at a local MySQL server.
return [
    'class' => \yii\db\Connection::class,
    'dsn' => 'mysql:host=' . (getenv('DB_HOST') ?: 'localhost')
        . ';dbname=' . (getenv('DB_NAME') ?: 'bii_db'),
    'username' => getenv('DB_USER') ?: 'root',
    'password' => getenv('DB_PASS') ?: '',
    'charset' => 'utf8mb4',

    // Production tuning
    'enableSchemaCache' => (getenv('DB_SCHEMA_CACHE') ?: '0') === '1',
    'schemaCacheDuration' => 3600,
    'schemaCache' => 'cache',
];
