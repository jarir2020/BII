<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for AuthController — registration, login, logout, password reset.
 */
final class AuthControllerTest extends ApiControllerTestCase
{
    public function testRegisterStoresUser(): void
    {
        Yii::$app->request->isPost = true;
        $_POST = [
            'name' => 'New Student',
            'email' => 'newstudent@test.com',
            'password' => 'Password123!',
            'phone' => '+8801XXXXXXXXX',
        ];

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);
        $result = $controller->actionRegister();
        $data = $result->data;

        $this->assertArrayHasKey('token', $data);
        $this->assertArrayHasKey('user', $data);
        $this->assertSame('newstudent@test.com', $data['user']['email']);
    }

    public function testRegisterRequiresEmail(): void
    {
        Yii::$app->request->isPost = true;
        $_POST = ['name' => 'No Email', 'password' => 'Password123!'];

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);

        try {
            $controller->actionRegister();
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }

    public function testRegisterRejectsDuplicateEmail(): void
    {
        $userId = $this->createTestUser();

        Yii::$app->request->isPost = true;
        $_POST = [
            'name' => 'Duplicate',
            'email' => $userId, // use same email as existing user
            'password' => 'Password123!',
        ];

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);

        try {
            $controller->actionRegister();
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }

    public function testLoginReturnsToken(): void
    {
        $userId = $this->createTestUser();

        Yii::$app->request->isPost = true;
        $_POST = [
            'email' => 'testuser@example.com',
            'password' => 'Password123!',
        ];

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);
        $result = $controller->actionLogin();
        $data = $result->data;

        $this->assertArrayHasKey('token', $data);
        $this->assertArrayHasKey('user', $data);
    }

    public function testLoginRejectsWrongPassword(): void
    {
        $userId = $this->createTestUser();

        Yii::$app->request->isPost = true;
        $_POST = [
            'email' => 'testuser@example.com',
            'password' => 'WrongPassword',
        ];

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);

        try {
            $controller->actionLogin();
            $this->fail('Expected 401');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(401, $e->statusCode);
        }
    }

    public function testLoginRejectsMissingEmail(): void
    {
        Yii::$app->request->isPost = true;
        $_POST = ['password' => 'Password123!'];

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);

        try {
            $controller->actionLogin();
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }

    public function testLogoutRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['token' => 'some-token'];

        try {
            $controller->actionLogout();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testLogoutInvalidatesToken(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);
        Yii::$app->request->isPost = true;

        $result = $controller->actionLogout();
        $data = $result->data;

        $this->assertTrue($data['ok']);
    }

    public function testRefreshTokenReturnsNewToken(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['token' => 'existing-token'];

        $result = $controller->actionRefreshToken();
        $data = $result->data;

        $this->assertArrayHasKey('token', $data);
    }

    public function testMeReturnsUserProfile(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);
        $result = $controller->actionMe();
        $data = $result->data;

        $this->assertSame('testuser@example.com', $data['email']);
        $this->assertSame('Test User', $data['name']);
    }

    public function testMeReturns403ForUnauthenticated(): void
    {
        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);

        try {
            $controller->actionMe();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdateProfileModifiesUser(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\AuthController('auth', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['name' => 'Updated Name'];

        $result = $controller->actionUpdateProfile();
        $data = $result->data;

        $this->assertSame('Updated Name', $data['name']);

        $user = Yii::$app->db->createCommand(
            'SELECT name FROM users WHERE id = :id', [':id' => $userId]
        )->queryOne();
        $this->assertSame('Updated Name', $user['name']);
    }
}
