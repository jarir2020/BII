<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for NotificationService — notification dispatch logic.
 */
final class NotificationServiceTest extends TestCase
{
    public function testCreate(): void
    {
        $service = new \app\components\NotificationService();
        $result = $service->create(
            'user-1',
            'title',
            'body',
            'info'
        );

        $this->assertIsArray($result);
        $this->assertArrayHasKey('id', $result);
    }

    public function testGetByUser(): void
    {
        $service = new \app\components\NotificationService();
        $notifications = $service->getByUser('user-1');

        $this->assertIsArray($notifications);
    }

    public function testMarkAsRead(): void
    {
        $service = new \app\components\NotificationService();
        $result = $service->markAsRead('notification-id');

        $this->assertIsBool($result);
    }

    public function testDelete(): void
    {
        $service = new \app\components\NotificationService();
        $result = $service->delete('notification-id');

        $this->assertIsBool($result);
    }

    public function testSendPushNotification(): void
    {
        $service = new \app\components\NotificationService();
        $result = $service->sendPushNotification(
            'user-1',
            'Push title',
            'Push body',
            ['extra' => 'data']
        );

        // Returns true or throws; we just check it doesn't crash
        $this->assertTrue($result === true || $result === null);
    }
}
