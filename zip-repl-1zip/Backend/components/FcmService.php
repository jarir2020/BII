<?php

declare(strict_types=1);

namespace app\components;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use GuzzleHttp\Client;
use Yii;

/**
 * FCM v1 service — OAuth2 token + send via HTTP v1 API.
 *
 * Replaces the deprecated legacy FCM API. Uses the service_account_json
 * stored in the `firebase` config by the admin Settings panel.
 *
 * 2026-08-08: Created for notification system overhaul.
 */
class FcmService
{
    private static ?string $cachedAccessToken = null;
    private static int $tokenExpiresAt = 0;

    /**
     * Generate a Google OAuth2 access token from the service account.
     * Cached for 55 minutes (token valid for 60 min).
     */
    public static function getAccessToken(): ?string
    {
        if (self::$cachedAccessToken && time() < self::$tokenExpiresAt) {
            return self::$cachedAccessToken;
        }

        $cfg = self::loadFirebaseConfig();
        $saJson = (string) ($cfg['service_account_json'] ?? '');
        if ($saJson === '') {
            Yii::error('FCM: service_account_json is empty — paste your Firebase Service Account JSON in Settings → Firebase.', __METHOD__);
            return null;
        }

        $sa = json_decode($saJson, true);
        if (!$sa || !is_array($sa)) {
            Yii::error('FCM: service_account_json is not valid JSON. Check for trailing commas or missing quotes.', __METHOD__);
            return null;
        }
        if (empty($sa['client_email']) || empty($sa['private_key'])) {
            $missing = [];
            if (empty($sa['client_email'])) $missing[] = 'client_email';
            if (empty($sa['private_key'])) $missing[] = 'private_key';
            Yii::error('FCM: service_account_json missing fields: ' . implode(', ', $missing) . '. Download a new key from Firebase Console → Project Settings → Service Accounts.', __METHOD__);
            return null;
        }

        $now = time();
        $payload = [
            'iss' => $sa['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ];

        $jwt = JWT::encode($payload, $sa['private_key'], 'RS256');

        try {
            $client = new Client(['timeout' => 15]);
            $resp = $client->post('https://oauth2.googleapis.com/token', [
                'form_params' => [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $jwt,
                ],
            ]);
            $data = json_decode($resp->getBody()->getContents(), true);
            $token = $data['access_token'] ?? null;
            if ($token) {
                self::$cachedAccessToken = $token;
                self::$tokenExpiresAt = $now + 3300; // 55 min cache
            }
            return $token;
        } catch (\Throwable $e) {
            Yii::error("FCM OAuth token failed: {$e->getMessage()}", __METHOD__);
            return null;
        }
    }

    /**
     * Send a push notification to a list of device tokens via FCM v1.
     *
     * @param array $notif  The notification record from push_notifications.
     * @param array $tokens List of ['id' => ..., 'token' => ..., 'user_id' => ..., 'platform' => ...].
     * @return array{sent: int, failed: int, errors: string}
     */
    public static function send(array $notif, array $tokens): array
    {
        $accessToken = self::getAccessToken();
        if (!$accessToken) {
            return ['sent' => 0, 'failed' => count($tokens), 'errors' => 'OAuth token generation failed'];
        }

        $cfg = self::loadFirebaseConfig();
        $projectId = (string) ($cfg['project_id'] ?? '');
        if ($projectId === '') {
            return ['sent' => 0, 'failed' => count($tokens), 'errors' => 'Firebase project_id not configured'];
        }

        $title = $notif['title_bn'] ?: ($notif['title_en'] ?: 'BII');
        $body = $notif['body_bn'] ?: ($notif['body_en'] ?: '');
        $imageUrl = (string) ($notif['image_url'] ?? '');
        $clickAction = (string) ($notif['click_action'] ?? '/');

        // FCM requires a publicly reachable absolute URL for notification images.
        $fullImageUrl = $imageUrl;
        if ($imageUrl !== '' && str_starts_with($imageUrl, '/')) {
            $host = Yii::$app->request->hostInfo ?? 'https://bengaliislamicinstitute.com';
            $fullImageUrl = rtrim($host, '/') . $imageUrl;
        }

        $sent = 0;
        $failed = 0;
        $errors = [];

        $client = new Client(['timeout' => 15]);

        foreach ($tokens as $t) {
            $token = $t['token'] ?? '';
            $platform = $t['platform'] ?? 'web';
            if ($token === '') {
                $failed++;
                continue;
            }

            // Build message per FCM v1 spec
            $message = [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
            ];

            // Image
            if ($fullImageUrl !== '') {
                $message['notification']['image'] = $fullImageUrl;
            }

            // Data payload (always sent — web + android read from this). Keep
            // canonical title/body keys as well as language-specific keys so
            // the service worker can render background/data-only pushes.
            $message['data'] = [
                'title' => $title,
                'body' => $body,
                'click_action' => $clickAction,
                'icon' => $fullImageUrl !== '' ? $fullImageUrl : '/logo192.png',
                'title_bn' => $notif['title_bn'] ?? '',
                'title_en' => $notif['title_en'] ?? '',
                'body_bn' => $notif['body_bn'] ?? '',
                'body_en' => $notif['body_en'] ?? '',
                'image' => $fullImageUrl,
            ];

            // Android config
            if (in_array($platform, ['android', 'app', ''], true)) {
                $message['android'] = [
                    'priority' => 'high',
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                        'click_action' => 'OPEN_ACTIVITY',
                        'sound' => 'default',
                    ],
                ];
                if ($fullImageUrl !== '') {
                    $message['android']['notification']['image'] = $fullImageUrl;
                }
            }

            // Webpush config
            if ($platform === 'web') {
                $message['webpush'] = [
                    'headers' => ['TTL' => '86400'],
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                        // Firefox does not consistently render the large
                        // notification image, so use it as the icon too.
                        'icon' => $fullImageUrl !== '' ? $fullImageUrl : '/logo192.png',
                        'badge' => '/logo192.png',
                        'requireInteraction' => true,
                        'tag' => 'bii-push',
                    ],
                ];
                if ($fullImageUrl !== '') {
                    $message['webpush']['notification']['image'] = $fullImageUrl;
                }
            }

            try {
                $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";
                $resp = $client->post($url, [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $accessToken,
                        'Content-Type' => 'application/json',
                    ],
                    'json' => ['message' => $message],
                ]);
                $result = json_decode($resp->getBody()->getContents(), true);
                if (!empty($result['name'])) {
                    $sent++;
                } else {
                    $failed++;
                    $errors[] = "Empty response for token {$t['id']}";
                }
            } catch (\Throwable $e) {
                $failed++;
                $errMsg = $e->getMessage();

                // Delete stale tokens (UNREGISTERED, NotRegistered, or NOT_FOUND)
                if (str_contains($errMsg, 'UNREGISTERED') || str_contains($errMsg, 'NotRegistered') || str_contains($errMsg, 'NOT_FOUND')) {
                    self::deleteStaleToken($token);
                }
                $errors[] = "Token {$t['id']}: {$errMsg}";
            }
        }

