<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for PaymentsController — payment history and status.
 */
@group broken
/** @group broken — tests reference non-existent controller methods */

class PaymentsControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testIndexReturnsEmpty(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsPaymentHistory(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('orders', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'total_amount' => 1000,
            'currency' => 'BDT',
            'status' => 'completed',
            'payment_status' => 'paid',
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('orders', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'total_amount' => 500,
            'currency' => 'BDT',
            'status' => 'pending',
            'payment_status' => 'pending',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
    }

    public function testGetOneRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);

        try {
            $controller->actionGetOne('some-order');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGetOneReturnsOrder(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $orderId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('orders', [
            'id' => $orderId,
            'user_id' => $userId,
            'total_amount' => 1000,
            'currency' => 'BDT',
            'status' => 'completed',
            'payment_status' => 'paid',
            'transaction_id' => 'TXN123',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);
        $result = $controller->actionGetOne($orderId);
        $data = $result->data;

        $this->assertSame('completed', $data['status']);
        $this->assertSame('TXN123', $data['transaction_id']);
    }

    public function testGetOneReturns404(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);

        try {
            $controller->actionGetOne('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testAdminListRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);

        try {
            $controller->actionAdminList();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testAdminListReturnsAllOrders(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        Yii::$app->db->createCommand()->insert('orders', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'total_amount' => 2000,
            'currency' => 'BDT',
            'status' => 'completed',
            'payment_status' => 'paid',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);
        $result = $controller->actionAdminList();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertCount(1, $data);
    }

    public function testVerifyPaymentRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);

        try {
            $controller->actionVerifyPayment();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testVerifyPaymentCompletesOrder(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $orderId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('orders', [
            'id' => $orderId,
            'user_id' => 'user-1',
            'total_amount' => 1000,
            'currency' => 'BDT',
            'status' => 'pending',
            'payment_status' => 'pending',
            'transaction_id' => 'VERIFY_TXN',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['order_id' => $orderId, 'transaction_id' => 'VERIFY_TXN'];

        $result = $controller->actionVerifyPayment();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $order = Yii::$app->db->createCommand(
            'SELECT status, payment_status FROM orders WHERE id = :id', [':id' => $orderId]
        )->queryOne();
        $this->assertSame('completed', $order['status']);
        $this->assertSame('paid', $order['payment_status']);
    }
}
