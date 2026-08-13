<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for GenericController — reusable API CRUD operations.
 */
final class GenericControllerTest extends ApiControllerTestCase
{
    public function testGetAllRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);

        try {
            $controller->actionGetAll('videos');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGetAllForVideos(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('videos', [
            'id' => Uuid::v4(),
            'title_en' => 'Generic Video',
            'video_url' => 'https://example.com/gen.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        $result = $controller->actionGetAll('videos');
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertCount(1, $data);
        $this->assertSame('Generic Video', $data[0]['title_en']);
    }

    public function testGetOneRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);

        try {
            $controller->actionGetOne('videos', Uuid::v4());
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGetOneReturnsRecord(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'Single Video',
            'video_url' => 'https://example.com/single.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        $result = $controller->actionGetOne('videos', $videoId);
        $data = $result->data;

        $this->assertSame('Single Video', $data['title_en']);
        $this->assertSame($videoId, $data['id']);
    }

    public function testGetOneReturns404(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);

        try {
            $controller->actionGetOne('videos', 'non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);

        try {
            $controller->actionDelete('videos', Uuid::v4());
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'Delete Me',
            'video_url' => 'https://example.com/del.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        $result = $controller->actionDelete('videos', $videoId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM videos WHERE id = :id', [':id' => $videoId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testPostRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['title_en' => 'New'];

        try {
            $controller->actionPost('videos');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['title_en' => 'New Generic Video', 'video_url' => 'https://example.com/new.mp4'];

        $result = $controller->actionPost('videos');
        $data = $result->data;

        $this->assertSame('New Generic Video', $data['title_en']);
        $this->assertArrayHasKey('id', $data);
    }

    public function testUpdateRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        Yii::$app->request->isPut = true;
        $_POST = ['title_en' => 'Updated'];

        try {
            $controller->actionUpdate('videos', Uuid::v4());
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdateModifiesRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'Original Title',
            'video_url' => 'https://example.com/orig.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\GenericController('generic', Yii::$app, []);
        Yii::$app->request->isPut = true;
        $_POST = ['title_en' => 'Updated Title'];

        $result = $controller->actionUpdate('videos', $videoId);
        $data = $result->data;

        $this->assertSame('Updated Title', $data['title_en']);
        $this->assertSame($videoId, $data['id']);
    }
}
