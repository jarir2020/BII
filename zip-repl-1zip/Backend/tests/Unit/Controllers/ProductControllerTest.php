<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for ProductController — product management.
 */
final class ProductControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsEmpty(): void
    {
        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsProducts(): void
    {
        Yii::$app->db->createCommand()->insert('products', [
            'id' => Uuid::v4(),
            'title_bn' => 'পণ্য ১',
            'title_en' => 'Product 1',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Product 1', $data[0]['title_en']);
    }

    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesProductRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['title_en' => 'New Product'];

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

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => 'নতুন পণ্য',
            'title_en' => 'New Product',
            'price' => 750,
            'stock' => 25,
            'is_active' => true,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('নতুন পণ্য', $data['title_bn']);
        $this->assertSame('New Product', $data['title_en']);
        $this->assertSame(750.0, $data['price']);
        $this->assertSame(25, (int) $data['stock']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);

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
            'title_en' => 'Delete Product',
            'price' => 300,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $result = $controller->actionDelete($productId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM products WHERE id = :id', [':id' => $productId]
        )->queryOne();
        $this->assertFalse($row);
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

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        Yii::$app->request->isPut = true;
        $_POST = ['title_en' => 'Updated'];

        try {
            $controller->actionUpdate($productId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdateProduct(): void
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

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        Yii::$app->request->isPut = true;
        $_POST = ['title_en' => 'Updated Product', 'price' => 600];

        $result = $controller->actionUpdate($productId);
        $data = $result->data;

        $this->assertSame('Updated Product', $data['title_en']);
        $this->assertSame(600.0, $data['price']);
        $this->assertSame($productId, $data['id']);
    }

    public function testViewReturns404(): void
    {
        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testViewReturnsProduct(): void
    {
        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'title_en' => 'View Product',
            'price' => 1000,
            'stock' => 5,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $result = $controller->actionView($productId);
        $data = $result->data;

        $this->assertSame('View Product', $data['title_en']);
        $this->assertSame(1000.0, $data['price']);
    }
}
