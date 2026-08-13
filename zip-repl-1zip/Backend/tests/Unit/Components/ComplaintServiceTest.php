<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for ComplaintService — complaint handling logic.
 */
final class ComplaintServiceTest extends TestCase
{
    public function testCreateComplaint(): void
    {
        $service = new \app\components\ComplaintService();
        $result = $service->create('user-1', 'Subject', 'Description here');

        $this->assertIsArray($result);
        $this->assertArrayHasKey('id', $result);
    }

    public function testGetUserComplaints(): void
    {
        $service = new \app\components\ComplaintService();
        $complaints = $service->getUserComplaints('user-1');

        $this->assertIsArray($complaints);
    }

    public function testAssignToAdmin(): void
    {
        $service = new \app\components\ComplaintService();
        $result = $service->assignToAdmin('complaint-id', 'admin-1');

        $this->assertIsBool($result);
    }

    public function testChangeStatus(): void
    {
        $service = new \app\components\ComplaintService();
        $result = $service->changeStatus('complaint-id', 'resolved');

        $this->assertIsBool($result);
    }

    public function testAddReply(): void
    {
        $service = new \app\components\ComplaintService();
        $result = $service->addReply('complaint-id', 'admin-1', 'Reply text');

        $this->assertIsBool($result);
    }
}
