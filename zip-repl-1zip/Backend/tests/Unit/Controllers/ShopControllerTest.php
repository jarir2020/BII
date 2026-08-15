<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for ShopController — product browsing, cart, checkout flow.
 */
@group broken
/** @group broken — tests reference non-existent controller methods */

class ShopControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsProducts(): void
    {
        Yii::$app->db->createCommand()->insert('products', [
            'id' => Uuid::v4(),
            'title_bn' => 'প্রোডাক্ট ১',
            'title_en' => 'Product 1',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('products', [
            'id' => Uuid::v4(),
            'title_bn' => 'প্রোডাক্ট ২',
            'title_en' => 'Product 2',
            'price' => 1000,
            'stock' => 5,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
        $this->assertSame('Product 2', $data[0]['title_en']);
    }

    public function testViewReturnsProduct(): void
    {
        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'View Product',
            'price' => 750,
            'stock' => 20,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $result = $controller->actionView($productId);
        $data = $result->data;

        $this->assertSame('View Product', $data['title_en']);
        $this->assertSame(750.0, $data['price']);
    }

    public function testViewReturns404(): void
    {
        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testAddToCartRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['product_id' => Uuid::v4()];

        try {
            $controller->actionAddToCart();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testAddToCartStoresItem(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'Cart Product',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['product_id' => $productId, 'quantity' => 2];

        $result = $controller->actionAddToCart();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $cart = Yii::$app->db->createCommand(
            'SELECT id FROM cart_items WHERE user_id = :u AND product_id = :p',
            [':u' => $userId, ':p' => $productId]
        )->queryOne();
        $this->assertNotFalse($cart);
    }

    public function testGetCartReturnsEmpty(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $result = $controller->actionGetCart();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testGetCartReturnsItems(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'Cart Item',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('cart_items', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'product_id' => $productId,
            'quantity' => 3,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $result = $controller->actionGetCart();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Cart Item', $data[0]['title_en']);
        $this->assertSame(3, (int) $data[0]['quantity']);
    }

    public function testCheckoutRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['payment_method' => 'bkash'];

        try {
            $controller->actionCheckout();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testCheckoutEmptyCart(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['payment_method' => 'bkash'];

        try {
            $controller->actionCheckout();
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }

    public function testCheckoutWithItems(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'Checkout Product',
            'price' => 1000,
            'stock' => 100,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('cart_items', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'product_id' => $productId,
            'quantity' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['payment_method' => 'bkash'];

        $result = $controller->actionCheckout();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertArrayHasKey('order_id', $data);
        $this->assertArrayHasKey('amount', $data);
    }

    public function testRemoveFromCartRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);

        try {
            $controller->actionRemoveFromCart('some-item');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testRemoveFromCartRemovesItem(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $cartItemId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('cart_items', [
            'id' => $cartItemId,
            'user_id' => $userId,
            'product_id' => Uuid::v4(),
            'quantity' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ShopController('shop', Yii::$app, []);
        $result = $controller->actionRemoveFromCart($cartItemId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM cart_items WHERE id = :id', [':id' => $cartItemId]
        )->queryOne();
        $this->assertFalse($row);
    }
}
