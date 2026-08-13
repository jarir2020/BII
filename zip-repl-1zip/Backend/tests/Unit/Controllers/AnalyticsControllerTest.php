<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for AnalyticsController — admin dashboard statistics.
 */
final class AnalyticsControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testIndexReturnsAllStatsWhenEmpty(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertArrayHasKey('students', $data);
        $this->assertArrayHasKey('teachers', $data);
        $this->assertArrayHasKey('admins', $data);
        $this->assertArrayHasKey('courses', $data);
        $this->assertArrayHasKey('lessons', $data);
        $this->assertArrayHasKey('videos', $data);
        $this->assertArrayHasKey('pdfs', $data);
        $this->assertArrayHasKey('live_classes', $data);
        $this->assertArrayHasKey('enrollments', $data);
        $this->assertArrayHasKey('orders', $data);
        $this->assertArrayHasKey('products', $data);
        $this->assertArrayHasKey('hadiths', $data);
        $this->assertArrayHasKey('notifications', $data);
        $this->assertArrayHasKey('revenue', $data);
        $this->assertArrayHasKey('logins_recent', $data);
        $this->assertArrayHasKey('date', $data);
    }

    public function testIndexCountsStudents(): void
    {
        $adminId = $this->createAdminUser();
        $this->createTestUser('student', 'student1@example.com');
        $this->createTestUser('student', 'student2@example.com');
        $this->createTestUser('student', 'student3@example.com');
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(3, (int) $data['students']);
    }

    public function testIndexCountsTeachers(): void
    {
        $adminId = $this->createAdminUser();
        $this->createTestUser('teacher', 'teacher1@example.com');
        $this->createTestUser('teacher', 'teacher2@example.com');
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(2, (int) $data['teachers']);
    }

    public function testIndexCountsAdmins(): void
    {
        $this->createTestUser('admin', 'admin2@example.com');
        $this->createTestUser('super_admin', 'super@example.com');
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(3, (int) $data['admins']);
    }

    public function testIndexCountsCourses(): void
    {
        $adminId = $this->createAdminUser();
        $this->createTestCourse();
        $this->createTestCourse(['title_en' => 'Second']);
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(2, (int) $data['courses']);
    }

    public function testIndexCountsEnrollments(): void
    {
        $adminId = $this->createAdminUser();
        $courseId = $this->createTestCourse();
        $userId = $this->createTestUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
        ])->execute();

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(1, (int) $data['enrollments']);
    }

    public function testIndexCalculatesRevenue(): void
    {
        $adminId = $this->createAdminUser();
        $courseId = $this->createTestCourse(['price' => 1000]);
        $userId = $this->createTestUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'success',
            'amount' => 1000,
        ])->execute();

        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
        ])->execute();

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(1000.0, (float) $data['revenue']);
    }

    public function testIndexReturnsDate(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $data['date']);
        $this->assertSame(gmdate('Y-m-d'), $data['date']);
    }

    public function testIndexCountsNotifications(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('notifications', [
            'id' => Uuid::v4(),
            'title_bn' => 'Test',
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('notifications', [
            'id' => Uuid::v4(),
            'title_bn' => 'Test 2',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(2, (int) $data['notifications']);
    }

    public function testIndexCountsVideos(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('videos', [
            'id' => Uuid::v4(),
            'title_en' => 'Video 1',
            'video_url' => 'https://example.com/1.mp4',
        ])->execute();

        Yii::$app->db->createCommand()->insert('videos', [
            'id' => Uuid::v4(),
            'title_en' => 'Video 2',
            'video_url' => 'https://example.com/2.mp4',
        ])->execute();

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(2, (int) $data['videos']);
    }

    public function testIndexCountsLiveClasses(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('live_classes', [
            'id' => Uuid::v4(),
            'title_en' => 'Live 1',
            'join_url' => 'https://zoom.us/j/1',
        ])->execute();

        $controller = new \app\modules\api\controllers\AnalyticsController('analytics', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(1, (int) $data['live_classes']);
    }
}