        return [
            'sent' => $sent,
            'failed' => $failed,
            'errors' => implode('; ', array_slice($errors, 0, 5)),
        ];
    }

    /**
     * Resolve and send to a single logical target, such as user:{id}.
     * An empty target is deliberately a successful no-op.
     *
     * @return array{sent: int, failed: int, errors: string}
     */
    public static function sendToTarget(array $notif, string $target): array
    {
        $tokens = self::resolveTargets($target);
        if ($tokens === []) {
            return ['sent' => 0, 'failed' => 0, 'errors' => ''];
        }
        return self::send($notif, $tokens);
    }

    /**
     * Query device_tokens based on targeting.
     *
     * @param string $target  "all", "user:{uid}", or "course:{cid}"
     * @return array Tokens to send to.
     */
    public static function resolveTargets(string $target): array
    {
        $db = Yii::$app->db;

        if ($target === '' || $target === 'all') {
            return $db->createCommand(
                // Native VAPID endpoints are stored in device_tokens too, but
                // must be delivered by WebPushService rather than FCM.
                "SELECT id, token, user_id, platform FROM device_tokens
                 WHERE token NOT LIKE 'http://%' AND token NOT LIKE 'https://%'"
            )->queryAll();
        }

        if (preg_match('/^user:(.+)$/', $target, $m)) {
            $userId = $m[1];
            return $db->createCommand(
                "SELECT id, token, user_id, platform FROM device_tokens
                 WHERE user_id = :uid
                   AND token NOT LIKE 'http://%' AND token NOT LIKE 'https://%'",
                [':uid' => $userId]
            )->queryAll();
        }

        if (preg_match('/^course:(.+)$/', $target, $m)) {
            $courseId = $m[1];
            return $db->createCommand(
                "SELECT DISTINCT dt.id, dt.token, dt.user_id, dt.platform
                 FROM device_tokens dt
                 INNER JOIN enrollments e ON e.user_id = dt.user_id
                 WHERE e.course_id = :cid
                   AND e.payment_status IN (\"success\",\"paid\",\"completed\",\"approved\")
                   AND dt.token NOT LIKE 'http://%' AND dt.token NOT LIKE 'https://%'",
                [':cid' => $courseId]
            )->queryAll();
        }

        // Never broaden an unrecognised target into a broadcast.
        return [];
    }

    /**
     * Delete a stale device token (UNREGISTERED from FCM).
     */
    private static function deleteStaleToken(string $token): void
    {
        try {
            Yii::$app->db->createCommand()->delete('device_tokens', ['token' => $token])->execute();
        } catch (\Throwable $e) {
            Yii::warning("Failed to delete stale token: {$e->getMessage()}", __METHOD__);
        }
    }

    /**
     * Load firebase config directly from DB (used outside controller context).
     */
    private static function loadFirebaseConfig(): array
    {
        $row = Yii::$app->db->createCommand(
            "SELECT data FROM configs WHERE `key` = 'firebase'"
        )->queryOne();
        if ($row && is_string($row['data'])) {
            return json_decode($row['data'], true) ?? [];
        }
        return [];
    }
}
