<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\components\FcmService;
use app\components\WebPushService;
use app\helpers\Uuid;
use Throwable;
use Yii;

/**
 * /api/notifications/*, /api/contact, /api/push-notifications/*.
 *
 * 2026-08-08: Rewrote push sending to use FCM v1 OAuth2 via FcmService.
 * Added targeting (all/user/course), delivery stats, click_action, resend.
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

    /**
     * GET (list) / POST (create + send) /api/push-notifications.
     *
     * POST body: title_bn, title_en, body_bn, body_en, image_url,
     *            click_action, target (all|user:{uid}|course:{cid}),
     *            scheduled_for (ISO datetime or null for immediate).
     */
    public function actionPush(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            $this->requireAdmin();
            $b = Yii::$app->request->post();
            $target = (string) ($b['target'] ?? 'all');

            // Parse target into separate columns
            $targetUserId = '';
            $targetCourseId = '';
            if (preg_match('/^user:(.+)$/', $target, $m)) {
                $targetUserId = $m[1];
            } elseif (preg_match('/^course:(.+)$/', $target, $m)) {
                $targetCourseId = $m[1];
            }

            $scheduledFor = $b['scheduled_for'] ?? null;
            $isScheduled = !empty($scheduledFor) && strtotime((string) $scheduledFor) > time();

            $doc = [
                'id' => Uuid::v4(),
                'title_bn' => (string) ($b['title_bn'] ?? ''),
                'title_en' => (string) ($b['title_en'] ?? ''),
                'body_bn' => (string) ($b['body_bn'] ?? ''),
                'body_en' => (string) ($b['body_en'] ?? ''),
                'target' => $target,
                'target_user_id' => $targetUserId,
                'target_course_id' => $targetCourseId,
                'image_url' => (string) ($b['image_url'] ?? ''),
                'click_action' => (string) ($b['click_action'] ?? '/'),
                'scheduled_for' => $isScheduled ? (string) $scheduledFor : null,
                'status' => $isScheduled ? 'scheduled' : 'pending',
                'sent_count' => 0,
                'failed_count' => 0,
                'error' => null,
                'sent_at' => null,
                'created_at' => $this->now(),
            ];
            Yii::$app->db->createCommand()->insert('push_notifications', $doc)->execute();

            if (!$isScheduled) {
                $result = $this->sendPush($doc);
                $doc['status'] = $result['status'];
                $doc['sent_count'] = $result['sent'];
                $doc['failed_count'] = $result['failed'];
                $doc['error'] = $result['error'] ?: null;
                $doc['sent_at'] = $this->now();

                Yii::$app->db->createCommand()->update('push_notifications', [
                    'status' => $doc['status'],
                    'sent_count' => $doc['sent_count'],
                    'failed_count' => $doc['failed_count'],
                    'error' => $doc['error'],
                    'sent_at' => $doc['sent_at'],
                ], ['id' => $doc['id']])->execute();
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

    /**
     * POST /api/push-notifications/{id}/resend — retry a failed notification.
     */
    public function actionPushResend(string $id): \yii\web\Response
    {
        $this->requireAdmin();

        $row = Yii::$app->db->createCommand(
            'SELECT * FROM push_notifications WHERE id = :id', [':id' => $id]
        )->queryOne();

        if (!$row) {
            $this->notFound('Notification not found');
        }

        $result = $this->sendPush($row);

        Yii::$app->db->createCommand()->update('push_notifications', [
            'status' => $result['status'],
            'sent_count' => $result['sent'],
            'failed_count' => $result['failed'],
            'error' => $result['error'] ?: null,
            'sent_at' => $this->now(),
        ], ['id' => $id])->execute();

        return $this->json([
            'ok' => true,
            'sent' => $result['sent'],
            'failed' => $result['failed'],
        ]);
    }

    /**
     * POST /api/push-notifications/process-scheduled — process due scheduled notifications.
     * Can be called by admin or by a cron job.
     */
    public function actionProcessScheduled(): \yii\web\Response
    {
        $this->requireAdmin();

        $now = $this->now();
        $rows = Yii::$app->db->createCommand(
            "SELECT * FROM push_notifications WHERE status = 'scheduled' AND scheduled_for IS NOT NULL AND scheduled_for <= :now",
            [':now' => $now]
        )->queryAll();

        $processed = 0;
        foreach ($rows as $row) {
            $result = $this->sendPush($row);
            Yii::$app->db->createCommand()->update('push_notifications', [
                'status' => $result['status'],
                'sent_count' => $result['sent'],
                'failed_count' => $result['failed'],
                'error' => $result['error'] ?: null,
                'sent_at' => $now,
            ], ['id' => $row['id']])->execute();
            $processed++;
        }

        return $this->json(['ok' => true, 'processed' => $processed]);
    }

    /**
     * Send a push notification via FCM v1 + Web Push (VAPID).
     * Tries both services to cover Android (FCM) and Web (VAPID) subscribers.
     *
     * 2026-08-08: Updated to send via both FCM and WebPush.
     *
     * @return array{status: string, sent: int, failed: int, error: string}
     */
    private function sendPush(array $notif): array
    {
        $target = (string) ($notif['target'] ?? 'all');
        $totalSent = 0;
        $totalFailed = 0;
        $errors = [];

        // ── 1. FCM v1 (Android + web-push-via-FCM tokens) ─────────────
        try {
            $fcmTokens = FcmService::resolveTargets($target);
            if ($fcmTokens !== []) {
                $fcmResult = FcmService::send($notif, $fcmTokens);
                $totalSent += $fcmResult['sent'];
                $totalFailed += $fcmResult['failed'];
                if (!empty($fcmResult['errors'])) {
                    $errors[] = 'FCM: ' . $fcmResult['errors'];
                }
            }
        } catch (\Throwable $e) {
            $errors[] = 'FCM: ' . $e->getMessage();
        }

        // ── 2. Web Push (VAPID — native browser push, no Firebase) ────
        try {
            $webSubscriptions = self::resolveWebPushTargets($target);
            if ($webSubscriptions !== []) {
                $webResult = WebPushService::send($notif, $webSubscriptions);
                $totalSent += $webResult['sent'];
                $totalFailed += $webResult['failed'];
                if (!empty($webResult['errors'])) {
                    $errors[] = 'WebPush: ' . $webResult['errors'];
                }
            }
        } catch (\Throwable $e) {
            $errors[] = 'WebPush: ' . $e->getMessage();
        }

        $total = $totalSent + $totalFailed;
        $status = 'sent';
        if ($total === 0) {
            $status = 'failed';
        } elseif ($totalFailed === $total) {
            $status = 'failed';
        }

        return [
            'status' => $status,
            'sent' => $totalSent,
            'failed' => $totalFailed,
            'error' => implode('; ', $errors),
        ];
    }

    /**
     * Resolve web push subscriptions by target.
     *
     * @return array{endpoint: string, p256dh: string, auth: string}[]
     */
    private static function resolveWebPushTargets(string $target): array
    {
        $db = Yii::$app->db;
        $base = 'SELECT endpoint, p256dh, auth FROM web_push_subscriptions';

        if ($target === 'all') {
            return $db->createCommand($base . ' ORDER BY created_at DESC LIMIT 1000')->queryAll();
        }

        if (preg_match('/^user:(.+)$/', $target, $m)) {
            $userId = $m[1];
            return $db->createCommand(
                $base . ' WHERE user_id = :uid LIMIT 50',
                [':uid' => $userId]
            )->queryAll();
        }

        if (preg_match('/^course:(.+)$/', $target, $m)) {
            $courseId = $m[1];
            return $db->createCommand(
                $base . ' WHERE user_id IN (
                    SELECT user_id FROM enrollments
                    WHERE course_id = :cid
                      AND payment_status IN ("success", "paid", "completed", "free")
                ) LIMIT 1000',
                [':cid' => $courseId]
            )->queryAll();
        }

        return [];
    }
}
