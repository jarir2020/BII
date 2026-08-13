<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for ConfigsController — site configuration management.
 */
final class ConfigsControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsConfig(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ConfigsController('configs', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
    }

    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ConfigsController('configs', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdateStoresConfig(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ConfigsController('configs', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'site_name' => 'New Site Name',
            'site_description' => 'Updated description',
        ];

        $result = $controller->actionUpdate();
        $data = $result->data;

        $this->assertTrue($data['ok']);
    }

    public function testUpdateRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ConfigsController('configs', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['site_name' => 'Hacked'];

        try {
            $controller->actionUpdate();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGetConfigValue(): void
    {
        $controller = new \app\modules\api\controllers\ConfigsController('configs', Yii::$app, []);
        Yii::$app->request->setQueryParams(['key' => 'site_name']);
        $result = $controller->actionGetConfig();
        $data = $result->data;

        $this->assertArrayHasKey('value', $data);
    }

    public function testGetMissingConfigReturnsDefault(): void
    {
        $controller = new \app\modules\api\controllers\ConfigsController('configs', Yii::$app, []);
        Yii::$app->request->setQueryParams(['key' => 'nonexistent_config_key']);
        $result = $controller->actionGetConfig();
        $data = $result->data;

        $this->assertArrayHasKey('value', $data);
        $this->assertSame('', $data['value']);
    }
}
