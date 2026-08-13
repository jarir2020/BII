<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use Yii;

/**
 * Unit tests for DefaultController — base API controller.
 */
final class DefaultControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsWelcome(): void
    {
        $controller = new \app\modules\api\controllers\DefaultController('default', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertArrayHasKey('message', $data);
        $this->assertMatchesRegularExpression('/API|BII/i', $data['message']);
    }

    public function testTestEndpointReturnsOk(): void
    {
        $controller = new \app\modules\api\controllers\DefaultController('default', Yii::$app, []);
        $result = $controller->actionTest();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame('pong', $data['response']);
    }
}
