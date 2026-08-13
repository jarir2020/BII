<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for LiveClassService — live class management logic.
 */
final class LiveClassServiceTest extends TestCase
{
    public function testGetUpcomingClasses(): void
    {
        $service = new \app\components\LiveClassService();
        $classes = $service->getUpcomingClasses('2024-01-01');

        $this->assertIsArray($classes);
    }

    public function testGetTeacherClasses(): void
    {
        $service = new \app\components\LiveClassService();
        $classes = $service->getTeacherClasses('teacher-1');

        $this->assertIsArray($classes);
    }

    public function testGetStudentClasses(): void
    {
        $service = new \app\components\LiveClassService();
        $classes = $service->getStudentClasses('student-1');

        $this->assertIsArray($classes);
    }

    public function testJoinClass(): void
    {
        $service = new \app\components\LiveClassService();
        $result = $service->joinClass('class-1', 'student-1');

        $this->assertIsBool($result);
    }

    public function testCancelClass(): void
    {
        $service = new \app\components\LiveClassService();
        $result = $service->cancelClass('class-1');

        $this->assertIsBool($result);
    }
}
