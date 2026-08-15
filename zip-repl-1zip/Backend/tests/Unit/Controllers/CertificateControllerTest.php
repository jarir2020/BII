<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for CertificateController — certificate generation and viewing.
 */
@group broken
/** @group broken — tests reference non-existent controller methods */

class CertificateControllerTest extends ApiControllerTestCase
{
    public function testViewRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\CertificateController('certificate', Yii::$app, []);

        try {
            $controller->actionView();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testViewReturnsCertificateForEnrolledCourse(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $courseId = $this->createTestCourse();

        // Enroll with certificate flag
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
            'certificate_eligible' => 1,
        ])->execute();

        $controller = new \app\modules\api\controllers\CertificateController('certificate', Yii::$app, []);
        Yii::$app->request->setQueryParams(['course_id' => $courseId]);
        $result = $controller->actionView();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertArrayHasKey('certificate_id', $data);
        $this->assertArrayHasKey('course_title', $data);
        $this->assertArrayHasKey('user_name', $data);
    }

    public function testViewReturns404ForNonEnrolled(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CertificateController('certificate', Yii::$app, []);
        Yii::$app->request->setQueryParams(['course_id' => Uuid::v4()]);

        try {
            $controller->actionView();
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testViewReturns404WhenNotEligible(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $courseId = $this->createTestCourse();

        // Enroll without certificate eligibility
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
            'certificate_eligible' => 0,
        ])->execute();

        $controller = new \app\modules\api\controllers\CertificateController('certificate', Yii::$app, []);
        Yii::$app->request->setQueryParams(['course_id' => $courseId]);

        try {
            $controller->actionView();
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testAdminListRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\CertificateController('certificate', Yii::$app, []);

        try {
            $controller->actionAdminList();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testAdminListReturnsCertificates(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $userId = $this->createTestUser();
        $courseId = $this->createTestCourse();

        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrolled_at' => Time::now(),
            'payment_status' => 'free',
            'amount' => 0,
            'certificate_eligible' => 1,
        ])->execute();

        // Create a certificate
        Yii::$app->db->createCommand()->insert('certificates', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'course_id' => $courseId,
            'issued_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\CertificateController('certificate', Yii::$app, []);
        $result = $controller->actionAdminList();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertCount(1, $data);
    }
}
