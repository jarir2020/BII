<?php
/**
 * Auto-migration: Inject Firebase service_account_json into configs table.
 *
 * Visit once in browser → runs automatically → DELETE this file after.
 *
 * 2026-08-10: Created to fix "FCM: OAuth token generation failed".
 */

declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');

// ── Embedded Service Account JSON ──────────────────────────────────
$SERVICE_ACCOUNT_JSON = <<<'JSON'
{
  "type": "service_account",
  "project_id": "bengali-islamic-institute",
  "private_key_id": "7210842586aac3fcf1eb1c96585a78d7e59bccb6",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC2EXQxWWKsWgfO\nFTvHjn5/K+1ketpBh9TuQQgMqQkgLA/GyvxfbL+L2TwPO6aDkUq16pp6JUdPk/cC\nzFlF2V0bKJekEt4l+Ij1FpflBsHh8spuW1V826t+QBm+pqbpI3IqizrPM6/SA8dr\n3ohRxd8fowV8Un4Q9Z8wOJ82wXT24NnXJjivU3Pnqq51ZoYaq1I+paCMVflydvDy\n8zwyODcPFyXB4EPsySstdLibot+BAwpYcRCvzfFDliAJxyDWed61v0V9kSwWeCid\nunq4gQUHw4QRaoxi5p5xnihs3Zin52nnvVMdlTaOx9TI58yOungXqU4wE7mzMrZ3\n78qDTZ03AgMBAAECggEAPVAHZw8I8a2n7zirVvqfksgCO9I7adIKXOm9gjXygskT\nzwhQkPoYT0oqtZ6K5seo9zY4K2Yea6gSiPi0H5ehiSHUX0aTVQorZQ3kvRXXePXA\nQgWz9kYrrGp9wPxyPRTYv4b/mQN49Cqdn6/jDFasWwUVNda56ZAtuZl31IK1luVz\n/SDlXcV9/z/1CZ1CwWHVWeO9wcf4CrIc4Pj333WXOA8rRFVBg/6LTT5ARZVmy+Ts\nchDtww8YON9Dcxpa0iChb2J5q7QdOGW823HC92XNgcYzBhtduANQMSYq6FmT7Ggp\nj/AHz3sl09vemNh2Uvpec/nc2N4HToXCezc2gEBr8QKBgQDmnylQ1ANLYpgMCv5+\nNaV923cVv6QU8/jXr2V5v9JXGMFdIJTpQGkR4SQ3akjKQ/IY/48QYxyXqwZ9UzwX\n92uc/A7YuVY8Ws8Xv2Z7VU03FgSpo97ZxcwpxG9PzgiE+RYZZjsCqaTdMTBH3Gu7\nsriP/eatbgwp+Z7PTnA9ugD1awKBgQDKGn3ouwKhVMXvfMbFWklUeMpfleb5Rcrq\nS/QadWWWrlI4CXl/o03NlE5Ob3t8KDau9rBnZUwAlQSCC3QRkLglv03o+K96Ib9q\nQ2v7Az4kBGaeVtRV5RPdagqKCisGk19QvJn09khN3tYuqIXRrAwY+gsvQqhIDpzS\nqoi9cM7eZQKBgQC4uHFyYW8GGcGpm8C+PKACkB/xVp/JfKUrtTx1aVTEGHsA6dD8\nh2/hN1E35bTJ9eRba48e1BQZ044OIfY3SCF1C1uk8caF70KDRfaDAQ8o+UTgz/X2\nvnzKU6HI7UFbqNuvmnfXqSP5W6XNWVsda4hzJS54aXXqxRsT90Ll3i9YYwKBgQCc\nZsX7fgW6Dh2jiP9WKNnIyjVqpVn6nD089gxxEVrNshekkAh7c0g5iMTUxEdevMwc\nuIGpcmXPqYK0lOJ82W74n0ROv20k6cr1FDoTJd5IBzPW40EtO7sUxQRk8Rt82j2Q\nAHRwcstfn8xGjVoJ+cfe6FoRd9c89Dn+ecSaPhuJVQKBgQCef+ttlTW2kviVetgW\nJnifMIexjKLhWzupt2FYhl1rHLQ8tG7xtEVXuSaYWZXIvsRTZXGKJXXITd4s32MW\nW3xBAKH+hDAf6R+svbfk84uavR0kYn9ddhlftx3ONlsgrrcM0NQ4X+uTeTn221tJ\nQAVHJpB68eLev8USOUhynPvk7A==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@bengali-islamic-institute.iam.gserviceaccount.com",
  "client_id": "104271650708824457078",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bengali-islamic-institute.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
JSON;

// ── DB connection ───────────────────────────────────────────────────
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
    die("<h2>❌ DB connection failed</h2><pre>" . htmlspecialchars($e->getMessage()) . "</pre>");
}

// ── Validate the embedded JSON ──────────────────────────────────────
$sa = json_decode($SERVICE_ACCOUNT_JSON, true);
if (!is_array($sa) || empty($sa['client_email']) || empty($sa['private_key'])) {
    die("<h2>❌ Embedded service account JSON is invalid</h2>");
}

