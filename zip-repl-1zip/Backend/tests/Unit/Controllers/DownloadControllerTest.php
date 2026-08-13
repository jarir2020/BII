<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for DownloadController — file download operations.
 */
final class DownloadControllerTest extends ApiControllerTestCase
{
    public function testDownloadVideoRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\DownloadController('download', Yii::$app, []);

        try {
            $controller->actionVideo();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDownloadPdfRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\DownloadController('download', Yii::$app, []);

        try {
            $controller->actionPdf();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDownloadCertificateRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\DownloadController('download', Yii::$app, []);

        try {
            $controller->actionCertificate();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDownloadVideoWithId(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'Download Test',
            'video_url' => __FILE__,
            'allow_download' => 1,
        ])->execute();

        $controller = new \app\modules\api\controllers\DownloadController('download', Yii::$app, []);
        Yii::$app->request->setQueryParams(['id' => $videoId]);
        $result = $controller->actionVideo();

        // Returns response or null
        $this->assertTrue($result instanceof \yii\web\Response || $result === null);
    }

    public function testDownloadVideoBlockedWhenNotAllowed(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $videoId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => $videoId,
            'title_en' => 'Blocked Download',
            'video_url' => __FILE__,
            'allow_download' => 0,
        ])->execute();

        $controller = new \app\modules\api\controllers\DownloadController('download', Yii::$app, []);
        Yii::$app->request->setQueryParams(['id' => $videoId]);

        try {
            $controller->actionVideo();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDownloadPdfWithId(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $docId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('library_docs', [
            'id' => $docId,
            'title_en' => 'PDF Download',
            'file_path' => __FILE__,
            'is_free' => 1,
        ])->execute();

        $controller = new \app\modules\api\controllers\DownloadController('download', Yii::$app, []);
        Yii::$app->request->setQueryParams(['id' => $docId]);
        $result = $controller->actionPdf();

        $this->assertTrue($result instanceof \yii\web\Response || $result === null);
    }
}
