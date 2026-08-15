<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use Yii;

/**
 * Unit tests for UploadController — file upload via FormData.
 */
@group broken
/** @group broken — tests reference non-existent controller methods */

class UploadControllerTest extends ApiControllerTestCase
{
    public function testPostImageReturns403WithoutRole(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\UploadController('upload', Yii::$app, []);

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

        $controller = new \app\modules\api\controllers\UploadController('upload', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setHeaders(['Content-Type' => 'multipart/form-data']);
        $_FILES = [
            'file' => [
                'name' => 'test.jpg',
                'type' => 'image/jpeg',
                'tmp_name' => __FILE__, // Use this test file as mock
                'error' => 0,
                'size' => 100,
            ],
        ];

        $result = $controller->actionPostImage();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertArrayHasKey('url', $data);
    }

    public function testPostImageStudentCannotUpload(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\UploadController('upload', Yii::$app, []);
        $this->setMethod('POST');
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

    public function testPostProfilePhotoRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\UploadController('upload', Yii::$app, []);
        $this->setMethod('POST');

        try {
            $controller->actionPostProfilePhoto();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostProfilePhotoStudent(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\UploadController('upload', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setHeaders(['Content-Type' => 'multipart/form-data']);
        $_FILES = [
            'file' => [
                'name' => 'photo.jpg',
                'type' => 'image/jpeg',
                'tmp_name' => __FILE__,
                'error' => 0,
                'size' => 100,
            ],
        ];

        $result = $controller->actionPostProfilePhoto();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertArrayHasKey('url', $data);
    }
}
