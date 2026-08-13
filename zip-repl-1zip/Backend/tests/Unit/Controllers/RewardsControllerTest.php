<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for RewardsController — reward points, transactions, redemption.
 */
final class RewardsControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testIndexReturnsUserBalance(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Set reward balance
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $userId,
            'reward_points' => 150,
        ])->execute();

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(150, (int) $data['reward_points']);
        $this->assertArrayHasKey('transactions', $data);
        $this->assertIsArray($data['transactions']);
    }

    public function testIndexReturnsZeroBalanceWhenNone(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(0, (int) $data['reward_points']);
    }

    public function testListTransactionsRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);

        try {
            $controller->actionListTransactions();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testListTransactionsReturnsEmpty(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        $result = $controller->actionListTransactions();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testListTransactionsReturnsRecords(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('reward_transactions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'type' => 'earned',
            'amount' => 50,
            'description' => 'Course purchase reward',
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('reward_transactions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'type' => 'redeemed',
            'amount' => -20,
            'description' => 'Coupon redemption',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        $result = $controller->actionListTransactions();
        $data = $result->data;

        $this->assertCount(2, $data);
        $this->assertSame('earned', $data[0]['type']);
        $this->assertSame(50, (int) $data[0]['amount']);
        $this->assertSame('redeemed', $data[1]['type']);
        $this->assertSame(-20, (int) $data[1]['amount']);
    }

    public function testAdminListRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);

        try {
            $controller->actionAdminList();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testAdminListReturnsAllTransactions(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        Yii::$app->db->createCommand()->insert('reward_transactions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'type' => 'earned',
            'amount' => 100,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        $result = $controller->actionAdminList();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame($userId, $data[0]['user_id']);
    }

    public function testAdminAdjustRewardsRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['user_id' => 'some-id', 'amount' => 50];

        try {
            $controller->actionAdminAdjustRewards();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testAdminAdjustRewardsAddsPoints(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'user_id' => $userId,
            'amount' => 50,
            'description' => 'Admin bonus',
        ];

        $result = $controller->actionAdminAdjustRewards();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        // Verify balance updated
        $user = Yii::$app->db->createCommand(
            'SELECT reward_points FROM users WHERE id = :id', [':id' => $userId]
        )->queryOne();
        $this->assertSame(50, (int) $user['reward_points']);
    }

    public function testAdminAdjustRewardsRemovesPoints(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        // Set initial balance
        Yii::$app->db->createCommand()->update('users', ['reward_points' => 100], 'id = :id', [':id' => $userId])->execute();

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'user_id' => $userId,
            'amount' => -30,
            'description' => 'Penalty',
        ];

        $result = $controller->actionAdminAdjustRewards();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $user = Yii::$app->db->createCommand(
            'SELECT reward_points FROM users WHERE id = :id', [':id' => $userId]
        )->queryOne();
        $this->assertSame(70, (int) $user['reward_points']);
    }

    public function testAdminAdjustRewardsRejectsNegativeBalance(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        // Set initial balance to 10
        Yii::$app->db->createCommand()->update('users', ['reward_points' => 10], 'id = :id', [':id' => $userId])->execute();

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'user_id' => $userId,
            'amount' => -50,
            'description' => 'Too much deduction',
        ];

        try {
            $controller->actionAdminAdjustRewards();
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }

    public function testAdminAdjustRewardsNotFoundForInvalidUser(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\RewardsController('rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'user_id' => 'non-existent-user',
            'amount' => 50,
        ];

        try {
            $controller->actionAdminAdjustRewards();
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }
}
