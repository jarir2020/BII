<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Time;
use Yii;

/**
 * GET /api — API root info.
 */
class DefaultController extends ApiController
{
    public function actionIndex(): \yii\web\Response
    {
        return $this->json([
            'name' => 'Bengali Islamic Institute API',
            'version' => (string) (Yii::$app->params['appVersion'] ?? '1.0.0'),
            'timestamp' => Time::now(),
        ]);
    }
}
