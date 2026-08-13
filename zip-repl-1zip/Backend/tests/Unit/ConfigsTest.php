<?php

declare(strict_types=1);

namespace app\tests\Unit;

use Yii;

/**
 * Unit tests for ConfigsController API endpoints.
 * Uses SQLite test database - no live DB connections.
 */
final class ConfigsTest extends \PHPUnit\Framework\TestCase
{
    protected function setUp(): void
    {
        putenv('YII_ENV=test');
    }

    public function testAdsConfigReturnsSeparateWebAppPublishers(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Set up test config values
        $configs = [
            'adsense_publisher_web' => 'ca-pub-1234567890',
            'adsense_publisher_app' => 'ca-app-pub-09876543210',
            'ad_slots' => [
                'courses-bottom' => ['web' => true, 'app' => true],
                'my-courses-bottom' => ['web' => true, 'app' => true],
            ],
        ];
        Yii::$app->db->createCommand()->upsert('configs', [
            'key' => 'ads',
            'data' => \yii\helpers\Json::encode($configs),
            'updated_at' => Yii::$app->Time::now(),
        ], ['key' => 'ads'])->execute();

        // Test config value retrieval
        $controller = new \app\modules\api\controllers\ApiController('configs', Yii::$app, Yii::$app->mailer);
        $result = $controller->configValue('ads');
        self::assertIsArray($result);
        self::assertArrayHasKey('adsense_publisher_web', $result);
        self::assertArrayHasKey('adsense_publisher_app', $result);
        self::assertArrayHasKey('ad_slots', $result);
    }

    public function testWriteConfigUpdatesConfig(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        $controller = new \app\modules\api\controllers\ApiController('configs', Yii::$app, Yii::$app->mailer);

        // Test writing a config value
        $controller->writeConfig('test_key', ['web' => true, 'app' => false]);

        // Verify it was stored
        $result = $controller->configValue('test_key');
        self::assertIsArray($result);
        self::assertTrue($result['web'] ?? false);
        self::assertFalse($result['app'] ?? true);
    }

    public function testWriteConfigUpserts(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        $controller = new \app\modules\api\controllers\ApiController('configs', Yii::$app, Yii::$app->mailer);

        // First write
        $controller->writeConfig('upsert_test', ['initial' => 'value']);
        $result1 = $controller->configValue('upsert_test');
        self::assertIsArray($result1);
        self::assertArrayHasKey('initial', $result1);

        // Second write (should upsert)
        $controller->writeConfig('upsert_test', ['updated' => 'value']);
        $result2 = $controller->configValue('upsert_test');
        self::assertIsArray($result2);
        self::assertArrayHasKey('updated', $result2);
        // Should not have both old and new - upsert replaces
    }
}