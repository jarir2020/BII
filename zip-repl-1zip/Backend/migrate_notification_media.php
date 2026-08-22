<?php

declare(strict_types=1);

/**
 * One-time production migration for in-app notification images.
 *
 * This endpoint is intentionally GET-only so it can be opened manually after
 * the file is uploaded. It reads DB_HOST/DB_NAME/DB_USER/DB_PASS from .env.
 */

header('Content-Type: text/plain; charset=UTF-8');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo "GET only\n";
    exit;
}

require_once __DIR__ . '/bootstrap/env.php';

function notificationColumnExists(PDO $db, string $column): bool
{
    $statement = $db->prepare(<<<'SQL'
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'notifications'
          AND column_name = :column
        SQL);
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

    echo "BII notification media migration\n";

    if (notificationColumnExists($db, 'image_url')) {
        echo "image_url: already added\n";
    } else {
        $db->exec(
            "ALTER TABLE `notifications` " .
            "ADD COLUMN `image_url` VARCHAR(512) NOT NULL DEFAULT ''"
        );
        echo "image_url: added\n";
    }

    echo "status: complete\n";
} catch (Throwable $error) {
    http_response_code(500);
    error_log('Notification media migration failed: ' . $error->getMessage());
    echo "ERROR: migration failed: {$error->getMessage()}\n";
    exit;
}
