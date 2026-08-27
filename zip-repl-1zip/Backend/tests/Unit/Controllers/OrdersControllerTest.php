<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

final class OrdersControllerTest extends ApiControllerTestCase
{
    public function testAdminCanListOrderWithItems(): void
    {
        $adminId = $this->createAdminUser('orders-admin@example.com');
        $this->authenticateAs($adminId, 'admin');
        $orderId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('orders', [
            'id' => $orderId,
            'order_number' => 'ORD-100001',
            'user_id' => $adminId,
            'customer_name' => 'Customer',
            'customer_phone' => '01700000000',
            'total' => 250,
            'status' => 'pending',
            'created_at' => Time::now(),
        ])->execute();
        Yii::$app->db->createCommand()->insert('order_items', [
            'id' => Uuid::v4(),
            'order_id' => $orderId,
            'product_id' => Uuid::v4(),
            'product_name' => 'Test Book',
            'qty' => 2,
            'unit_price' => 125,
            'subtotal' => 250,
        ])->execute();

        $controller = new \app\modules\api\controllers\OrdersController('orders', Yii::$app, []);
        $data = $controller->actionIndex()->data;

        $this->assertCount(1, $data);
        $this->assertSame('orders-admin@example.com', $data[0]['user_email']);
        $this->assertSame('Test Book', $data[0]['products'][0]['product_name']);
        $this->assertSame(2, $data[0]['products'][0]['qty']);
    }

    public function testAdminCanUpdateStatusAndDeleteOrderItemsTogether(): void
    {
        $adminId = $this->createAdminUser('orders-admin@example.com');
        $this->authenticateAs($adminId, 'admin');
        $orderId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('orders', [
            'id' => $orderId,
            'order_number' => 'ORD-100002',
            'user_id' => $adminId,
            'status' => 'pending',
            'created_at' => Time::now(),
        ])->execute();
        Yii::$app->db->createCommand()->insert('order_items', [
            'id' => Uuid::v4(),
            'order_id' => $orderId,
            'product_id' => Uuid::v4(),
            'product_name' => 'Delete With Order',
        ])->execute();

        $controller = new \app\modules\api\controllers\OrdersController('orders', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['status' => 'shipped']);
        $this->assertSame('shipped', $controller->actionView($orderId)->data['status']);

        $this->setMethod('DELETE');
        $this->assertTrue($controller->actionView($orderId)->data['ok']);
        $this->assertFalse(Yii::$app->db->createCommand(
            'SELECT id FROM orders WHERE id = :id', [':id' => $orderId]
        )->queryOne());
        $this->assertFalse(Yii::$app->db->createCommand(
            'SELECT id FROM order_items WHERE order_id = :id', [':id' => $orderId]
        )->queryOne());
    }
}
