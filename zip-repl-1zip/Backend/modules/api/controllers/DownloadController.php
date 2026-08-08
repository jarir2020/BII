<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/download/* — File download endpoints.
 *
 * 2026-08-08: Added app APK download.
 */
class DownloadController extends ApiController
{
    /**
     * GET /api/download/app — Download the Android APK.
     * Serves uploads/app/BII.apk with proper headers.
     */
    public function actionApp(): \yii\web\Response
    {
        $apkPath = Yii::getAlias('@webroot') . '/uploads/app/BII.apk';

        if (!is_file($apkPath)) {
            $this->notFound('APK not found. Please upload BII.apk to uploads/app/');
        }

        $response = Yii::$app->response;
        $response->headers->set('Content-Type', 'application/vnd.android.package-archive');
        $response->headers->set('Content-Disposition', 'attachment; filename="BII.apk"');
        $response->headers->set('Content-Length', (string) filesize($apkPath));
        $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
        $response->format = \yii\web\Response::FORMAT_RAW;
        $response->content = file_get_contents($apkPath);

        return $response;
    }
}
