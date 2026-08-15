<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for SubscriptionPlansController — plan management.
 */
class SubscriptionPlansControllerTest extends ApiControllerTestCase
{
    public function testGetListReturnsEmpty(): void
    {
        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testGetListReturnsActivePlans(): void
    {
        $now = Time::now();
        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => Uuid::v4(),
            'name_bn' => 'মাসিক প্ল্যান',
            'name_en' => 'Monthly Plan',
            'price' => 299,
            'is_active' => 1,
            'duration_days' => 30,
            'created_at' => $now,
        ])->execute();

        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => Uuid::v4(),
            'name_bn' => 'বার্ষিক প্ল্যান',
            'name_en' => 'Yearly Plan',
            'price' => 2999,
            'is_active' => 1,
            'duration_days' => 365,
            'created_at' => $now,
        ])->execute();

        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
    }

    public function testGetListIsPublic(): void
    {
        // GET /subscription-plans is public — no auth required
        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
    }

    public function testPostRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'name_en' => 'Gold Plan',
            'price' => 999,
        ]);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesPlan(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'name_bn' => 'গোল্ড প্ল্যান',
            'name_en' => 'Gold Plan',
            'description_en' => 'Gold tier',
            'price' => 999,
            'is_active' => true,
            'duration_days' => 30,
        ]);

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('Gold Plan', $data['name_en']);
        $this->assertSame(999.0, $data['price']);
        $this->assertTrue($data['is_active']);
        $this->assertSame(30, (int) $data['duration_days']);
    }

    public function testPostCreatesInactivePlan(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'name_en' => 'Legacy Plan',
            'price' => 100,
            'is_active' => false,
            'duration_days' => 30,
        ]);

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertFalse($data['is_active']);
    }
}
