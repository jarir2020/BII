<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for SubscriptionsController — subscription management.
 */
class SubscriptionsControllerTest extends ApiControllerTestCase
{
    public function testMySubscriptionForUser(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $planId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('subscriptions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'plan_id' => $planId,
            'plan_name' => 'Monthly Plan',
            'amount' => 299.0,
            'transaction_id' => 'TXN-001',
            'gateway' => 'sslcommerz',
            'status' => 'active',
            'started_at' => Time::now(),
            'expires_at' => Time::addDays(Time::now(), 30),
        ])->execute();

        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);
        $result = $controller->actionMy();
        $data = $result->data;

        // actionMy returns an object (stdClass or row array), not an array of items
        $this->assertNotEmpty($data);
        $this->assertSame('active', $data['status']);
        $this->assertSame('Monthly Plan', $data['plan_name']);
    }

    public function testMySubscriptionReturnsEmptyWhenNone(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);
        $result = $controller->actionMy();
        $data = $result->data;

        // Returns stdClass when no subscription
        $this->assertIsObject($data);
    }

    public function testMySubscriptionRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);

        try {
            $controller->actionMy();
            $this->fail('Expected 401');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(401, $e->statusCode);
        }
    }

    public function testAdminSubscriptionsRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);

        try {
            $controller->actionAdmin();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testAdminSubscriptionsReturnsList(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        $planId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('subscriptions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'plan_id' => $planId,
            'plan_name' => 'Yearly Plan',
            'amount' => 2999.0,
            'transaction_id' => 'TXN-002',
            'gateway' => 'sslcommerz',
            'status' => 'active',
            'started_at' => Time::now(),
            'expires_at' => Time::addDays(Time::now(), 365),
        ])->execute();

        $controller = new \app\modules\api\controllers\SubscriptionsController('subscriptions', Yii::$app, []);
        $result = $controller->actionAdmin();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertCount(1, $data);
    }
}
