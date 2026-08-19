<?php

declare(strict_types=1);

header('Content-Type: text/plain; charset=UTF-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo "GET only\n";
    exit;
}

require_once __DIR__ . '/bootstrap/env.php';

function productMediaColumnExists(PDO $db, string $column): bool
{
    $query = <<<'SQL'
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'products'
  AND column_name = :column
SQL;

    $statement = $db->prepare($query);
    $statement->execute([':column' => $column]);

    return (int) $statement->fetchColumn() > 0;
}

try {
    $host = (string) getenv('DB_HOST');
    $name = (string) getenv('DB_NAME');
    $user = (string) getenv('DB_USER');
    $pass = (string) getenv('DB_PASS');

    if ($host === '' || $name === '' || $user === '') {
        throw new RuntimeException('DB_HOST, DB_NAME, and DB_USER must be set in .env.');
    }

    $db = new PDO(
        "mysql:host={$host};dbname={$name};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $columns = [
        'images' => "ALTER TABLE `products` ADD COLUMN `images` TEXT NULL",
        'video_url' => "ALTER TABLE `products` ADD COLUMN `video_url` VARCHAR(1024) NOT NULL DEFAULT ''",
    ];

    echo "BII product media migration\n";

    foreach ($columns as $column => $alterSql) {
        if (productMediaColumnExists($db, $column)) {
            echo "{$column}: already added\n";
            continue;
        }

        $db->exec($alterSql);
        echo "{$column}: added\n";
    }

    echo "status: complete\n";
} catch (Throwable $error) {
    http_response_code(500);
    error_log('Product media migration failed: ' . $error->getMessage());
    echo "ERROR: migration failed: {$error->getMessage()}\n";
    exit;
}
