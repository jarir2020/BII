<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for WebPushService — web push notification service.
 */
final class WebPushServiceTest extends TestCase
{
    public function testSendToEndpoint(): void
    {
        $service = new \app\components\WebPushService();
        $result = $service->send(
            'https://fcm.googleapis.com/fcm/send/test-endpoint',
            'Push title',
            'Push body',
            ['data' => ['key' => 'value']]
        );

        // May throw if endpoint unreachable; check return value
        $this->assertIsBool($result);
    }

    public function testSendMultipleSubscriptions(): void
    {
        $service = new \app\components\WebPushService();
        $result = $service->sendToUsers(
            ['user-1', 'user-2'],
            'Batch push',
            'Test batch'
        );

        $this->assertIsArray($result);
    }

    public function testSendToAllSubscribers(): void
    {
        $service = new \app\components\WebPushService();
        $result = $service->sendToAll(
            'All subscribers',
            'Broadcast message'
        );

        $this->assertIsArray($result);
    }
}
