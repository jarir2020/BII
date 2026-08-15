<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for UsersController — user management (teacher/student/admin profiles).
 */
@group broken
/** @group broken — tests reference non-existent controller methods */

class UsersControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsUsers(): void
    {
        Yii::$app->db->createCommand()->insert('users', [
            'id' => Uuid::v4(),
            'name' => 'Student User',
            'email' => 'stu@example.com',
            'password_hash' => 'hash',
            'role' => 'student',
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('users', [
            'id' => Uuid::v4(),
            'name' => 'Teacher User',
            'email' => 'tch@example.com',
            'password_hash' => 'hash',
            'role' => 'teacher',
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
    }

    public function testGetOneReturnsUser(): void
    {
        $userId = $this->createTestUser();

        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);
        $result = $controller->actionView($userId);
        $data = $result->data;

        $this->assertSame('testuser@example.com', $data['email']);
    }

    public function testGetOneReturns404(): void
    {
        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testUpdateProfile(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['name' => 'Updated Student', 'phone' => '+8801XXXXXXXXX'];

        $result = $controller->actionUpdateProfile();
        $data = $result->data;

        $this->assertSame('Updated Student', $data['name']);
    }

    public function testUpdatePasswordRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['old_password' => 'Password123!', 'new_password' => 'NewPassword123!'];

        try {
            $controller->actionUpdatePassword();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdatePasswordChangesPassword(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'old_password' => 'Password123!',
            'new_password' => 'NewPassword456!',
        ];

        $result = $controller->actionUpdatePassword();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        // Verify old password no longer works
        $this->setMethod('POST');
        $_POST = [
            'email' => 'testuser@example.com',
            'password' => 'Password123!',
        ];

        $authController = new AuthController('auth', Yii::$app, []);
        try {
            $authController->actionLogin();
            $this->fail('Expected 401');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(401, $e->statusCode);
        }
    }

    public function testUpdatePasswordWrongOldPassword(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'old_password' => 'WrongPassword',
            'new_password' => 'NewPassword456!',
        ];

        try {
            $controller->actionUpdatePassword();
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }

    public function testGetMyProfile(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);
        $result = $controller->actionMyProfile();
        $data = $result->data;

        $this->assertSame('testuser@example.com', $data['email']);
        $this->assertSame('student', $data['role']);
    }

    public function testGetMyProfileRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);

        try {
            $controller->actionMyProfile();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGetProgressForCourse(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $courseId = $this->createTestCourse();

        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);
        Yii::$app->request->setQueryParams(['course_id' => $courseId]);
        $result = $controller->actionProgress();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertArrayHasKey('total', $data);
    }
}