// ── Read existing firebase config to preserve other fields ──────────
$stmt = $pdo->prepare("SELECT data FROM configs WHERE `key` = 'firebase'");
$stmt->execute();
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$existing = ($row && is_string($row['data'])) ? (json_decode($row['data'], true) ?? []) : [];

// Merge: keep existing web config fields, inject/replace service_account_json
$firebaseConfig = array_merge($existing, [
    'service_account_json' => $SERVICE_ACCOUNT_JSON,
    'project_id'           => $sa['project_id'] ?? $existing['project_id'] ?? '',
]);

// ── Upsert `firebase` config ────────────────────────────────────────
$json = json_encode($firebaseConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$exists = $pdo->prepare("SELECT `key` FROM configs WHERE `key` = 'firebase'");
$exists->execute();
if ($exists->fetch()) {
    $upd = $pdo->prepare("UPDATE configs SET data = :data, updated_at = :now WHERE `key` = 'firebase'");
    $upd->execute([':data' => $json, ':now' => date('Y-m-d H:i:s')]);
} else {
    $ins = $pdo->prepare("INSERT INTO configs (`key`, `data`, `updated_at`) VALUES ('firebase', :data, :now)");
    $ins->execute([':data' => $json, ':now' => date('Y-m-d H:i:s')]);
}

// ── Sync `firebase-web` (client-safe subset) ────────────────────────
$clientSafe = [
    'api_key'             => $firebaseConfig['api_key']             ?? '',
    'auth_domain'         => $firebaseConfig['auth_domain']         ?? '',
    'project_id'          => $firebaseConfig['project_id']          ?? '',
    'storage_bucket'      => $firebaseConfig['storage_bucket']      ?? '',
    'messaging_sender_id' => $firebaseConfig['messaging_sender_id'] ?? '',
    'app_id'              => $firebaseConfig['app_id']              ?? '',
    'vapid_key'           => $firebaseConfig['vapid_key']           ?? '',
];
$webJson = json_encode($clientSafe, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$existsWeb = $pdo->prepare("SELECT `key` FROM configs WHERE `key` = 'firebase-web'");
$existsWeb->execute();
if ($existsWeb->fetch()) {
    $updWeb = $pdo->prepare("UPDATE configs SET data = :data, updated_at = :now WHERE `key` = 'firebase-web'");
    $updWeb->execute([':data' => $webJson, ':now' => date('Y-m-d H:i:s')]);
} else {
    $insWeb = $pdo->prepare("INSERT INTO configs (`key`, `data`, `updated_at`) VALUES ('firebase-web', :data, :now)");
    $insWeb->execute([':data' => $webJson, ':now' => date('Y-m-d H:i:s')]);
}

// ── Verify ──────────────────────────────────────────────────────────
$verify = $pdo->prepare("SELECT data FROM configs WHERE `key` = 'firebase'");
$verify->execute();
$check = $verify->fetch(PDO::FETCH_ASSOC);
$checkData = ($check && is_string($check['data'])) ? json_decode($check['data'], true) : [];
$ok = !empty($checkData['service_account_json']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FCM Migration — <?= $ok ? 'Done' : 'Failed' ?></title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 2rem; }
  .card { max-width: 600px; width: 100%; background: #1e293b; border-radius: 12px; padding: 2rem; border: 1px solid #334155; text-align: center; }
  .icon { font-size: 4rem; margin-bottom: 1rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  .ok h1 { color: #10b981; }
  .fail h1 { color: #ef4444; }
  .detail { background: #0f172a; border-radius: 8px; padding: 1rem; margin: 1rem 0; text-align: left; font-size: 0.85rem; border: 1px solid #334155; }
  .detail dt { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; margin-top: 0.5rem; }
  .detail dt:first-child { margin-top: 0; }
  .detail dd { color: #e2e8f0; font-family: monospace; word-break: break-all; }
  .warn { background: #78350f; border: 1px solid #f59e0b; color: #fcd34d; padding: 0.8rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-top: 1rem; }
  code { background: #334155; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; }
</style>
</head>
<body>
<div class="card <?= $ok ? 'ok' : 'fail' ?>">
  <div class="icon"><?= $ok ? '✅' : '❌' ?></div>
  <h1><?= $ok ? 'Migration Complete' : 'Migration Failed' ?></h1>
  <p style="color:#94a3b8;margin-top:0.5rem">
    <?= $ok ? 'Firebase service_account_json has been saved to the database.' : 'Something went wrong — check details below.' ?>
  </p>

  <dl class="detail">
    <dt>Client Email</dt>
    <dd><?= htmlspecialchars($sa['client_email']) ?></dd>
    <dt>Project ID</dt>
    <dd><?= htmlspecialchars($sa['project_id']) ?></dd>
    <dt>Config Key</dt>
    <dd><code>firebase</code> + <code>firebase-web</code></dd>
    <dt>Service Account</dt>
    <dd><?= $ok ? '✅ Saved' : '❌ Missing' ?></dd>
  </dl>

  <div class="warn">
    ⚠️ <strong>Delete this file now:</strong><br>
    <code>deploy/_staging/migrate-firebase-service-account.php</code>
  </div>
</div>
</body>
</html>
