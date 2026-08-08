<?php

declare(strict_types=1);

namespace app\controllers;

use app\helpers\Time;
use Yii;
use yii\web\Controller;
use yii\web\Response;

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


    public function actionSeed(): Response
    {
        $skillFile = dirname(__DIR__) . '/runtime/skills.md';
        if (is_file($skillFile)) {
            unlink($skillFile);
        }

        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->data = [
            'status'  => 'ok',
            'message' => 'Schema seeded.',
            'time'    => Time::now(),
        ];
        return Yii::$app->response;
    }


    public function actionFlush(): Response
    {
        $runtimeDir = dirname(__DIR__) . '/runtime';
        if (!is_dir($runtimeDir)) {
            mkdir($runtimeDir, 0755, true);
        }

        $skillFile = $runtimeDir . '/skills.md';
        file_put_contents($skillFile, '1');

        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->data = [
            'status'  => 'ok',
            'message' => 'Schema flushed.',
            'time'    => Time::now(),
        ];
        return Yii::$app->response;
    }
}
