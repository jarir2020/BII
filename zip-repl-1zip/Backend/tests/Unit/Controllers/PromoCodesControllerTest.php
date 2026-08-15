<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for PromoCodesController — promo code CRUD + validation.
 */
final class PromoCodesControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testIndexReturnsEmpty(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsPromoCodes(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('promo_codes', [
            'id' => Uuid::v4(),
            'code' => 'SAVE10',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'max_uses' => 100,
            'used_count' => 5,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('SAVE10', $data[0]['code']);
        $this->assertSame('percentage', $data[0]['discount_type']);
        $this->assertSame(10.0, $data[0]['discount_value']);
    }

    public function testPostCreatesPromoCodeRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['code' => 'TEST20'];

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesPromoCode(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'code' => 'SAVE20',
            'discount_type' => 'fixed',
            'discount_value' => 200,
            'max_uses' => 50,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('SAVE20', $data['code']);
        $this->assertSame('fixed', $data['discount_type']);
        $this->assertSame(200.0, $data['discount_value']);
    }

    public function testPostGeneratesCodeWhenEmpty(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'discount_type' => 'percentage',
            'discount_value' => 15,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertNotEmpty($data['code']);
        $this->assertSame('percentage', $data['discount_type']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);

        try {
            $controller->actionDelete('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesPromoCode(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $promoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('promo_codes', [
            'id' => $promoId,
            'code' => 'DELETE-ME',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        $result = $controller->actionDelete($promoId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM promo_codes WHERE id = :id', [':id' => $promoId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testValidateCodeNotFound(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['code' => 'NONEXIST']);

        try {
            $controller->actionValidate();
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testValidateInactiveCode(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('promo_codes', [
            'id' => Uuid::v4(),
            'code' => 'INACTIVE',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'is_active' => 0,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['code' => 'INACTIVE']);

        $result = $controller->actionValidate();
        $data = $result->data;

        $this->assertFalse($data['valid']);
    }

    public function testValidateMaxUsesReached(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('promo_codes', [
            'id' => Uuid::v4(),
            'code' => 'MAXED',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'max_uses' => 1,
            'used_count' => 1,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['code' => 'MAXED']);

        $result = $controller->actionValidate();
        $data = $result->data;

        $this->assertFalse($data['valid']);
    }

    public function testValidateActiveCode(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('promo_codes', [
            'id' => Uuid::v4(),
            'code' => 'VALID10',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'max_uses' => 100,
            'used_count' => 5,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['code' => 'VALID10']);
        $result = $controller->actionValidate();
        $data = $result->data;

        $this->assertTrue($data['valid']);
        $this->assertSame('VALID10', $data['code']);
        $this->assertSame('percentage', $data['discount_type']);
        $this->assertSame(10.0, $data['discount_value']);
        $this->assertSame(5, (int) $data['used_count']);
    }

    public function testValidateFixedDiscount(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('promo_codes', [
            'id' => Uuid::v4(),
            'code' => 'FIXED200',
            'discount_type' => 'fixed',
            'discount_value' => 200,
            'max_uses' => 10,
            'used_count' => 0,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PromoCodesController('promo-codes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['code' => 'FIXED200']);
        $result = $controller->actionValidate();
        $data = $result->data;

        $this->assertTrue($data['valid']);
        $this->assertSame('fixed', $data['discount_type']);
        $this->assertSame(200.0, $data['discount_value']);
    }
}
