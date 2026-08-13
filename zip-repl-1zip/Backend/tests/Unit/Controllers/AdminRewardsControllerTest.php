<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for AdminRewardsController — admin reward management.
 */
final class AdminRewardsControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\AdminRewardsController('admin-rewards', Yii::$app, []);

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

        $controller = new \app\modules\api\controllers\AdminRewardsController('admin-rewards', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsTransactions(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        Yii::$app->db->createCommand()->insert('reward_transactions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'type' => 'earned',
            'amount' => 100,
            'description' => 'Course bonus',
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('reward_transactions', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'type' => 'redeemed',
            'amount' => -50,
            'description' => 'Coupon used',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\AdminRewardsController('admin-rewards', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
        $this->assertSame('earned', $data[0]['type']);
        $this->assertSame(100, (int) $data[0]['amount']);
    }

    public function testAdjustRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\AdminRewardsController('admin-rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['user_id' => 'some-id', 'amount' => 50];

        try {
            $controller->actionAdjust();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testAdjustAddsPoints(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();

        $controller = new \app\modules\api\controllers\AdminRewardsController('admin-rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'user_id' => $userId,
            'amount' => 75,
            'description' => 'Admin bonus',
        ];

        $result = $controller->actionAdjust();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $user = Yii::$app->db->createCommand(
            'SELECT reward_points FROM users WHERE id = :id', [':id' => $userId]
        )->queryOne();
        $this->assertSame(75, (int) $user['reward_points']);
    }

    public function testAdjustRemovesPoints(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        // Set initial balance
        Yii::$app->db->createCommand()->update('users', ['reward_points' => 200], 'id = :id', [':id' => $userId])->execute();

        $controller = new \app\modules\api\controllers\AdminRewardsController('admin-rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'user_id' => $userId,
            'amount' => -50,
            'description' => 'Penalty',
        ];

        $result = $controller->actionAdjust();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $user = Yii::$app->db->createCommand(
            'SELECT reward_points FROM users WHERE id = :id', [':id' => $userId]
        )->queryOne();
        $this->assertSame(150, (int) $user['reward_points']);
    }

    public function testAdjustRejectsNegativeBalance(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        Yii::$app->db->createCommand()->update('users', ['reward_points' => 10], 'id = :id', [':id' => $userId])->execute();

        $controller = new \app\modules\api\controllers\AdminRewardsController('admin-rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'user_id' => $userId,
            'amount' => -50,
            'description' => 'Too much',
        ];

        try {
            $controller->actionAdjust();
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }

    public function testAdjustMissingUser(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AdminRewardsController('admin-rewards', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'user_id' => 'non-existent-user',
            'amount' => 50,
        ];

        try {
            $controller->actionAdjust();
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }
}
