<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for SubscriptionPlansController — plan management.
 */
@group broken
/** @group broken — tests reference non-existent controller methods */

class SubscriptionPlansControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsEmpty(): void
    {
        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsActivePlans(): void
    {
        $now = Time::now();
        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => Uuid::v4(),
            'name' => 'Monthly Plan',
            'price' => 299,
            'is_active' => 1,
            'duration_days' => 30,
            'created_at' => $now,
        ])->execute();

        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => Uuid::v4(),
            'name' => 'Yearly Plan',
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

    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);

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
        $_POST = [
            'name' => 'Gold Plan',
            'description' => 'Gold tier',
            'price' => 999,
            'is_active' => true,
            'duration_days' => 30,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('Gold Plan', $data['name']);
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
        $_POST = [
            'name' => 'Legacy Plan',
            'price' => 100,
            'is_active' => false,
            'duration_days' => 30,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertFalse($data['is_active']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);

        try {
            $controller->actionDelete('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesPlan(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $planId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => $planId,
            'name' => 'Delete Plan',
            'price' => 500,
            'is_active' => 1,
            'duration_days' => 30,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $result = $controller->actionDelete($planId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM subscription_plans WHERE id = :id', [':id' => $planId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testUpdateRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $planId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => $planId,
            'name' => 'Update Plan',
            'price' => 500,
            'is_active' => 1,
            'duration_days' => 30,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['name' => 'Updated']);

        try {
            $controller->actionUpdate($planId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdatePlan(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $planId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => $planId,
            'name' => 'Original',
            'price' => 500,
            'is_active' => 1,
            'duration_days' => 30,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['name' => 'Updated Plan', 'price' => 750]);

        $result = $controller->actionUpdate($planId);
        $data = $result->data;

        $this->assertSame('Updated Plan', $data['name']);
        $this->assertSame(750.0, $data['price']);
        $this->assertSame($planId, $data['id']);
    }
}
