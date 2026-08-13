<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use Yii;

/**
 * Unit tests for HealthController — GET /api/health.
 */
final class HealthControllerTest extends ApiControllerTestCase
{
    public function testHealthReturnsOkStatus(): void
    {
        $controller = new \app\modules\api\controllers\HealthController('health', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('ok', $data['status']);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T/', $data['timestamp']);
        $this->assertMatchesRegularExpression('/\.\d{6}\+00:00$/', $data['timestamp']);
    }

    public function testHealthReturnsVersion(): void
    {
        $controller = new \app\modules\api\controllers\HealthController('health', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsString($data['version']);
        $this->assertNotEmpty($data['version']);
    }

    public function testHealthTimestampIsValidIsoformat(): void
    {
        $controller = new \app\modules\api\controllers\HealthController('health', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+00:00$/',
            $data['timestamp']
        );
    }
}
