<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use Throwable;
use Yii;
use yii\web\UploadedFile;

/**
 * /api/upload — authenticated file upload (local storage).
 */
class UploadController extends ApiController
{
    private const MIME = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif',
        'webp' => 'image/webp', 'svg' => 'image/svg+xml', 'pdf' => 'application/pdf',
        'mp4' => 'video/mp4', 'mp3' => 'audio/mpeg',
    ];

    public function actionIndex(): \yii\web\Response
    {
        $this->user();
        $file = UploadedFile::getInstanceByName('file');
        if ($file === null || $file->error !== UPLOAD_ERR_OK || $file->name === '') {
            $this->badRequest('No file');
        }
        $ext = strtolower(pathinfo($file->name, PATHINFO_EXTENSION));
        if (!isset(self::MIME[$ext])) {
            $this->badRequest('Unsupported file type');
        }
        if ($file->size > 15 * 1024 * 1024) {
            $this->badRequest('ফাইল ১৫MB এর বেশি');
        }

        $dir = Yii::getAlias('@webroot') . '/uploads';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $fileId = Uuid::v4();
        $name = $fileId . '.' . $ext;
        try {
            $file->saveAs($dir . '/' . $name);
        } catch (Throwable $e) {
            $this->badRequest('Upload failed: ' . $e->getMessage());
        }

        return $this->json(['url' => '/uploads/' . $name]);
    }
}
