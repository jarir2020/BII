<?php

declare(strict_types=1);

namespace app\tests\Unit;

use Yii;

/**
 * Unit tests for LiveClassesController API endpoints.
 * Uses SQLite test database - no live DB connections.
 */
final class LiveClassesTest extends \PHPUnit\Framework\TestCase
{
    protected function setUp(): void
    {
        putenv('YII_ENV=test');
    }

    public function testMyLiveClassesReturnsEmptyWhenNoEnrollments(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // User with no enrollments should get empty array
        $user = (object) ['id' => 1, 'role' => 'student'];
        $_SESSION['identity'] = $user;

        $result = Yii::$app->getModules()['api']->liveClassesController->actionMy();
        $data = $result->data;
        self::assertIsArray($data);
        self::assertEmpty($data);
    }

    public function testMyLiveClassesReturnsClassesForEnrolledCourses(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        // Create a user and enroll them in a course
        $user = User::findById(1) ?? User::newId();
        // Insert test user
        Yii::$app->db->createCommand()->insert('users', [
            'id' => 1,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password_hash' => Yii::$app->jwt->hashPassword('password123'),
            'role' => 'student',
            'student_id' => 'TEST001',
            'phone' => '',
            'address' => '',
            'profile_photo' => '',
            'created_at' => Yii::$app->Time::now(),
        ])->execute();

        // Insert enrollment
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => 1,
            'user_id' => 1,
            'course_id' => 1,
            'enrolled_at' => Yii::$app->Time::now(),
        ])->execute();

        // Insert a live class
        Yii::$app->db->createCommand()->insert('live_classes', [
            'id' => 1,
            'title_bn' => 'টেস্ট ক্লাস',
            'title_en' => 'Test Class',
            'join_url' => 'https://zoom.us/j/1234567890',
            'scheduled_at' => date('Y-m-d H:i:s'),
            'description' => 'Test description',
            'course_id' => 1,
            'is_free' => true,
        ])->execute();

        // Test my live classes
        $_SESSION['identity'] = (object) ['id' => 1, 'role' => 'student'];
        $result = Yii::$app->getModules()['api']->liveClassesController->actionMy();
        $data = $result->data;
        self::assertIsArray($data);
        self::assertCount(1, $data);
        self::assertEquals('https://zoom.us/j/1234567890', $data[0]['join_url']);
    }

    public function testPostProcessRejectsBengaliJoinUrl(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        $controller = new \app\modules\api\controllers\LiveClassesController(
            'live-classes',
            Yii::$app,
            Yii::$app->mailer
        );

        $data = ['join_url' => '/%E0%A6%95%E0%A7%8D%E0%A6%B2%E0%A6%BE%E0%A6%B8'];
        $controller->postProcess($data);

        // Should reject Bengali-encoded URL
        self::assertEquals('', $data['join_url']);
    }

    public function testPostProcessAcceptsValidHttpsUrl(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        $controller = new \app\modules\api\controllers\LiveClassesController(
            'live-classes',
            Yii::$app,
            Yii::$app->mailer
        );

        $data = ['join_url' => 'https://zoom.us/j/1234567890'];
        $controller->postProcess($data);

        // Should accept valid HTTPS URL
        self::assertEquals('https://zoom.us/j/1234567890', $data['join_url']);
    }

    public function testPostProcessAcceptsValidHttpUrl(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        $controller = new \app\modules\api\controllers\LiveClassesController(
            'live-classes',
            Yii::$app,
            Yii::$app->mailer
        );

        $data = ['join_url' => 'http://example.com/live'];
        $controller->postProcess($data);

        // Should accept valid HTTP URL
        self::assertEquals('http://example.com/live', $data['join_url']);
    }

    public function testPostProcessRejectsEmptyUrl(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        $controller = new \app\modules\api\controllers\LiveClassesController(
            'live-classes',
            Yii::$app,
            Yii::$app->mailer
        );

        $data = ['join_url' => ''];
        $controller->postProcess($data);

        // Should keep empty URL
        self::assertEquals('', $data['join_url']);
    }

    public function testPostProcessRejectsNonHttpScheme(): void
    {
        $app = new \yii\web\Application(require __DIR__ . '/../../config/test.php');
        $app->run();

        $controller = new \app\modules\api\controllers\LiveClassesController(
            'live-classes',
            Yii::$app,
            Yii::$app->mailer
        );

        $data = ['join_url' => 'ftp://example.com/file'];
        $controller->postProcess($data);

        // Should reject non-http schemes
        self::assertEquals('', $data['join_url']);
    }
}