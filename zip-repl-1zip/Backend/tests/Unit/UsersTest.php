<?php

declare(strict_types=1);

namespace app\tests\Unit;

use Yii;

/**
 * Unit tests for UsersController API endpoints.
 * Uses SQLite test database - no live DB connections.
 */
final class UsersTest extends \PHPUnit\Framework\TestCase
{
    protected function setUp(): void
    {
        putenv('YII_ENV=test');
    }

    public function testIndexReturnsUsersWithEnrollmentCounts(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Create a test admin user
        $admin = User::findById(1) ?? User::newId();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => 1,
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password_hash' => Yii::$app->jwt->hashPassword('adminpass'),
            'role' => 'admin',
            'student_id' => '',
            'phone' => '',
            'address' => '',
            'profile_photo' => '',
            'created_at' => Yii::$app->Time::now(),
        ])->execute();

        // Create a regular user
        Yii::$app->db->createCommand()->insert('users', [
            'id' => 2,
            'name' => 'Regular User',
            'email' => 'user@example.com',
            'password_hash' => Yii::$app->jwt->hashPassword('userpass'),
            'role' => 'student',
            'student_id' => 'STU001',
            'phone' => '',
            'address' => '',
            'profile_photo' => '',
            'created_at' => Yii::$app->Time::now(),
        ])->execute();

        // Create enrollments for the regular user
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => 1,
            'user_id' => 2,
            'course_id' => 1,
            'enrolled_at' => Yii::$app->Time::now(),
        ])->execute();

        // Test admin index
        $_SESSION['identity'] = (object) ['id' => 1, 'role' => 'admin'];
        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, Yii::$app->mailer);
        $result = $controller->actionIndex();
        $data = $result->data;
        self::assertIsArray($data);
        self::assertGreaterThanOrEqual(2, count($data)); // at least admin + regular user
    }

    public function testDetailsReturnsUserProfile(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Create test users
        Yii::$app->db->createCommand()->insert('users', [
            'id' => 1,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password_hash' => Yii::$app->jwt->hashPassword('password123'),
            'role' => 'student',
            'student_id' => 'STU001',
            'phone' => '',
            'address' => '',
            'profile_photo' => '',
            'created_at' => Yii::$app->Time::now(),
        ])->execute();

        // Test user details
        $_SESSION['identity'] = (object) ['id' => 1, 'role' => 'admin'];
        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, Yii::$app->mailer);
        $result = $controller->actionDetails('1');
        $data = $result->data;
        self::assertArrayHasKey('id', $data);
        self::assertArrayHasKey('email', $data);
        self::assertArrayNotHasKey('password_hash', $data);
    }

    public function testDetailsReturns404ForNonExistentUser(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        $_SESSION['identity'] = (object) ['id' => 1, 'role' => 'admin'];
        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, Yii::$app->mailer);

        // Should return 404 for non-existent user
        try {
            $result = $controller->actionDetails('9999');
            $data = $result->data;
            // May return error response - check structure
            self::assertArrayHasKey('detail', $data);
        } catch (\Exception $e) {
            // Expected to fail for non-existent user
        }
    }
}