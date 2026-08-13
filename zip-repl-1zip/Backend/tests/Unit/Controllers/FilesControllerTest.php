<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for FilesController — file operations.
 */
final class FilesControllerTest extends ApiControllerTestCase
{
    public function testPostImageRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\FilesController('files', Yii::$app, []);
        Yii::$app->request->isPost = true;
        Yii::$app->request->setHeaders(['Content-Type' => 'multipart/form-data']);
        $_FILES = [
            'file' => [
                'name' => 'test.jpg',
                'type' => 'image/jpeg',
                'tmp_name' => __FILE__,
                'error' => 0,
                'size' => 100,
            ],
        ];

        try {
            $controller->actionPostImage();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostImageAdminCanUpload(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\FilesController('files', Yii::$app, []);
        Yii::$app->request->isPost = true;
        Yii::$app->request->setHeaders(['Content-Type' => 'multipart/form-data']);
        $_FILES = [
            'file' => [
                'name' => 'test.jpg',
                'type' => 'image/jpeg',
                'tmp_name' => __FILE__,
                'error' => 0,
                'size' => 100,
            ],
        ];

        $result = $controller->actionPostImage();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertArrayHasKey('url', $data);
    }

    public function testDownloadRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\FilesController('files', Yii::$app, []);

        try {
            $controller->actionDownload('some-file');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDownloadStudentCanAccessFreeContent(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Create a free library doc
        $docId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('library_docs', [
            'id' => $docId,
            'title_bn' => 'ফ্রি ডকুমেন্ট',
            'title_en' => 'Free Document',
            'file_path' => __FILE__,
            'is_free' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\FilesController('files', Yii::$app, []);
        Yii::$app->request->setQueryParams(['id' => $docId]);
        $result = $controller->actionDownload($docId);

        // Should return a response (file download or 404 if file not found)
        $this->assertTrue($result instanceof \yii\web\Response || $result === null);
    }

    public function testLibraryDocsRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\FilesController('files', Yii::$app, []);

        try {
            $controller->actionLibraryDocs();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testLibraryDocsReturnsEmpty(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\FilesController('files', Yii::$app, []);
        $result = $controller->actionLibraryDocs();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testLibraryDocsReturnsEnrolledContent(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $courseId = $this->createTestCourse();
        $docId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('library_docs', [
            'id' => $docId,
            'title_en' => 'Course Document',
            'file_path' => __FILE__,
            'course_id' => $courseId,
            'created_at' => Time::now(),
        ])->execute();

        // Enroll user
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
        ])->execute();

        $controller = new \app\modules\api\controllers\FilesController('files', Yii::$app, []);
        $result = $controller->actionLibraryDocs();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Course Document', $data[0]['title_en']);
    }
}
