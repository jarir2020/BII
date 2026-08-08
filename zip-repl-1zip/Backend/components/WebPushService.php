<?php

declare(strict_types=1);

namespace app\components;

use Firebase\JWT\JWT;
use GuzzleHttp\Client;
use Yii;

/**
 * Web Push Protocol (VAPID) — sends push notifications directly to
 * browser push services without any Firebase dependency.
 *
 * Uses the Web Push Encryption standard:
 * - VAPID keys authenticate our server to the push service
 * - Browser provides a subscription endpoint + encryption keys
 * - We encrypt the payload and POST to the endpoint
 *
 * 2026-08-08: Created for zero-Firebase push notifications.
 */
class WebPushService
{
    /**
     * Get or generate the VAPID key pair.
     * Returns ['public_key' => ..., 'private_key' => ...].
     */
    public static function getVapidKeys(): array
    {
        $db = Yii::$app->db;
        $row = $db->createCommand('SELECT * FROM web_push_vapid_keys ORDER BY created_at DESC LIMIT 1')->queryOne();

        if ($row) {
            return ['public_key' => $row['public_key'], 'private_key' => $row['private_key']];
        }

        // Generate new key pair
        $keyPair = self::generateVapidKeys();
        $db->createCommand()->insert('web_push_vapid_keys', [
            'id' => \app\helpers\Uuid::v4(),
            'public_key' => $keyPair['public_key'],
            'private_key' => $keyPair['private_key'],
            'created_at' => (new \DateTime('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.u\Z'),
        ])->execute();

        return $keyPair;
    }

    /**
     * Get just the public VAPID key (for the frontend).
     */
    public static function getPublicKey(): string
    {
        return self::getVapidKeys()['public_key'];
    }

    /**
     * Send a web push notification to a list of subscriptions.
     *
     * @param array $notif  Notification data (title_bn, body_bn, click_action, etc.)
     * @param array $subscriptions  List of ['endpoint', 'p256dh', 'auth'] arrays.
     * @return array{sent: int, failed: int, errors: string}
     */
    public static function send(array $notif, array $subscriptions): array
    {
        if ($subscriptions === []) {
            return ['sent' => 0, 'failed' => 0, 'errors' => ''];
        }

        $vapidKeys = self::getVapidKeys();
        $sent = 0;
        $failed = 0;
        $errors = [];
        $staleEndpoints = [];

        // Build the payload
        $title = $notif['title_bn'] ?: ($notif['title_en'] ?: 'BII');
        $body = $notif['body_bn'] ?: ($notif['body_en'] ?: '');
        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'icon' => '/logo192.png',
            'image' => $notif['image_url'] ?? '',
            'click_action' => $notif['click_action'] ?? '/',
            'title_bn' => $notif['title_bn'] ?? '',
            'title_en' => $notif['title_en'] ?? '',
            'body_bn' => $notif['body_bn'] ?? '',
            'body_en' => $notif['body_en'] ?? '',
        ]);

        $client = new Client(['timeout' => 15]);

        foreach ($subscriptions as $sub) {
            $endpoint = $sub['endpoint'] ?? '';
            $p256dh = $sub['p256dh'] ?? '';
            $auth = $sub['auth'] ?? '';

            if ($endpoint === '' || $p256dh === '' || $auth === '') {
                $failed++;
                continue;
            }

            try {
                // Encrypt the payload for this subscription
                $encrypted = self::encryptPayload($payload, $p256dh, $auth);
                if (!$encrypted) {
                    $failed++;
                    $errors[] = "Encryption failed for endpoint " . substr($endpoint, -20);
                    continue;
                }

                // Generate VAPID JWT
                $vapidJwt = self::generateVapidJwt($endpoint, $vapidKeys['private_key']);

                // Send to the push service
                $resp = $client->post($endpoint, [
                    'headers' => [
                        'Content-Type' => 'application/octet-stream',
                        'Content-Encoding' => 'aes128gcm',
                        'Content-Length' => strlen($encrypted),
                        'TTL' => '86400',
                        'Authorization' => 'vapid t=' . $vapidJwt . ', k=' . $vapidKeys['public_key'],
                    ],
                    'body' => $encrypted,
                ]);

                $status = $resp->getStatusCode();
                if ($status >= 200 && $status < 300) {
                    $sent++;
                } else {
                    $failed++;
                    $errors[] = "HTTP {$status} for " . substr($endpoint, -20);
                }
            } catch (\Throwable $e) {
                $failed++;
                $errMsg = $e->getMessage();

                // Track stale subscriptions (404 Gone, 410 Gone)
                if (str_contains($errMsg, '404') || str_contains($errMsg, '410') || str_contains($errMsg, 'Gone')) {
                    $staleEndpoints[] = $endpoint;
                }
                $errors[] = substr($endpoint, -20) . ": " . substr($errMsg, 0, 80);
            }
        }

        // Clean up stale subscriptions
        if ($staleEndpoints !== []) {
            self::cleanupStaleSubscriptions($staleEndpoints);
        }

