<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for WebPushController — web push subscription management.
 */

class WebPushControllerTest extends ApiControllerTestCase
{
    public function testSubscribeRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\WebPushController('web-push', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['endpoint' => 'https://fcm.googleapis.com/fcm/send/xyz'];

        try {
            $controller->actionSubscribe();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testSubscribeStoresEndpoint(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\WebPushController('web-push', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
            'p256dh' => 'p256dh-key',
            'auth' => 'auth-token',
        ];

        $result = $controller->actionSubscribe();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM web_push_subscriptions WHERE endpoint = :e',
            [':e' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-123']
        )->queryOne();
        $this->assertNotFalse($row);
    }

    public function testSubscribeUpdatesExistingEndpoint(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Pre-store an endpoint
        Yii::$app->db->createCommand()->insert('web_push_subscriptions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/old-endpoint',
            'p256dh' => 'old-key',
            'auth' => 'old-auth',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\WebPushController('web-push', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/old-endpoint',
            'p256dh' => 'new-key',
            'auth' => 'new-auth',
        ];

        $result = $controller->actionSubscribe();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT p256dh, auth FROM web_push_subscriptions WHERE endpoint = :e',
            [':e' => 'https://fcm.googleapis.com/fcm/send/old-endpoint']
        )->queryOne();
        $this->assertSame('new-key', $row['p256dh']);
        $this->assertSame('new-auth', $row['auth']);
    }

    public function testUnsubscribeRemovesEndpoint(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Pre-store an endpoint
        $subId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('web_push_subscriptions', [
            'id' => $subId,
            'user_id' => $userId,
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/unsub-me',
            'p256dh' => 'key',
            'auth' => 'auth',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\WebPushController('web-push', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['endpoint' => 'https://fcm.googleapis.com/fcm/send/unsub-me'];

        $result = $controller->actionUnsubscribe();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM web_push_subscriptions WHERE endpoint = :e',
            [':e' => 'https://fcm.googleapis.com/fcm/send/unsub-me']
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testUnsubscribeMissingEndpoint(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\WebPushController('web-push', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['endpoint' => 'https://fcm.googleapis.com/fcm/send/nonexistent'];

        $result = $controller->actionUnsubscribe();
        $data = $result->data;

        $this->assertFalse($data['ok']);
    }

}
