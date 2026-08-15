<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for ProductController (singular) — ensures the singular alias
 * works identically to ProductsController.
 *
 * The controller extends ProductsController (CrudController), so all
 * operations go through actionIndex() and actionView() dispatched by HTTP method.
 */
final class ProductControllerTest extends ApiControllerTestCase
{
    /** Set the simulated HTTP method for the current test request. */
    private function setMethod(string $method): void
    {
        $_SERVER['REQUEST_METHOD'] = $method;
    }

    /** Set body params for PUT/DELETE requests (where $_POST is not read). */
    private function setBody(array $params): void
    {
        Yii::$app->request->bodyParams = $params;
    }

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
            'name_bn' => 'পণ্য ১',
            'name_en' => 'Product 1',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Product 1', $data[0]['name_en']);
    }

    public function testPostCreatesProductRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody(['name_en' => 'New Product']);

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
        $this->setMethod('POST');
        $this->setBody([
            'name_bn' => 'নতুন পণ্য',
            'name_en' => 'New Product',
            'price' => 750,
            'stock' => 25,
            'is_active' => true,
        ]);

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('নতুন পণ্য', $data['name_bn']);
        $this->assertSame('New Product', $data['name_en']);
        $this->assertSame(750.0, $data['price']);
        $this->assertSame(25, (int) $data['stock']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'name_en' => 'Delete Product',
            'price' => 300,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $this->setMethod('DELETE');

        try {
            $controller->actionView($productId);
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
            'name_en' => 'Delete Product',
            'price' => 300,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $this->setMethod('DELETE');
        $result = $controller->actionView($productId);
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
            'name_en' => 'Original',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['name_en' => 'Updated']);

        try {
            $controller->actionView($productId);
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
            'name_en' => 'Original',
            'price' => 500,
            'stock' => 10,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['name_en' => 'Updated Product', 'price' => 600]);

        $result = $controller->actionView($productId);
        $data = $result->data;

        $this->assertSame('Updated Product', $data['name_en']);
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
            'name_en' => 'View Product',
            'price' => 1000,
            'stock' => 5,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductController('products', Yii::$app, []);
        $result = $controller->actionView($productId);
        $data = $result->data;

        $this->assertSame('View Product', $data['name_en']);
        $this->assertSame(1000.0, $data['price']);
    }
}
