<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for SubscriptionsController — plan listing, subscription management.
 */
final class SubscriptionsControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsPlans(): void
    {
        $now = Time::now();
        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => Uuid::v4(),
            'name' => 'Monthly',
            'description' => 'Monthly plan',
            'price' => 299,
            'is_active' => 1,
            'duration_days' => 30,
            'created_at' => $now,
        ])->execute();

        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => Uuid::v4(),
            'name' => 'Yearly',
            'description' => 'Yearly plan',
            'price' => 2999,
            'is_active' => 1,
            'duration_days' => 365,
            'created_at' => $now,
        ])->execute();

        $controller = new SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
        $this->assertSame('Monthly', $data[0]['name']);
    }

    public function testIndexOnlyReturnsActivePlans(): void
    {
        $now = Time::now();
        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => Uuid::v4(),
            'name' => 'Active Plan',
            'price' => 100,
            'is_active' => 1,
            'duration_days' => 30,
            'created_at' => $now,
        ])->execute();

        Yii::$app->db->createCommand()->insert('subscription_plans', [
            'id' => Uuid::v4(),
            'name' => 'Inactive Plan',
            'price' => 50,
            'is_active' => 0,
            'duration_days' => 30,
            'created_at' => $now,
        ])->execute();

        $controller = new SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Active Plan', $data[0]['name']);
    }

    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new SubscriptionPlansController('subscription-plans', Yii::$app, []);

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

        $controller = new SubscriptionPlansController('subscription-plans', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'name' => 'Test Plan',
            'price' => 500,
            'is_active' => true,
            'duration_days' => 30,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('Test Plan', $data['name']);
        $this->assertSame(500.0, $data['price']);
        $this->assertTrue($data['is_active']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new SubscriptionPlansController('subscription-plans', Yii::$app, []);

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
            'name' => 'To Delete',
            'price' => 100,
            'is_active' => 1,
            'duration_days' => 30,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new SubscriptionPlansController('subscription-plans', Yii::$app, []);
        $result = $controller->actionDelete($planId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM subscription_plans WHERE id = :id', [':id' => $planId]
        )->queryOne();
        $this->assertFalse($row);
    }

    // Subscription management tests
    public function testSubscriptionsIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testSubscriptionsReturnsEmpty(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testSubscriptionsReturnsSubscriptions(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        Yii::$app->db->createCommand()->insert('subscriptions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'plan_id' => Uuid::v4(),
            'status' => 'active',
            'starts_at' => Time::now(),
            'ends_at' => Time::addDays(Time::now(), 30),
            'payment_id' => 'sub_123',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('active', $data[0]['status']);
    }

    public function testMySubscriptionForUser(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('subscriptions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'plan_id' => Uuid::v4(),
            'status' => 'active',
            'starts_at' => Time::now(),
            'ends_at' => Time::addDays(Time::now(), 30),
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);
        $result = $controller->actionMy();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertCount(1, $data);
        $this->assertSame('active', $data[0]['status']);
    }

    public function testMySubscriptionReturnsEmptyWhenNone(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);
        $result = $controller->actionMy();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }
}
