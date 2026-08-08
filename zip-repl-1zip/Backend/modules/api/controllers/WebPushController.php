<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\components\WebPushService;
use app\helpers\Uuid;
use Yii;

/**
 * /api/web-push/* — Zero-Firebase web push subscription management.
 *
 * Uses the browser-native Web Push Protocol (VAPID).
 * No Firebase SDK required on the frontend for this path.
 *
 * 2026-08-08: Created for custom push without Firebase dependency.
 */
class WebPushController extends ApiController
{
    /** GET /api/web-push/vapid-key — public, returns the VAPID public key. */
    public function actionVapidKey(): \yii\web\Response
    {
        return $this->json([
            'public_key' => WebPushService::getPublicKey(),
        ]);
    }

    /** POST /api/web-push/subscribe — authenticated, stores browser subscription. */
    public function actionSubscribe(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();

        $endpoint = trim((string) ($body['endpoint'] ?? ''));
        $p256dh = trim((string) ($body['p256dh'] ?? ''));
        $auth = trim((string) ($body['auth'] ?? ''));

        if ($endpoint === '' || $p256dh === '' || $auth === '') {
            $this->badRequest('endpoint, p256dh, and auth are required');
        }

        $now = (new \DateTime('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.u\Z');

        // Upsert: update if endpoint already exists, insert otherwise
        $existing = Yii::$app->db->createCommand(
            'SELECT id FROM web_push_subscriptions WHERE endpoint = :ep',
            [':ep' => $endpoint]
        )->queryOne();

        if ($existing) {
            Yii::$app->db->createCommand()->update('web_push_subscriptions', [
                'user_id' => $user['id'],
                'p256dh' => $p256dh,
                'auth' => $auth,
                'user_agent' => Yii::$app->request->getUserAgent() ?? '',
                'updated_at' => $now,
            ], ['id' => $existing['id']])->execute();
        } else {
            Yii::$app->db->createCommand()->insert('web_push_subscriptions', [
                'id' => Uuid::v4(),
                'user_id' => $user['id'],
                'endpoint' => $endpoint,
                'p256dh' => $p256dh,
                'auth' => $auth,
                'user_agent' => Yii::$app->request->getUserAgent() ?? '',
                'created_at' => $now,
                'updated_at' => $now,
            ])->execute();
        }

        return $this->json(['ok' => true]);
    }

    /** POST /api/web-push/unsubscribe — authenticated, removes subscription. */
    public function actionUnsubscribe(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();
        $endpoint = trim((string) ($body['endpoint'] ?? ''));

        if ($endpoint !== '') {
            Yii::$app->db->createCommand()->delete('web_push_subscriptions', [
                'user_id' => $user['id'],
                'endpoint' => $endpoint,
            ])->execute();
        }

        return $this->json(['ok' => true]);
    }
}
