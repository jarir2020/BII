<?php

/**
 * Codeception Bootstrap File for Yii2 Unit/Functional Tests
 * Uses SQLite test database (in-memory or file-based)
 */

// Ensure test directory exists
$testDir = __DIR__ . '/Support';
if (!is_dir($testDir)) {
    mkdir($testDir, 0755, true);
}

// SQLite test database path - will be created automatically by Yii2
// Using file-based SQLite so it persists across test runs but is separate from prod DB
'yii\db\Connection::class' => require __DIR__ . '/test_db.php';

// Bootstrap mailer (uses file transport in test mode)
require __DIR__ . '/MailerBootstrap.php';

// Disable debug mode for tests
defined('YII_DEBUG') or define('YII_DEBUG', true);

// Set test environment
putenv('YII_ENV=test');
putenv('YII_DEBUG=1');