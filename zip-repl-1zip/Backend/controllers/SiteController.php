<?php

declare(strict_types=1);

namespace app\controllers;

use app\helpers\Time;
use Yii;
use yii\web\Controller;
use yii\web\Response;

/**
 * Fallback JSON controller for the web root. The React SPA is served by Apache
 * at the document root, so this is only reached by a direct /index.php request.
 */
class SiteController extends Controller
{
    public $enableCsrfValidation = false;
    public $layout = false;

    public function actionIndex(): Response
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->data = [
            'name' => 'Bengali Islamic Institute API',
            'time' => Time::now(),
        ];
        return Yii::$app->response;
    }
}
