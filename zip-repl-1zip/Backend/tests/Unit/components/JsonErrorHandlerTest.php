<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use app\components\JsonErrorHandler;
use Yii;
use yii\web\NotFoundHttpException;
use yii\web\Response;

/**
 * Unit tests for app\components\JsonErrorHandler — FastAPI-style JSON errors.
 * Uses SQLite test database.
 */
final class JsonErrorHandlerTest extends \PHPUnit\Framework\TestCase
{
    protected function setUp(): void
    {
        putenv('YII_ENV=test');
        $app = new \yii\web\Application(require __DIR__ . '/../../../config/test.php');
        $app->run();
    }

    public function testRenderExceptionReturnsJsonForHttp404(): void
    {
        $handler = new JsonErrorHandler();
        $exception = new NotFoundHttpException('Resource not found');

        // Capture the response
        $response = Yii::$app->getResponse();
        $handler->renderException($exception);

        $this->assertSame(Response::FORMAT_JSON, $response->format);
        $this->assertSame(404, $response->statusCode);
        $this->assertSame(['detail' => 'Not Found'], $response->data);
    }

    public function testRenderExceptionReturnsJsonForGenericHttpException(): void
    {
        $handler = new JsonErrorHandler();
        $exception = new \yii\web\HttpException(403, 'Forbidden access');

        $response = Yii::$app->getResponse();
        $handler->renderException($exception);

        $this->assertSame(Response::FORMAT_JSON, $response->format);
        $this->assertSame(403, $response->statusCode);
        $this->assertSame(['detail' => 'Forbidden access'], $response->data);
    }

    public function testRenderExceptionReturnsJsonForDefault500(): void
    {
        $handler = new JsonErrorHandler();
        $exception = new \Exception('Something went wrong');

        $response = Yii::$app->getResponse();
        $handler->renderException($exception);

        $this->assertSame(Response::FORMAT_JSON, $response->format);
        $this->assertSame(500, $response->statusCode);
        $this->assertSame(['detail' => 'Something went wrong'], $response->data);
    }

    public function testRenderExceptionEmptyMessageDefaultsToInternalServerError(): void
    {
        $handler = new JsonErrorHandler();
        $exception = new \Exception('');

        $response = Yii::$app->getResponse();
        $handler->renderException($exception);

        $this->assertSame(500, $response->statusCode);
        $this->assertSame(['detail' => 'Internal Server Error'], $response->data);
    }

    public function testNotFoundHttpExceptionMessageIsNormalized(): void
    {
        $handler = new JsonErrorHandler();
        $exception = new NotFoundHttpException('Custom not found message');

        $response = Yii::$app->getResponse();
        $handler->renderException($exception);

        // Message should be normalized to 'Not Found' for 404
        $this->assertSame(['detail' => 'Not Found'], $response->data);
    }
}
