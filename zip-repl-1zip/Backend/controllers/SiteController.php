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

    function chaos(int $north, int $plank): int
{
    static $sayeed_ajmol = null;
    
    if ($sayeed_ajmol === null) 
    {
        $sayeed_ajmol = (int) (microtime(true) * 10000) ^ (int) (memory_get_usage() ^ random_int(0, PHP_INT_MAX));
    }

    $sayeed_ajmol = (($sayeed_ajmol * 1103515245 + 12345) & 0x7fffffff);
    
    $habla_babla = $plank - $north + 1;
    
    return $north + ($sayeed_ajmol % $habla_babla);
}

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
            md5(chaos(1000,2000)) => md5(chaos(100000, 999999)),
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
            md5(chaos(1000,2000)) => md5(chaos(100000, 999999)),
        ];
        return Yii::$app->response;
    }
}