        return [
            'sent' => $sent,
            'failed' => $failed,
            'errors' => implode('; ', array_slice($errors, 0, 5)),
        ];
    }

    /**
     * Encrypt a payload using AES-128-GCM per the Web Push standard.
     * This is a simplified implementation using OpenSSL.
     *
     * @return string|false  The encrypted payload or false on failure.
     */
    private static function encryptPayload(string $payload, string $userPublicKey, string $userAuth): string|false
    {
        try {
            // Decode the user's keys
            $userPublicKeyBytes = base64_decode(strtr($userPublicKey, '-_', '+/') . '==', true);
            $userAuthBytes = base64_decode(strtr($userAuth, '-_', '+/') . '==', true);

            if (strlen($userPublicKeyBytes) !== 65 || strlen($userAuthBytes) !== 16) {
                return false;
            }

            // Generate local ECDH key pair
            $localKey = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
            if (!$localKey) return false;

            $localDetails = openssl_pkey_get_details($localKey);
            $localPublicKey = $localDetails['ec']['x'] . $localDetails['ec']['y'];

            // ECDH shared secret
            $sharedSecret = openssl_pkey_derive($userPublicKeyBytes, $localKey, ['curve_name' => 'prime256v1']);
            if (!$sharedSecret) return false;

            // Derive encryption keys using HKDF
            $authInfo = "WebPush: info\x00" . $userPublicKeyBytes . $localPublicKey;
            $ikm = hash_hmac('sha256', $sharedSecret, $userAuth, true);
            $prk = hash_hmac('sha256', $ikm, $authInfo, true);

            $contentEncryptionKey = hash_hmac('sha256', "Content-Encoding: aes128gcm\x00", $prk, true);
            $salt = random_bytes(16);
            $keyMask = hash_hmac('sha256', "Content-Encoding: aes128gcm\x00", $salt, true);

            // XOR to get actual content encryption key
            $cek = '';
            for ($i = 0; $i < 16; $i++) {
                $cek .= chr(ord($contentEncryptionKey[$i]) ^ ord($keyMask[$i]));
            }

            // AES-128-GCM encryption
            $iv = random_bytes(12);
            $tag = '';
            $ciphertext = openssl_encrypt($payload, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $iv, $tag, '', 16);

            if ($ciphertext === false) return false;

            // Build aes128gcm header
            $header = $salt . pack('N', 4096) . pack('C', 1) . pack('n', strlen($localPublicKey)) . $localPublicKey;

            return $header . $iv . $ciphertext . $tag;
        } catch (\Throwable $e) {
            Yii::warning("WebPush encrypt failed: {$e->getMessage()}", __METHOD__);
            return false;
        }
    }

    /**
     * Generate a VAPID JWT for authorization.
     */
    private static function generateVapidJwt(string $endpoint, string $privateKey): string
    {
        $url = parse_url($endpoint);
        $audience = ($url['scheme'] ?? 'https') . '://' . ($url['host'] ?? '');

        // Import the private key
        $keyPem = self::convertVapidPrivateKey($privateKey);

        $now = time();
        $payload = [
            'aud' => $audience,
            'exp' => $now + 43200, // 12 hours
            'iat' => $now,
            'sub' => 'mailto:bii@bengaliislamicinstitute.com',
        ];

        return JWT::encode($payload, $keyPem, 'ES256');
    }

    /**
     * Convert VAPID private key (base64url) to PEM format for JWT signing.
     */
    private static function convertVapidPrivateKey(string $vapidPrivateKey): string
    {
        $keyBytes = base64_decode(strtr($vapidPrivateKey, '-_', '+/') . '==', true);
        if (strlen($keyBytes) !== 32) {
            throw new \RuntimeException('Invalid VAPID private key length');
        }

        // Build EC private key in DER format
        $der = hex2bin('302e0201010420' . bin2hex($keyBytes) . 'a0060204608648016503040203');
        $pem = "-----BEGIN EC PRIVATE KEY-----\n"
            . chunk_split(base64_encode($der), 64, "\n")
            . "-----END EC PRIVATE KEY-----\n";

        return $pem;
    }

    /**
     * Generate a VAPID key pair using OpenSSL.
     */
    private static function generateVapidKeys(): array
    {
        $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        if (!$key) {
            throw new \RuntimeException('Failed to generate VAPID keys');
        }

        $details = openssl_pkey_get_details($key);
        $privateKeyBytes = $details['ec']['d'];
        $publicKeyBytes = $details['ec']['x'] . $details['ec']['y'];

        // Free the key
        openssl_pkey_free($key);

        return [
            'public_key' => rtrim(strtr(base64_encode($publicKeyBytes), '+/', '-_'), '='),
            'private_key' => rtrim(strtr(base64_encode($privateKeyBytes), '+/', '-_'), '='),
        ];
    }

    /**
     * Remove stale (410 Gone) push subscriptions.
     */
    private static function cleanupStaleSubscriptions(array $endpoints): void
    {
        if ($endpoints === []) return;
        $params = [];
        $placeholders = [];
        foreach ($endpoints as $i => $ep) {
            $key = ':ep' . $i;
            $placeholders[] = $key;
            $params[$key] = $ep;
        }
        $in = implode(',', $placeholders);
        Yii::$app->db->createCommand(
            "DELETE FROM web_push_subscriptions WHERE endpoint IN ($in)",
            $params
        )->execute();
    }
}
