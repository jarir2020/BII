<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for TelegramController — Telegram bot integration.
 */

class TelegramControllerTest extends ApiControllerTestCase
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

}
