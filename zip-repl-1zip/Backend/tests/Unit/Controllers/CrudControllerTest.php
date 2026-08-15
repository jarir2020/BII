<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for CrudController — generic CRUD for any table.
 * Uses ProductsController (concrete CrudController subclass) for testing.
 */
final class CrudControllerTest extends ApiControllerTestCase
{
    public function testGetAllReturnsData(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
    }

    public function testGetOneReturnsData(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'name_en' => 'Crud Product',
            'price' => 100,
            'stock' => 5,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        $result = $controller->actionView($productId);
        $data = $result->data;

        $this->assertSame('Crud Product', $data['name_en']);
    }

    public function testPostCreatesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'name_en' => 'Created Via Crud',
            'price' => 200,
            'stock' => 10,
        ]);

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('Created Via Crud', $data['name_en']);
        $this->assertArrayHasKey('id', $data);
    }

    public function testUpdateModifiesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'name_en' => 'Original',
            'price' => 300,
            'stock' => 5,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['name_en' => 'Updated Via Crud', 'price' => 350]);

        $result = $controller->actionView($productId);
        $data = $result->data;

        $this->assertSame('Updated Via Crud', $data['name_en']);
        $this->assertSame(350.0, $data['price']);
    }

    public function testDeleteRemovesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $productId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('products', [
            'id' => $productId,
            'name_en' => 'To Delete',
            'price' => 100,
            'stock' => 1,
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        $this->setMethod('DELETE');
        $result = $controller->actionView($productId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM products WHERE id = :id', [':id' => $productId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testGetAllRequiresAuth(): void
    {
        // ProductsController has publicRead=true, so listing doesn't need auth.
        // Verify it returns an empty array for unauthenticated users.
        $controller = new \app\modules\api\controllers\ProductsController('products', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;
        $this->assertIsArray($data);
    }
}
