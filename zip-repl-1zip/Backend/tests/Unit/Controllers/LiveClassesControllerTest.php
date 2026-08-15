<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for LiveClassesController — live class management.
 */
final class LiveClassesControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsEmpty(): void
    {
        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsLiveClasses(): void
    {
        $teacherId = $this->createTestUser('teacher');

        $classId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('live_classes', [
            'id' => $classId,
            'title_bn' => 'লাইভ ক্লাস ১',
            'title_en' => 'Live Class 1',
            'teacher_id' => $teacherId,
            'start_time' => Time::now(),
            'end_time' => Time::addMinutes(Time::now(), 60),
            'zoom_link' => 'https://zoom.us/j/test',
            'is_active' => 1,
        ])->execute();

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Live Class 1', $data[0]['title_en']);
    }

    public function testPostCreatesLiveClassRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['title_en' => 'New Class'];

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesLiveClass(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $teacherId = $this->createTestUser('teacher');

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'title_bn' => 'নতুন ক্লাস',
            'title_en' => 'New Live Class',
            'teacher_id' => $teacherId,
            'start_time' => Time::now(),
            'end_time' => Time::addMinutes(Time::now(), 90),
            'zoom_link' => 'https://zoom.us/j/new',
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('নতুন ক্লাস', $data['title_bn']);
        $this->assertArrayHasKey('id', $data);
    }

    public function testViewReturns404(): void
    {
        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testViewReturnsClass(): void
    {
        $teacherId = $this->createTestUser('teacher');
        $classId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('live_classes', [
            'id' => $classId,
            'title_en' => 'View Class',
            'teacher_id' => $teacherId,
            'start_time' => Time::now(),
            'end_time' => Time::addMinutes(Time::now(), 60),
            'zoom_link' => 'https://zoom.us/j/view',
        ])->execute();

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $result = $controller->actionView($classId);
        $data = $result->data;

        $this->assertSame('View Class', $data['title_en']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);

        try {
            $controller->actionDelete('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesClass(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $teacherId = $this->createTestUser('teacher');
        $classId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('live_classes', [
            'id' => $classId,
            'title_en' => 'Delete Class',
            'teacher_id' => $teacherId,
            'start_time' => Time::now(),
            'end_time' => Time::addMinutes(Time::now(), 60),
            'zoom_link' => 'https://zoom.us/j/del',
        ])->execute();

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $result = $controller->actionDelete($classId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM live_classes WHERE id = :id', [':id' => $classId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testMyClassesReturnsTeacherClasses(): void
    {
        $teacherId = $this->createTestUser('teacher');
        $this->authenticateAs($teacherId, 'teacher');

        $classId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('live_classes', [
            'id' => $classId,
            'title_en' => 'My Teacher Class',
            'teacher_id' => $teacherId,
            'start_time' => Time::now(),
            'end_time' => Time::addMinutes(Time::now(), 60),
            'zoom_link' => 'https://zoom.us/j/my',
        ])->execute();

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $result = $controller->actionMyClasses();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('My Teacher Class', $data[0]['title_en']);
    }

    public function testMyClassesReturns403ForStudents(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);

        try {
            $controller->actionMyClasses();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testStudentMyClassesReturnsEnrolledClasses(): void
    {
        $studentId = $this->createTestUser();
        $this->authenticateAs($studentId);

        $teacherId = $this->createTestUser('teacher');
        $classId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('live_classes', [
            'id' => $classId,
            'title_en' => 'Student Live Class',
            'teacher_id' => $teacherId,
            'start_time' => Time::now(),
            'end_time' => Time::addMinutes(Time::now(), 60),
            'zoom_link' => 'https://zoom.us/j/student',
        ])->execute();

        // Enroll in course that has this live class
        $courseId = $this->createTestCourse();
        Yii::$app->db->createCommand()->insert('course_live_classes', [
            'id' => Uuid::v4(),
            'course_id' => $courseId,
            'live_class_id' => $classId,
        ])->execute();

        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $studentId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
        ])->execute();

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $result = $controller->actionMyClasses();
        $data = $result->data;

        $this->assertCount(1, $data);
    }
}
