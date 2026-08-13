<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for ProductController (plural) — product CRUD operations.
 * Note: Distinct from ShopController which handles cart/checkout flow.
 */
final class ProductsControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsEmpty(): void
    {
        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesProduct(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => 'নতুন পণ্য',
            'title_en' => 'New Product',
            'price' => 999,
            'stock' => 50,
            'description' => 'A test product',
            'category' => 'book',
            'is_active' => true,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('নতুন পণ্য', $data['title_bn']);
        $this->assertSame(999.0, $data['price']);
        $this->assertSame('book', $data['category']);
    }

    public function testViewReturnsProduct(): void
    {
        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'View Product',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        $result = $controller->actionView($productId);
        $data = $result->data;

        $this->assertSame('View Product', $data['title_en']);
        $this->assertSame($productId, $data['id']);
    }

    public function testViewReturns404(): void
    {
        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testUpdateRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'Original',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        Yii::$app->request->isPut = true;
        $_POST = ['title_en' => 'Updated'];

        try {
            $controller->actionUpdate($productId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdateModifiesProduct(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'Original',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        Yii::$app->request->isPut = true;
        $_POST = ['title_en' => 'Updated Product', 'price' => 750, 'stock' => 20];

        $result = $controller->actionUpdate($productId);
        $data = $result->data;

        $this->assertSame('Updated Product', $data['title_en']);
        $this->assertSame(750.0, $data['price']);
        $this->assertSame(20, (int) $data['stock']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);

        try {
            $controller->actionDelete('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesProduct(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'Delete Me',
            'price' => 300,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        $result = $controller->actionDelete($productId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM products WHERE id = :id', [':id' => $productId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testUpdateStock(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'Stock Update',
            'price' => 500,
            'stock' => 100,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['id' => $productId, 'stock_delta' => -30];

        $result = $controller->actionUpdateStock();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $product = Yii::$app->db->createCommand(
            'SELECT stock FROM products WHERE id = :id', [':id' => $productId]
        )->queryOne();
        $this->assertSame(70, (int) $product['stock']);
    }
}
