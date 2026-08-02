<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use GuzzleHttp\Client;
use Throwable;
use Yii;

/**
 * /api/notifications/*, /api/contact, /api/push-notifications/*.
 */
class NotificationsController extends ApiController
{
    /** GET (public list) / POST (admin create) /api/notifications */
    public function actionIndex(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            $this->requireAdmin();
            $b = Yii::$app->request->post();
            $doc = [
                'id' => Uuid::v4(),
                'user_id' => (string) ($b['user_id'] ?? ''),
                'title_bn' => (string) ($b['title_bn'] ?? ''),
                'title_en' => (string) ($b['title_en'] ?? ''),
                'body_bn' => (string) ($b['body_bn'] ?? ''),
                'body_en' => (string) ($b['body_en'] ?? ''),
                'read' => 0,
                'created_at' => $this->now(),
            ];
            Yii::$app->db->createCommand()->insert('notifications', $doc)->execute();
            return $this->json($doc);
        }
        $rows = Yii::$app->db->createCommand('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200')->queryAll();
        return $this->json($rows);
    }

    /** DELETE /api/notifications/{id} */
    public function actionDelete(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        Yii::$app->db->createCommand()->delete('notifications', ['id' => $id])->execute();
        return $this->json(['ok' => true]);
    }

    /** POST /api/notifications/register-device */
    public function actionRegisterDevice(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();
        $token = trim((string) ($body['token'] ?? ''));
        if ($token === '') {
            $this->badRequest('Token required');
        }
        $platform = (string) ($body['platform'] ?? '');
        $exists = Yii::$app->db->createCommand(
            'SELECT id FROM device_tokens WHERE user_id = :u AND token = :t', [':u' => $user['id'], ':t' => $token]
        )->queryOne();
        if ($exists === false) {
            Yii::$app->db->createCommand()->insert('device_tokens', [
                'id' => Uuid::v4(), 'user_id' => $user['id'], 'token' => $token,
                'device_type' => $platform, 'platform' => $platform, 'user_email' => $user['email'] ?? '',
                'created_at' => $this->now(), 'updated_at' => $this->now(),
            ])->execute();
        } else {
            Yii::$app->db->createCommand()->update('device_tokens', [
                'platform' => $platform, 'device_type' => $platform, 'updated_at' => $this->now(),
            ], ['id' => $exists['id']])->execute();
        }
        return $this->json(['ok' => true]);
    }

    /** DELETE /api/notifications/unregister-device */
    public function actionUnregisterDevice(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();
        $token = trim((string) ($body['token'] ?? ''));
        Yii::$app->db->createCommand()->delete('device_tokens', ['user_id' => $user['id'], 'token' => $token])->execute();
        return $this->json(['ok' => true]);
    }

    /** POST (public) / GET (admin) /api/contact */
    public function actionContact(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            $b = Yii::$app->request->post();
            Yii::$app->db->createCommand()->insert('contact_messages', [
                'id' => Uuid::v4(),
                'name' => (string) ($b['name'] ?? ''),
                'email' => (string) ($b['email'] ?? ''),
                'phone' => (string) ($b['phone'] ?? ''),
                'subject' => (string) ($b['subject'] ?? ''),
                'message' => (string) ($b['message'] ?? ''),
                'created_at' => $this->now(),
            ])->execute();
            return $this->json(['ok' => true]);
        }
        $this->requireAdmin();
        $rows = Yii::$app->db->createCommand('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 500')->queryAll();
        return $this->json($rows);
    }

    /** GET (list) / POST (create+send) /api/push-notifications */
    public function actionPush(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            $this->requireAdmin();
            $b = Yii::$app->request->post();
            $doc = [
                'id' => Uuid::v4(),
                'title_bn' => (string) ($b['title_bn'] ?? ''),
                'title_en' => (string) ($b['title_en'] ?? ''),
                'body_bn' => (string) ($b['body_bn'] ?? ''),
                'body_en' => (string) ($b['body_en'] ?? ''),
                'target' => (string) ($b['target'] ?? 'all'),
                'image_url' => (string) ($b['image_url'] ?? ''),
                'scheduled_for' => ($b['scheduled_for'] ?? null),
                'sent_at' => null,
                'created_at' => $this->now(),
            ];
            Yii::$app->db->createCommand()->insert('push_notifications', $doc)->execute();

            if (empty($doc['scheduled_for'])) {
                $this->sendFcm($doc);
                Yii::$app->db->createCommand()->update('push_notifications', ['sent_at' => $this->now()], ['id' => $doc['id']])->execute();
                $doc['sent_at'] = $this->now();
            }
            return $this->json($doc);
        }
        $this->requireAdmin();
        $rows = Yii::$app->db->createCommand('SELECT * FROM push_notifications ORDER BY created_at DESC')->queryAll();
        return $this->json($rows);
    }

    /** DELETE /api/push-notifications/{id} */
    public function actionPushDelete(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        Yii::$app->db->createCommand()->delete('push_notifications', ['id' => $id])->execute();
        return $this->json(['ok' => true]);
    }

    /** Best-effort FCM legacy send; no-op (logged) when not configured. */
    private function sendFcm(array $notif): void
    {
        $cfg = $this->configValue('firebase');
        $serverKey = (string) ($cfg['server_key'] ?? $cfg['serverKey'] ?? '');
        if ($serverKey === '') {
            Yii::warning('FCM server key not configured; push not sent.', __METHOD__);
            return;
        }
        $tokens = [];
        $rows = Yii::$app->db->createCommand('SELECT token FROM device_tokens')->queryAll();
        foreach ($rows as $r) {
            $tokens[] = $r['token'];
        }
        if ($tokens === []) {
            return;
        }
        $title = $notif['title_bn'] ?: $notif['title_en'];
        $body = $notif['body_bn'] ?: $notif['body_en'];
        try {
            $client = new Client(['timeout' => 15]);
            $client->post('https://fcm.googleapis.com/fcm/send', [
                'headers' => ['Authorization' => 'key=' . $serverKey, 'Content-Type' => 'application/json'],
                'json' => [
                    'registration_ids' => $tokens,
                    'notification' => ['title' => $title, 'body' => $body, 'click_action' => 'FLUTTER_NOTIFICATION_CLICK'],
                ],
            ]);
        } catch (Throwable $e) {
            Yii::warning("FCM send failed: {$e->getMessage()}", __METHOD__);
        }
    }
}
