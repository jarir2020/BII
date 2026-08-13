<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for CoursesController — CRUD + enroll + my-courses.
 */
final class CoursesControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsEmptyWhenNoCourses(): void
    {
        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsCourses(): void
    {
        $courseId = $this->createTestCourse();
        $this->createTestCourse(['title_en' => 'Second Course', 'price' => 1000]);

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
        $this->assertSame('Second Course', $data[0]['title_en']);
    }

    public function testPostCreatesCourseRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => 'নতুন কোর্স',
            'title_en' => 'New Course',
            'price' => 750,
        ];

        try {
            $controller->actionIndex();
            $this->fail('Expected 403 forbidden');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesCourseAsAdmin(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => 'কোরআন শিক্ষা',
            'title_en' => 'Quran Education',
            'price' => 1200,
            'is_free' => false,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('কোরআন শিক্ষা', $data['title_bn']);
        $this->assertSame('Quran Education', $data['title_en']);
        $this->assertSame(1200.0, $data['price']);
        $this->assertFalse($data['is_free']);
        $this->assertArrayHasKey('id', $data);
    }

    public function testFreeCourseSetsPriceToZero(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_en' => 'Free Course',
            'price' => 999,
            'is_free' => true,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertTrue($data['is_free']);
        $this->assertSame(0.0, $data['price']);
    }

    public function testViewReturns404ForMissingCourse(): void
    {
        $this->authenticateAs($this->createTestUser());
        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);

        try {
            $controller->actionView('non-existent-id');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testViewReturnsCourse(): void
    {
        $courseId = $this->createTestCourse(['title_en' => 'View Test']);
        $this->authenticateAs($this->createTestUser());

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        $result = $controller->actionView($courseId);
        $data = $result->data;

        $this->assertSame('View Test', $data['title_en']);
        $this->assertSame($courseId, $data['id']);
    }

    public function testEnrollSuccess(): void
    {
        $courseId = $this->createTestCourse(['price' => 500, 'is_free' => 0]);
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->setQueryParams(['cid' => $courseId]);
        $result = $controller->actionEnroll();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        // Verify enrollment in DB
        $enrolled = Yii::$app->db->createCommand(
            'SELECT id FROM enrollments WHERE user_id = :u AND course_id = :c',
            [':u' => $userId, ':c' => $courseId]
        )->queryOne();
        $this->assertNotFalse($enrolled);
    }

    public function testEnrollFreeCourse(): void
    {
        $courseId = $this->createTestCourse(['price' => 0, 'is_free' => 1]);
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->setQueryParams(['cid' => $courseId]);
        $result = $controller->actionEnroll();
        $data = $result->data;

        $this->assertTrue($data['ok']);
    }

    public function testEnrollAlreadyEnrolled(): void
    {
        $courseId = $this->createTestCourse();
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // First enrollment
        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->setQueryParams(['cid' => $courseId]);
        $controller->actionEnroll();

        // Second enrollment — should return already_enrolled
        $result = $controller->actionEnroll();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertTrue($data['already_enrolled']);
    }

    public function testEnrollMissingCourse(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->setQueryParams(['cid' => 'non-existent']);

        try {
            $controller->actionEnroll();
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testMyCoursesReturnsEmptyWhenNoEnrollments(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        $result = $controller->actionMyCourses();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testMyCoursesReturnsEnrolledCourses(): void
    {
        $courseId = $this->createTestCourse(['title_en' => 'My Course']);
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Enroll
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
        ])->execute();

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        $result = $controller->actionMyCourses();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('My Course', $data[0]['title_en']);
    }

    public function testDeleteCourseRequiresAdmin(): void
    {
        $courseId = $this->createTestCourse();
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->isDelete = true;

        try {
            $controller->actionView($courseId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteCourseAsAdmin(): void
    {
        $courseId = $this->createTestCourse();
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->isDelete = true;
        $result = $controller->actionView($courseId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        // Verify deleted
        $row = Yii::$app->db->createCommand(
            'SELECT id FROM courses WHERE id = :id', [':id' => $courseId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testUpdateCourseRequiresAdmin(): void
    {
        $courseId = $this->createTestCourse();
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->isPut = true;
        $_POST = ['title_en' => 'Updated'];

        try {
            $controller->actionView($courseId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdateCourseAsAdmin(): void
    {
        $courseId = $this->createTestCourse(['title_en' => 'Original']);
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->isPut = true;
        $_POST = ['title_en' => 'Updated Title'];

        $result = $controller->actionView($courseId);
        $data = $result->data;

        $this->assertSame('Updated Title', $data['title_en']);
        $this->assertSame($courseId, $data['id']);
    }

    public function testContentRequiresEnrollment(): void
    {
        $courseId = $this->createTestCourse();
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->setQueryParams(['cid' => $courseId]);

        try {
            $controller->actionContent();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testContentReturnsLiveClassesAndVideosForEnrolled(): void
    {
        $courseId = $this->createTestCourse();
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Enroll
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
        ])->execute();

        // Add a live class
        Yii::$app->db->createCommand()->insert('live_classes', [
            'id' => Uuid::v4(),
            'title_bn' => 'লাইভ ক্লাস',
            'title_en' => 'Live Class',
            'join_url' => 'https://zoom.us/j/123',
            'scheduled_at' => Time::now(),
            'course_id' => $courseId,
            'is_free' => 1,
        ])->execute();

        // Add a video
        Yii::$app->db->createCommand()->insert('videos', [
            'id' => Uuid::v4(),
            'title_bn' => 'ভিডিও',
            'title_en' => 'Video',
            'video_url' => 'https://example.com/video.mp4',
            'course_id' => $courseId,
        ])->execute();

        $controller = new \app\modules\api\controllers\CoursesController('courses', Yii::$app, []);
        Yii::$app->request->setQueryParams(['cid' => $courseId]);
        $result = $controller->actionContent();
        $data = $result->data;

        $this->assertCount(1, $data['live_classes']);
        $this->assertCount(1, $data['videos']);
        $this->assertSame('https://zoom.us/j/123', $data['live_classes'][0]['join_url']);
    }
}
