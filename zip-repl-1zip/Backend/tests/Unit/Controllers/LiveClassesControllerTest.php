<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for LiveClassesController — live class management.
 */

class LiveClassesControllerTest extends ApiControllerTestCase
{
    public function testFreeClassesAreVisibleWithoutEnrollment(): void
    {
        $userId = $this->createTestUser('student', 'free-live@example.com');
        $this->authenticateAs($userId);

        $freeId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('live_classes', [
            'id' => $freeId,
            'title_bn' => 'সবার জন্য লাইভ ক্লাস',
            'join_url' => 'https://zoom.us/j/free',
            'scheduled_at' => Time::now(),
            'is_free' => 1,
        ])->execute();

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $data = $controller->actionMy()->data;

        $this->assertContains($freeId, array_column($data, 'id'));
    }

    public function testCourseClassesOnlyAppearForPaidEnrollmentInThatCourse(): void
    {
        $userId = $this->createTestUser('student', 'course-live@example.com');
        $this->authenticateAs($userId);

        $purchasedCourseId = $this->createTestCourse();
        $otherCourseId = $this->createTestCourse(['title_en' => 'Other Course']);
        $freeEnrollmentCourseId = $this->createTestCourse(['is_free' => 1, 'title_en' => 'Free Course']);

        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $purchasedCourseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'success',
            'amount' => 500,
        ])->execute();
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $freeEnrollmentCourseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
        ])->execute();

        $visibleId = Uuid::v4();
        $otherId = Uuid::v4();
        $freeEnrollmentId = Uuid::v4();
        foreach ([
            [$visibleId, $purchasedCourseId],
            [$otherId, $otherCourseId],
            [$freeEnrollmentId, $freeEnrollmentCourseId],
        ] as [$id, $courseId]) {
            Yii::$app->db->createCommand()->insert('live_classes', [
                'id' => $id,
                'title_bn' => 'কোর্স লাইভ ক্লাস',
                'join_url' => 'https://zoom.us/j/' . $id,
                'scheduled_at' => Time::now(),
                'course_id' => $courseId,
                'is_free' => 0,
            ])->execute();
        }

        $controller = new \app\modules\api\controllers\LiveClassesController('live-classes', Yii::$app, []);
        $ids = array_column($controller->actionMy()->data, 'id');

        $this->assertContains($visibleId, $ids);
        $this->assertNotContains($otherId, $ids);
        $this->assertNotContains($freeEnrollmentId, $ids);
    }
}
