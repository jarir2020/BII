<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for VideosController — video management and content.
 */
final class VideosControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsEmpty(): void
    {
        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsVideos(): void
    {
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => Uuid::v4(),
            'title_bn' => 'ভিডিও ১',
            'title_en' => 'Video 1',
            'video_url' => 'https://example.com/vid1.mp4',
            'duration' => '600',
        ])->execute();

        Yii::$app->db->createCommand()->insert('videos', [
            'id' => Uuid::v4(),
            'title_bn' => 'ভিডিও ২',
            'title_en' => 'Video 2',
            'video_url' => 'https://example.com/vid2.mp4',
            'duration' => '300',
        ])->execute();

        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
        $titles = array_column($data, 'title_en');
        $this->assertContains('Video 1', $titles);
        $this->assertContains('Video 2', $titles);
    }

    public function testIndexAllowsPublicRead(): void
    {
        // publicRead = true in CrudController, so index should work without auth
        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;
        $this->assertIsArray($data);
    }

    public function testPostCreatesVideoRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST = ['title_en' => 'New Video'];

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesVideo(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST = [
            'title_bn' => 'নতুন ভিডিও',
            'title_en' => 'New Video',
            'video_url' => 'https://example.com/new.mp4',
            'duration' => '120',
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('নতুন ভিডিও', $data['title_bn']);
        $this->assertSame('New Video', $data['title_en']);
        $this->assertSame('https://example.com/new.mp4', $data['video_url']);
    }

    public function testViewReturns404ForMissing(): void
    {
        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testViewReturnsVideo(): void
    {
        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'View Video',
            'video_url' => 'https://example.com/view.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);
        $result = $controller->actionView($videoId);
        $data = $result->data;

        $this->assertSame('View Video', $data['title_en']);
        $this->assertSame($videoId, $data['id']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);

        try {
            $_SERVER['REQUEST_METHOD'] = 'DELETE';
            $controller->actionView('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesVideo(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'Delete Video',
            'video_url' => 'https://example.com/del.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);
        $_SERVER['REQUEST_METHOD'] = 'DELETE';
        $result = $controller->actionView($videoId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM videos WHERE id = :id', [':id' => $videoId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testViewReturnsVideoWithCourseId(): void
    {
        $courseId = $this->createTestCourse();
        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'Course Video',
            'video_url' => 'https://example.com/course.mp4',
            'course_id' => $courseId,
        ])->execute();

        $controller = new \app\modules\api\controllers\VideosController('videos', Yii::$app, []);
        $result = $controller->actionView($videoId);
        $data = $result->data;

        $this->assertSame('Course Video', $data['title_en']);
        $this->assertSame($courseId, $data['course_id']);
    }
}
