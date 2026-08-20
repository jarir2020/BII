<?php

declare(strict_types=1);

/**
 * One-time production repair for reward_ads.platform.
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

function rewardAdsColumnExists(PDO $db, string $column): bool
{
    $statement = $db->prepare(<<<'SQL'
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'reward_ads'
          AND column_name = :column
        SQL);
    $statement->execute([':column' => $column]);

    return (int) $statement->fetchColumn() > 0;
}

function rewardAdsIndexExists(PDO $db, string $index): bool
{
    $statement = $db->prepare(<<<'SQL'
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'reward_ads'
          AND index_name = :index_name
        SQL);
    $statement->execute([':index_name' => $index]);

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

    echo "BII reward ads platform migration\n";

    if (rewardAdsColumnExists($db, 'platform')) {
        echo "platform: already added\n";
    } else {
        $db->exec(
            "ALTER TABLE `reward_ads` " .
            "ADD COLUMN `platform` VARCHAR(16) NOT NULL DEFAULT 'all'"
        );
        echo "platform: added\n";
    }

    if (rewardAdsIndexExists($db, 'idx_ra_platform')) {
        echo "idx_ra_platform: already added\n";
    } else {
        $db->exec(
            "CREATE INDEX `idx_ra_platform` ON `reward_ads` (`platform`)"
        );
        echo "idx_ra_platform: added\n";
    }

    echo "status: complete\n";
} catch (Throwable $error) {
    http_response_code(500);
    error_log('Reward ads platform migration failed: ' . $error->getMessage());
    echo "ERROR: migration failed: {$error->getMessage()}\n";
    exit;
}
