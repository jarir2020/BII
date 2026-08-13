<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for CrudController — generic CRUD for any table.
 */
final class CrudControllerTest extends ApiControllerTestCase
{
    public function testGetAllReturnsData(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\CrudController('crud', Yii::$app, []);
        Yii::$app->request->setQueryParams(['table' => 'videos']);
        $result = $controller->actionGetAll();
        $data = $result->data;

        $this->assertIsArray($data);
    }

    public function testGetOneReturnsData(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'Crud Video',
            'video_url' => 'https://example.com/crud.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\CrudController('crud', Yii::$app, []);
        Yii::$app->request->setQueryParams(['table' => 'videos', 'id' => $videoId]);
        $result = $controller->actionGetOne();
        $data = $result->data;

        $this->assertSame('Crud Video', $data['title_en']);
    }

    public function testPostCreatesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\CrudController('crud', Yii::$app, []);
        Yii::$app->request->isPost = true;
        Yii::$app->request->setQueryParams(['table' => 'videos']);
        $_POST = [
            'title_en' => 'Created Via Crud',
            'video_url' => 'https://example.com/crud-created.mp4',
        ];

        $result = $controller->actionCreate();
        $data = $result->data;

        $this->assertSame('Created Via Crud', $data['title_en']);
        $this->assertArrayHasKey('id', $data);
    }

    public function testUpdateModifiesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'Original',
            'video_url' => 'https://example.com/orig.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\CrudController('crud', Yii::$app, []);
        Yii::$app->request->isPut = true;
        Yii::$app->request->setQueryParams(['table' => 'videos', 'id' => $videoId]);
        $_POST = ['title_en' => 'Updated Via Crud'];

        $result = $controller->actionUpdate();
        $data = $result->data;

        $this->assertSame('Updated Via Crud', $data['title_en']);
    }

    public function testDeleteRemovesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'To Delete',
            'video_url' => 'https://example.com/del.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\CrudController('crud', Yii::$app, []);
        Yii::$app->request->isDelete = true;
        Yii::$app->request->setQueryParams(['table' => 'videos', 'id' => $videoId]);
        $result = $controller->actionDelete();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM videos WHERE id = :id', [':id' => $videoId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testGetAllRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\CrudController('crud', Yii::$app, []);
        Yii::$app->request->setQueryParams(['table' => 'videos']);

        try {
            $controller->actionGetAll();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }
}
