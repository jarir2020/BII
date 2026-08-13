<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use Yii;

/**
 * Unit tests for SettingsController — GET/PUT /api/settings.
 */
final class SettingsControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsDefaultsWhenNoConfig(): void
    {
        $controller = new \app\modules\api\controllers\SettingsController('settings', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('বಾঙালি ইসলামিক ইনস্টিটিউট', $data['name_bn']);
        $this->assertSame('Bengali Islamic Institute', $data['name_en']);
        $this->assertSame('Knowledge, Faith & Manners', $data['tagline_en']);
        $this->assertSame('01974911990', $data['bkash_number']);
    }

    public function testIndexReturnsStoredConfig(): void
    {
        // Store a config
        Yii::$app->db->createCommand()->insert('settings', [
            'id' => 'main',
            'data' => json_encode(['name_en' => 'My Custom Name', 'contact_phone' => '01700000000']),
            'updated_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\SettingsController('settings', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('My Custom Name', $data['name_en']);
        $this->assertSame('01700000000', $data['contact_phone']);
        // Defaults still present for unset fields
        $this->assertSame('Knowledge, Faith & Manners', $data['tagline_en']);
    }

    public function testPutUpdatesSettings(): void
    {
        Yii::$app->request->isPut = true;
        $_POST = [
            'name_bn' => 'নতুন নাম',
            'contact_email' => 'new@example.com',
        ];

        $controller = new \app\modules\api\controllers\SettingsController('settings', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('নতুন নাম', $data['name_bn']);
        $this->assertSame('new@example.com', $data['contact_email']);
        // ID should be 'main'
        $this->assertSame('main', $data['id']);
    }

    public function testPutMergesWithExisting(): void
    {
        // Pre-store some data
        Yii::$app->db->createCommand()->insert('settings', [
            'id' => 'main',
            'data' => json_encode(['name_en' => 'Existing Name', 'contact_phone' => '01900000000']),
            'updated_at' => Time::now(),
        ])->execute();

        Yii::$app->request->isPut = true;
        $_POST = ['contact_email' => 'updated@example.com'];

        $controller = new \app\modules\api\controllers\SettingsController('settings', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        // Updated field
        $this->assertSame('updated@example.com', $data['contact_email']);
        // Existing field preserved
        $this->assertSame('Existing Name', $data['name_en']);
        // Default field present
        $this->assertNotEmpty($data['tagline_bn']);
    }

    public function testPutMergesWithDefaults(): void
    {
        Yii::$app->request->isPut = true;
        $_POST = ['custom_field' => 'value'];

        $controller = new \app\modules\api\controllers\SettingsController('settings', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('value', $data['custom_field']);
        // Defaults still there
        $this->assertSame('01974911990', $data['bkash_number']);
    }
}
