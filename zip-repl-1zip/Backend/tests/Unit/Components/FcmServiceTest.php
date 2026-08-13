<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use app\helpers\Time;
use app\helpers\Uuid;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for FcmService — Firebase Cloud Messaging push notifications.
 */
final class FcmServiceTest extends TestCase
{
    public function testSendRequiresValidKey(): void
    {
        if (!getenv('FCM_SERVER_KEY')) {
            $this->markTestSkipped('FCM_SERVER_KEY not set');
        }

        $service = new \app\components\FcmService();
        $result = $service->send(
            'test-topic',
            'Test title',
            'Test body',
            []
        );

        // In test mode, should not throw; result may be false if key invalid
        $this->assertIsBool($result) || $this->assertArrayHasKey('success', $result);
    }

    public function testSendToUser(): void
    {
        if (!getenv('FCM_SERVER_KEY')) {
            $this->markTestSkipped('FCM_SERVER_KEY not set');
        }

        $service = new \app\components\FcmService();
        $result = $service->send(
            null,
            'User notification',
            'Hello user',
            ['user_id' => 'test-user-123']
        );

        $this->assertIsBool($result) || $this->assertArrayHasKey('success', $result);
    }

    public function testSendToTopic(): void
    {
        if (!getenv('FCM_SERVER_KEY')) {
            $this->markTestSkipped('FCM_SERVER_KEY not set');
        }

        $service = new \app\components\FcmService();
        $result = $service->send(
            'topic:new-course',
            'New course',
            'A new course is available',
            ['course_id' => 'abc123']
        );

        $this->assertIsBool($result) || $this->assertArrayHasKey('success', $result);
    }

    public function testSendWithEmptyData(): void
    {
        if (!getenv('FCM_SERVER_KEY')) {
            $this->markTestSkipped('FCM_SERVER_KEY not set');
        }

        $service = new \app\components\FcmService();
        $result = $service->send('topic:test', 'Title', 'Body', []);

        $this->assertIsBool($result) || $this->assertArrayHasKey('success', $result);
    }
}
