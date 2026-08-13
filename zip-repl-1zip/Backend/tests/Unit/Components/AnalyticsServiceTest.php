<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for AnalyticsService — analytics data calculations.
 */
final class AnalyticsServiceTest extends TestCase
{
    public function testGetDashboardStats(): void
    {
        $service = new \app\components\AnalyticsService();
        $stats = $service->getDashboardStats();

        $this->assertIsArray($stats);
        $this->assertArrayHasKey('students', $stats);
        $this->assertArrayHasKey('teachers', $stats);
        $this->assertArrayHasKey('courses', $stats);
    }

    public function testGetRevenue(): void
    {
        $service = new \app\components\AnalyticsService();
        $revenue = $service->getRevenue();

        $this->assertIsArray($revenue);
        $this->assertArrayHasKey('total', $revenue);
        $this->assertArrayHasKey('monthly', $revenue);
    }

    public function testGetMonthlyEnrollments(): void
    {
        $service = new \app\components\AnalyticsService();
        $enrollments = $service->getMonthlyEnrollments();

        $this->assertIsArray($enrollments);
    }

    public function testGetPopularCourses(): void
    {
        $service = new \app\components\AnalyticsService();
        $courses = $service->getPopularCourses(5);

        $this->assertIsArray($courses);
        $this->assertCount(0, $courses); // No data in test DB
    }
}
