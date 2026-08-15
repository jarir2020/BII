<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for GenericController — reusable API CRUD operations.
 * Uses actionIndex (list/create) and actionItem (view/update/delete) methods.
 * GenericController stores data in the `generic_items` table with a `resource` column.
 */
final class GenericControllerTest extends ApiControllerTestCase
{
    /** Insert a generic item and return its ID. */
    private function insertGenericItem(string $resource, array $data, string $id = ''): string
    {
        $id = $id ?: Uuid::v4();
        Yii::$app->db->createCommand()->insert('generic_items', [
            'id' => $id,
            'resource' => $resource,
            'data' => json_encode($data, JSON_UNESCAPED_UNICODE),
            'created_at' => Time::now(),
            'updated_at' => null,
        ])->execute();
        return $id;
    }

    public function testGetAllRequiresAuthForPost(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody(['title_en' => 'New']);
        Yii::$app->request->setQueryParams(['resource' => 'blogs']);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGetAllForBlogs(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $this->insertGenericItem('blogs', ['title_en' => 'Generic Blog']);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        Yii::$app->request->setQueryParams(['resource' => 'blogs']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertCount(1, $data);
    }

    public function testGetOneRequiresAuthForDelete(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $itemId = $this->insertGenericItem('blogs', ['title_en' => 'To Delete']);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        $this->setMethod('DELETE');
        Yii::$app->request->setQueryParams(['resource' => 'blogs']);

        try {
            $controller->actionItem($itemId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGetOneReturnsRecord(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $itemId = $this->insertGenericItem('blogs', ['title_en' => 'Single Blog']);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        Yii::$app->request->setQueryParams(['resource' => 'blogs']);
        $result = $controller->actionItem($itemId);
        $data = $result->data;

        $this->assertSame('Single Blog', $data['title_en']);
        $this->assertSame($itemId, $data['id']);
    }

    public function testGetOneReturns404(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        Yii::$app->request->setQueryParams(['resource' => 'blogs']);

        try {
            $controller->actionItem('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testDeleteRemovesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $itemId = $this->insertGenericItem('blogs', ['title_en' => 'Delete Me']);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        $this->setMethod('DELETE');
        Yii::$app->request->setQueryParams(['resource' => 'blogs']);
        $result = $controller->actionItem($itemId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM generic_items WHERE id = :id', [':id' => $itemId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testPostCreatesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody(['title_en' => 'New Generic Blog', 'summary' => 'A test']);
        Yii::$app->request->setQueryParams(['resource' => 'blogs']);

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('New Generic Blog', $data['title_en']);
        $this->assertArrayHasKey('id', $data);
    }

    public function testUpdateRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $itemId = $this->insertGenericItem('blogs', ['title_en' => 'Original']);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['title_en' => 'Updated']);
        Yii::$app->request->setQueryParams(['resource' => 'blogs']);

        try {
            $controller->actionItem($itemId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdateModifiesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $itemId = $this->insertGenericItem('blogs', ['title_en' => 'Original Title']);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['title_en' => 'Updated Title']);
        Yii::$app->request->setQueryParams(['resource' => 'blogs']);

        $result = $controller->actionItem($itemId);
        $data = $result->data;

        $this->assertSame('Updated Title', $data['title_en']);
        $this->assertSame($itemId, $data['id']);
    }
}
