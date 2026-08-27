<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;
use yii\web\HttpException;

/**
 * /api/media — admin view/delete for files uploaded through /api/upload.
 *
 * Uploads are intentionally filesystem-backed in this application. The
 * upload endpoint returns a UUID and the public FilesController resolves the
 * UUID to its allowed extension, so this controller follows the same model
 * without introducing a second metadata table.
 */
class MediaController extends ApiController
{
    private const MIME = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'pdf' => 'application/pdf',
        'mp4' => 'video/mp4',
        'mp3' => 'audio/mpeg',
    ];

    /** GET /api/media. */
    public function actionIndex(): \yii\web\Response
    {
        $this->requireAdmin();
        $dir = $this->uploadsDir();
        if (!is_dir($dir)) {
            return $this->json([]);
        }

        $files = [];
        foreach (scandir($dir) ?: [] as $filename) {
            if ($filename === '.' || $filename === '..') {
                continue;
            }
            $path = $dir . DIRECTORY_SEPARATOR . $filename;
            if (!is_file($path)) {
                continue;
            }

            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            if (!isset(self::MIME[$extension])) {
                continue;
            }

            $id = pathinfo($filename, PATHINFO_FILENAME);
            if (!preg_match('/^[A-Za-z0-9_-]+$/', $id)) {
                continue;
            }
            $files[] = [
                'id' => $id,
                'url' => '/api/files/' . $id,
                'filename' => $filename,
                'original_filename' => $filename,
                'content_type' => self::MIME[$extension],
                'size' => (int) filesize($path),
                'created_at' => gmdate('c', (int) filemtime($path)),
            ];
        }

        usort($files, static fn (array $a, array $b): int => strcmp($b['created_at'], $a['created_at']));
        return $this->json($files);
    }

    /** DELETE /api/media/{id}. */
    public function actionDelete(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        if (!Yii::$app->request->isDelete) {
            throw new HttpException(405, 'Method Not Allowed');
        }
        if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) {
            $this->badRequest('Invalid media id');
        }

        $dir = $this->uploadsDir();
        foreach (array_keys(self::MIME) as $extension) {
            $path = $dir . DIRECTORY_SEPARATOR . $id . '.' . $extension;
            if (!is_file($path)) {
                continue;
            }
            if (!@unlink($path)) {
                throw new HttpException(500, 'Unable to delete media');
            }
            return $this->json(['ok' => true, 'deleted' => 1, 'id' => $id]);
        }

        $this->notFound('Media not found');
    }

    private function uploadsDir(): string
    {
        return Yii::getAlias('@webroot') . '/uploads';
    }
}
