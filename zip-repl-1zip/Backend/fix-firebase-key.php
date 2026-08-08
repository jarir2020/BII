<?php
/**
 * One-time fix: correct the Firebase Web API key.
 *
 * Upload to public_html and visit once in browser, then DELETE this file.
 *
 * Created: 2026-08-09
 */

declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');

// ── DB connection (reads .env or falls back to defaults) ────────────
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    foreach (explode("\n", file_get_contents($envFile)) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') !== false) {
            [$k, $v] = explode('=', $line, 2);
            putenv(trim($k) . '=' . trim($v));
        }
    }
}

$host = getenv('DB_HOST') ?: 'localhost';
$db   = getenv('DB_NAME') ?: 'bii';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    echo "DB connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

// ── Read current config ─────────────────────────────────────────────
$stmt = $pdo->prepare("SELECT data FROM configs WHERE `key` = 'firebase-web'");
$stmt->execute();
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    echo "No 'firebase-web' config found in configs table.\n";
    exit(1);
}

$config = json_decode($row['data'], true);
if (!is_array($config)) {
    echo "firebase-web config is not valid JSON.\n";
    exit(1);
}

$oldKey = $config['api_key'] ?? '(missing)';
echo "Current api_key: $oldKey\n";

// ── Fix: replace the wrong key with the correct one ─────────────────
// Wrong:  AIzaSyBOUu-_wiLuw7djVxV3J3jEayBmqVCDI3MM  (V3J3)
// Correct: AIzaSyBOUu-_wiLuw7djVxV3JjEayBmqVCDI3MM   (V3Jj)
$correctKey = 'AIzaSyBOUu-_wiLuw7djVxV3JjEayBmqVCDI3MM';

$config['api_key'] = $correctKey;

$stmt = $pdo->prepare("UPDATE configs SET data = :data, updated_at = :now WHERE `key` = 'firebase-web'");
$stmt->execute([
    ':data' => json_encode($config, JSON_UNESCAPED_UNICODE),
    ':now'  => date('Y-m-d H:i:s'),
]);

echo "Updated api_key to: $correctKey\n";
echo "Done. You can delete this file now.\n";
