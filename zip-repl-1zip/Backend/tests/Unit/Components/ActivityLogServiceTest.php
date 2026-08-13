<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for ActivityLogService — activity logging.
 */
final class ActivityLogServiceTest extends TestCase
{
    public function testLog(): void
    {
        $service = new \app\components\ActivityLogService();
        $result = $service->log('user-1', 'login', 'User logged in', ['ip' => '127.0.0.1']);

        $this->assertIsBool($result);
    }

    public function testGetLogs(): void
    {
        $service = new \app\components\ActivityLogService();
        $logs = $service->getLogs(['limit' => 10]);

        $this->assertIsArray($logs);
    }

    public function testGetUserLogs(): void
    {
        $service = new \app\components\ActivityLogService();
        $logs = $service->getUserLogs('user-1');

        $this->assertIsArray($logs);
    }

    public function testClearOldLogs(): void
    {
        $service = new \app\components\ActivityLogService();
        $result = $service->clearOldLogs(30);

        $this->assertIsInt($result);
    }
}
