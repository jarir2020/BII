<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * Serve uploaded files from @webroot/uploads/.
 *
 * GET /api/files/<filename>  →  streams the file with correct Content-Type.
 * Used by winner reviews, teacher photos, course thumbnails, etc.
 */
class FilesController extends ApiController
{
    /** MIME types we allow (keep in sync with UploadController). */
    private const MIME = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
        'svg'  => 'image/svg+xml',
        'pdf'  => 'application/pdf',
        'mp4'  => 'video/mp4',
        'mp3'  => 'audio/mpeg',
    ];

    public function beforeAction($action): bool
    {
        // Files are public — no auth required.
        return parent::beforeAction($action);
    }

    public function actionView(string $filename): void
    {
        // Security: reject paths with directory traversal
        if ($filename === ''
            || !preg_match('/^[A-Za-z0-9._-]+$/', $filename)
            || str_contains($filename, '..')
            || str_contains($filename, '/')
            || str_contains($filename, '\\')) {
            Yii::$app->response->setStatusCode(400)->send();
            return;
        }

        $uploads = Yii::getAlias('@webroot') . '/uploads/';
        $path = $uploads . $filename;

        // Legacy upload URLs contain only the UUID. New Yii uploads are
        // stored as UUID.extension, so resolve the safe known extensions.
        if (!is_file($path) && preg_match('/^[0-9a-f-]{36}$/i', $filename)) {
            foreach (array_keys(self::MIME) as $extension) {
                $candidate = $uploads . $filename . '.' . $extension;
                if (is_file($candidate)) {
                    $path = $candidate;
                    break;
                }
            }
        }

        if (!is_file($path)) {
            Yii::$app->response->setStatusCode(404)->send();
            return;
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = self::MIME[$ext] ?? 'application/octet-stream';

        $response = Yii::$app->response;
        $response->format = \yii\web\Response::FORMAT_RAW;
        $response->headers->set('Content-Type', $mime);
        $response->headers->set('Cache-Control', 'public, max-age=31536000');
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->data = file_get_contents($path);
        $response->send();
    }
}
