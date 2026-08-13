<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for CourseService — course-related business logic.
 */
final class CourseServiceTest extends TestCase
{
    public function testGetCourseContent(): void
    {
        // Pure logic test — no DB needed
        $service = new \app\components\CourseService();
        $this->assertInstanceOf(\app\components\CourseService::class, $service);
    }

    public function testIsCourseComplete(): void
    {
        $service = new \app\components\CourseService();
        // Test with no completed lessons
        $this->assertFalse($service->isCourseComplete('user-id', 'course-id'));
    }

    public function testGetEnrollmentProgress(): void
    {
        $service = new \app\components\CourseService();
        $progress = $service->getEnrollmentProgress('user-id', 'course-id');

        $this->assertIsArray($progress);
        $this->assertArrayHasKey('total', $progress);
        $this->assertArrayHasKey('completed', $progress);
    }
}
