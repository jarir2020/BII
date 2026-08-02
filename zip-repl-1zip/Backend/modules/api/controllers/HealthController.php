<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Time;
use Yii;

/**
 * GET /api/health — matches FastAPI's health_check().
 */
class HealthController extends ApiController
{
    public function actionIndex(): \yii\web\Response
    {
        return $this->json([
            'status' => 'ok',
            'version' => (string) (Yii::$app->params['appVersion'] ?? '1.0.0'),
            'timestamp' => Time::now(),
        ]);
    }
}
