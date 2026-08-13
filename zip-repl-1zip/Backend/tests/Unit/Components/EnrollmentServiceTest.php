<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for EnrollmentService — enrollment business logic.
 */
final class EnrollmentServiceTest extends TestCase
{
    public function testCanEnroll(): void
    {
        $service = new \app\components\EnrollmentService();

        // A user with no existing enrollment can enroll
        $result = $service->canEnroll('user-id', 'course-id');
        $this->assertIsBool($result);
    }

    public function testGetUserCourses(): void
    {
        $service = new \app\components\EnrollmentService();
        $courses = $service->getUserCourses('user-id');

        $this->assertIsArray($courses);
    }

    public function testGetCourseStudents(): void
    {
        $service = new \app\components\EnrollmentService();
        $students = $service->getCourseStudents('course-id');

        $this->assertIsArray($students);
    }

    public function testCheckCompletion(): void
    {
        $service = new \app\components\EnrollmentService();
        $completed = $service->checkCompletion('user-id', 'course-id');

        $this->assertIsBool($completed);
    }
}
