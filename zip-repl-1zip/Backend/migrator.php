<?php
// 2026-08-24: GET-based raw migration — add start_at/end_at to monthly_quizzes.
// Load https://<domain>/migrator.php once after deploy. Idempotent.
// Reads DB creds from .env (or environment).

header('Content-Type: text/plain');

$envFile = is_file(__DIR__ . '/.env') ? __DIR__ . '/.env' : __DIR__ . '/../.env';
$creds = ['DB_HOST' => '127.0.0.1', 'DB_NAME' => 'bii_db', 'DB_USER' => '', 'DB_PASS' => ''];
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (preg_match('/^(DB_HOST|DB_NAME|DB_USER|DB_PASS)\s*=\s*(.*)$/', trim($line), $m)) {
            $creds[$m[1]] = trim($m[2]);
        }
    }
} else {
    foreach (array_keys($creds) as $k) {
        $v = getenv($k);
        if ($v !== false) $creds[$k] = $v;
    }
}

try {
    $pdo = new PDO(
        "mysql:host={$creds['DB_HOST']};dbname={$creds['DB_NAME']};charset=utf8mb4",
        $creds['DB_USER'],
        $creds['DB_PASS'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $cols = [];
    foreach ($pdo->query("SHOW COLUMNS FROM `monthly_quizzes`") as $c) {
        $cols[] = $c['Field'];
    }

    $added = [];
    if (!in_array('start_at', $cols, true)) {
        $pdo->exec("ALTER TABLE `monthly_quizzes` ADD COLUMN `start_at` VARCHAR(19) NOT NULL DEFAULT ''");
        $added[] = 'start_at';
    }
    if (!in_array('end_at', $cols, true)) {
        $pdo->exec("ALTER TABLE `monthly_quizzes` ADD COLUMN `end_at` VARCHAR(19) NOT NULL DEFAULT ''");
        $added[] = 'end_at';
    }

    echo $added ? 'Added columns: ' . implode(', ', $added) : 'Columns already exist — nothing to do.';
} catch (PDOException $e) {
    http_response_code(500);
    exit('DB error: ' . $e->getMessage());
}
