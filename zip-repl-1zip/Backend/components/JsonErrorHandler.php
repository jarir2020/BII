<?php

declare(strict_types=1);

namespace app\components;

use Yii;
use yii\base\Exception;
use yii\base\InvalidConfigException;
use yii\web\ErrorHandler;
use yii\web\HttpException;
use yii\web\NotFoundHttpException;
use yii\web\Response;

/**
 * Renders every uncaught error/exception as FastAPI-style JSON:
 *   {"detail": "<message>"}
 * with the correct HTTP status code.
 */
class JsonErrorHandler extends ErrorHandler
{
    protected function renderException($exception): void
    {
        $response = Yii::$app->getResponse();
        if ($response instanceof Response) {
            $response->format = Response::FORMAT_JSON;
        }

        $code = 500;
        if ($exception instanceof HttpException) {
            $code = $exception->statusCode;
        } elseif ($exception instanceof NotFoundHttpException) {
            $code = 404;
        }

        // Match FastAPI wording for the common auth cases.
        $message = $exception->getMessage();
        if ($code === 404) {
            $message = 'Not Found';
        }

        $response->setStatusCode($code);
        $response->data = ['detail' => $message !== '' ? $message : 'Internal Server Error'];

        if (YII_DEBUG) {
            Yii::error($exception->getTraceAsString(), __METHOD__);
        }

        $response->send();
    }
}
