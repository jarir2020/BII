<?php

declare(strict_types=1);

namespace app\tests\Unit;

use app\models\User;
use Yii;
use yii\helpers\Json;

/**
 * Unit tests for AuthController API endpoints.
 * Uses SQLite test database.
 */
final class AuthTest extends \PHPUnit\Framework\TestCase
{
    protected function setUp(): void
    {
        // Set up test environment - SQLite will be used
        putenv('YII_ENV=test');
    }

    public function testCanRegisterUser(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Test registration with valid data
        $result = Yii::$app->getModules()['api']->authController->actionRegister();

        // Should return user data and token
        $data = $result->data;
        self::assertArrayHasKey('ok', $data);
        self::assertArrayHasKey('user', $data);
        self::assertArrayHasKey('token', $data);
    }

    public function testRegistrationValidatesEmail(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Test with invalid email
        $body = ['email' => 'invalid-email', 'name' => 'Test User', 'password' => '1234567'];
        $_POST = $body;
        // No cookie manipulation needed

        // This should fail validation
        try {
            Yii::$app->getModules()['api']->authController->actionRegister();
            self::fail('Expected badRequest exception');
        } catch (\yii\web\HttpException $e) {
            self::assertEquals(400, $e->statusCode);
        }
    }

    public function testRegistrationValidatesPasswordLength(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Test with password too short
        $body = ['email' => 'test@example.com', 'name' => 'Test User', 'password' => '123'];
        $_POST = $body;

        try {
            Yii::$app->getModules()['api']->authController->actionRegister();
            self::fail('Expected badRequest exception');
        } catch (\yii\web\HttpException $e) {
            self::assertEquals(400, $e->statusCode);
        }
    }

    public function testLoginSuccessful(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // First register a user
        $body = ['email' => 'testlogin@example.com', 'name' => 'Test Login', 'password' => 'password123'];
        $_POST = $body;
        Yii::$app->getModules()['api']->authController->actionRegister();

        // Now login
        $body = ['email' => 'testlogin@example.com', 'password' => 'password123'];
        $_POST = $body;

        try {
            $result = Yii::$app->getModules()['api']->authController->actionLogin();
            $data = $result->data;
            self::assertArrayHasKey('ok', $data);
            self::assertArrayHasKey('user', $data);
            self::assertArrayHasKey('token', $data);
        } catch (\yii\web\HttpException $e) {
            self::fail('Login should succeed: ' . $e->message);
        }
    }

    public function testLoginInvalidCredentials(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Try login with wrong password
        $body = ['email' => 'testlogin@example.com', 'password' => 'wrongpassword'];
        $_POST = $body;

        try {
            Yii::$app->getModules()['api']->authController->actionLogin();
            self::fail('Expected unauthorized exception');
        } catch (\yii\web\HttpException $e) {
            self::assertEquals(401, $e->statusCode);
        }
    }

    public function testMeEndpoint(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Test me endpoint (requires auth)
        try {
            $result = Yii::$app->getModules()['api']->authController->actionMe();
            $data = $result->data;
            self::assertArrayHasKey('id', $data);
            self::assertArrayHasKey('email', $data);
        } catch (\yii\web\HttpException $e) {
            // Expected if not authenticated - should get 401
            self::assertEquals(401, $e->statusCode);
        }
    }

    public function testForgotPassword(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Test forgot password with registered user
        $body = ['email' => 'testlogin@example.com'];
        $_POST = $body;

        try {
            $result = Yii::$app->getModules()['api']->authController->actionForgotPassword();
            $data = $result->data;
            self::assertArrayHasKey('ok', $data);
        } catch (\yii\web\HttpException $e) {
            self::fail('Forgot password should succeed for registered user: ' . $e->message);
        }
    }

    public function testResetPassword(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // First forgot password
        $body = ['email' => 'testlogin@example.com'];
        $_POST = $body;
        Yii::$app->getModules()['api']->authController->actionForgotPassword();

        // Now reset password with OTP
        $body = ['email' => 'testlogin@example.com', 'otp' => '123456', 'new_password' => 'newpass123'];
        $_POST = $body;

        try {
            $result = Yii::$app->getModules()['api']->authController->actionResetPassword();
            $data = $result->data;
            self::assertArrayHasKey('ok', $data);
        } catch (\yii\web\HttpException $e) {
            self::fail('Reset password should succeed: ' . $e->message);
        }
    }
}
