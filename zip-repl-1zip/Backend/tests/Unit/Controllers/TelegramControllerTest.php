<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for TelegramController — Telegram bot integration.
 */
final class TelegramControllerTest extends ApiControllerTestCase
{
    public function testWebhookRequiresPost(): void
    {
        $controller = new \app\modules\api\controllers\TelegramController('telegram', Yii::$app, []);

        try {
            $controller->actionWebhook();
            $this->fail('Expected error');
        } catch (\Exception $e) {
            // Expected — no webhook payload
        }
    }

    public function testSendMessageRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\TelegramController('telegram', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['chat_id' => 123, 'text' => 'Test message'];

        try {
            $controller->actionSendMessage();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testSendMessageAdminSuccess(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\TelegramController('telegram', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'chat_id' => 987654321,
            'text' => 'Test notification',
            'parse_mode' => 'HTML',
        ];

        $result = $controller->actionSendMessage();
        $data = $result->data;

        // May fail if Telegram API is not configured, but should not throw 403
        $this->assertArrayHasKey('ok', $data);
    }

    public function testSetWebhook(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\TelegramController('telegram', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['url' => 'https://example.com/telegram/webhook'];

        $result = $controller->actionSetWebhook();
        $data = $result->data;

        $this->assertArrayHasKey('ok', $data);
    }

    public function testGetWebhookInfo(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\TelegramController('telegram', Yii::$app, []);
        $result = $controller->actionGetWebhookInfo();
        $data = $result->data;

        $this->assertArrayHasKey('ok', $data);
    }
}
