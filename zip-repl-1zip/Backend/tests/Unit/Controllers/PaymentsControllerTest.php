<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for PaymentsController — payment history and status.
 */

class PaymentsControllerTest extends ApiControllerTestCase
{
    public function testSubmittingPaymentNotifiesAdmins(): void
    {
        $studentId = $this->createTestUser('student', 'student@example.com');
        $adminId = $this->createAdminUser('admin@example.com');
        $courseId = $this->createTestCourse(['title_bn' => '', 'title_en' => 'Paid Course', 'cover_image' => '/uploads/course.jpg']);
        $this->authenticateAs($studentId);
        Yii::$app->set('cache', ['class' => \yii\caching\ArrayCache::class]);
        $this->setMethod('POST');
        $this->setBody([
            'course_id' => $courseId,
            'transaction_id' => 'TXN123456',
            'payment_method' => 'bkash',
        ]);

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);
        $result = $controller->actionSubmit();

        $this->assertTrue($result->data['ok']);
        $notification = Yii::$app->db->createCommand(
            'SELECT * FROM notifications WHERE user_id = :uid AND title_en = :title',
            [':uid' => $adminId, ':title' => 'New course purchase request']
        )->queryOne();
        $this->assertNotFalse($notification);
        $this->assertStringContainsString('Paid Course', $notification['body_en']);
        $this->assertSame('/uploads/course.jpg', $notification['image_url']);
    }

    public function testApprovingPaymentNotifiesStudent(): void
    {
        $studentId = $this->createTestUser('student', 'student@example.com');
        $adminId = $this->createAdminUser('admin@example.com');
        $courseId = $this->createTestCourse(['title_bn' => '', 'title_en' => 'Paid Course', 'cover_image' => '/uploads/course.jpg']);
        $paymentId = $this->insertPaymentRequest($studentId, $courseId);
        $this->authenticateAs($adminId, 'admin');
        $this->setMethod('PUT');
        Yii::$app->request->queryParams = ['pid' => $paymentId];

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);
        $result = $controller->actionApprove();

        $this->assertTrue($result->data['ok']);
        $notification = Yii::$app->db->createCommand(
            'SELECT * FROM notifications WHERE user_id = :uid AND title_en = :title',
            [':uid' => $studentId, ':title' => 'Payment approved — enrollment complete']
        )->queryOne();
        $this->assertNotFalse($notification);
        $this->assertStringContainsString('Paid Course', $notification['body_en']);
    }

    public function testCompletingCourseNotifiesStudentAndAdmins(): void
    {
        $studentId = $this->createTestUser('student', 'student@example.com');
        $adminId = $this->createAdminUser('admin@example.com');
        $courseId = $this->createTestCourse(['title_bn' => '', 'title_en' => 'Paid Course', 'cover_image' => '/uploads/course.jpg']);
        $paymentId = $this->insertPaymentRequest($studentId, $courseId, 'approved');
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $studentId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'success',
            'amount' => 500,
            'transaction_id' => 'TXN123456',
            'payment_method' => 'bkash',
        ])->execute();
        $this->authenticateAs($adminId, 'admin');
        Yii::$app->request->queryParams = ['pid' => $paymentId];

        $controller = new \app\modules\api\controllers\PaymentsController('payments', Yii::$app, []);
        $result = $controller->actionComplete();

        $this->assertSame('course_completed', $result->data['enrollment_status']);
        $this->assertSame(1, (int) Yii::$app->db->createCommand(
            'SELECT COUNT(*) FROM notifications WHERE user_id = :uid AND title_en = :title',
            [':uid' => $studentId, ':title' => 'Course completed']
        )->queryScalar());
        $studentNotification = Yii::$app->db->createCommand(
            'SELECT image_url FROM notifications WHERE user_id = :uid AND title_en = :title',
            [':uid' => $studentId, ':title' => 'Course completed']
        )->queryOne();
        $this->assertSame('/uploads/course.jpg', $studentNotification['image_url']);
        $this->assertSame(1, (int) Yii::$app->db->createCommand(
            'SELECT COUNT(*) FROM notifications WHERE user_id = :uid AND title_en = :title',
            [':uid' => $adminId, ':title' => 'Course marked complete']
        )->queryScalar());
    }

    private function insertPaymentRequest(string $studentId, string $courseId, string $status = 'pending'): string
    {
        $id = Uuid::v4();
        Yii::$app->db->createCommand()->insert('payment_requests', [
            'id' => $id,
            'user_id' => $studentId,
            'user_name' => 'Test User',
            'user_email' => 'student@example.com',
            'user_phone' => '',
            'course_id' => $courseId,
            'course_title' => 'Paid Course',
            'transaction_id' => 'TXN123456',
            'payment_method' => 'bkash',
            'amount' => 500,
            'note' => '',
            'status' => $status,
            'submitted_ip' => '127.0.0.1',
            'submitted_at' => Time::now(),
            'processed_at' => null,
            'processed_by' => '',
        ])->execute();
        return $id;
    }
}
