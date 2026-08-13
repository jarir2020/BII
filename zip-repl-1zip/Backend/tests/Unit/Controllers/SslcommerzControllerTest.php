<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for SslcommerzController — payment gateway integration.
 */
final class SslcommerzControllerTest extends ApiControllerTestCase
{
    public function testInitPaymentRequiresPost(): void
    {
        $controller = new \app\modules\api\controllers\SslcommerzController('sslcommerz', Yii::$app, []);

        try {
            $controller->actionInitPayment();
            $this->fail('Expected error');
        } catch (\Exception $e) {
            // Expected — no POST data
        }
    }

    public function testInitPaymentWithOrder(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Create an order
        $orderId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('orders', [
            'id' => $orderId,
            'user_id' => $userId,
            'total_amount' => 1000,
            'currency' => 'BDT',
            'status' => 'pending',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\SslcommerzController('sslcommerz', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'order_id' => $orderId,
            'amount' => 1000,
            'currency' => 'BDT',
        ];

        // The initPayment action should return a redirect or JSON
        $result = $controller->actionInitPayment();
        // In test mode, it may return a redirect URL or JSON
        $this->assertTrue(
            $result instanceof \yii\web\Response
            || ($result instanceof \yii\web\JsonResponse && $result->data !== null)
        );
    }

    public function testValidateIpnRequiresPost(): void
    {
        $controller = new \app\modules\api\controllers\SslcommerzController('sslcommerz', Yii::$app, []);

        try {
            $controller->actionValidateIpN();
            $this->fail('Expected error');
        } catch (\Exception $e) {
            // Expected — no POST data
        }
    }

    public function testValidateIpNWithValidTransaction(): void
    {
        // Create a pending order
        $userId = $this->createTestUser();
        $orderId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('orders', [
            'id' => $orderId,
            'user_id' => $userId,
            'total_amount' => 1000,
            'currency' => 'BDT',
            'status' => 'pending',
            'transaction_id' => 'SSLTEST123',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\SslcommerzController('sslcommerz', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'val_id' => 'SSLTEST123',
            'amount' => 1000,
            'currency' => 'BDT',
            'status' => 'VALID',
        ];

        $result = $controller->actionValidateIpN();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame('success', $data['status']);

        // Verify order was updated
        $order = Yii::$app->db->createCommand(
            'SELECT status, payment_status FROM orders WHERE id = :id', [':id' => $orderId]
        )->queryOne();
        $this->assertSame('completed', $order['status']);
        $this->assertSame('paid', $order['payment_status']);
    }

    public function testValidateIpNInvalidStatus(): void
    {
        $orderId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('orders', [
            'id' => $orderId,
            'user_id' => 'user-1',
            'total_amount' => 500,
            'currency' => 'BDT',
            'status' => 'pending',
            'transaction_id' => 'SSLFAIL',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\SslcommerzController('sslcommerz', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'val_id' => 'SSLFAIL',
            'amount' => 500,
            'currency' => 'BDT',
            'status' => 'INVALID',
        ];

        $result = $controller->actionValidateIpN();
        $data = $result->data;

        $this->assertFalse($data['ok']);
        $this->assertSame('failed', $data['status']);
    }

    public function testGetPaymentStatusRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\SslcommerzController('sslcommerz', Yii::$app, []);

        try {
            $controller->actionGetPaymentStatus();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGetPaymentStatusReturnsOrder(): void
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

        $controller = new \app\modules\api\controllers\SslcommerzController('sslcommerz', Yii::$app, []);
        Yii::$app->request->setQueryParams(['order_id' => $orderId]);
        $result = $controller->actionGetPaymentStatus();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame('completed', $data['status']);
        $this->assertSame('paid', $data['payment_status']);
        $this->assertSame('TXN123', $data['transaction_id']);
    }

    public function testGetPaymentStatusNotFound(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\SslcommerzController('sslcommerz', Yii::$app, []);
        Yii::$app->request->setQueryParams(['order_id' => 'non-existent']);

        try {
            $controller->actionGetPaymentStatus();
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }
}
