<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for NotificationsController — notifications + push + contact.
 */
final class NotificationsControllerTest extends ApiControllerTestCase
{
    public function testIndexListReturnsEmpty(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testPostCreatesNotificationRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['title_bn' => 'Test'];

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesNotification(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => ' পরীক্ষার সময়সূচী',
            'title_en' => 'Exam Schedule',
            'body_bn' => 'আগামীকাল পরীক্ষা',
            'body_en' => 'Exam tomorrow',
            'user_id' => '',
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame(' পরীক্ষার সময়সূচী', $data['title_bn']);
        $this->assertSame('Exam Schedule', $data['title_en']);
        $this->assertSame(0, (int) $data['read']);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T/', $data['created_at']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);

        try {
            $controller->actionDelete('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesNotification(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        // Create a notification
        $notifId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('notifications', [
            'id' => $notifId,
            'title_bn' => 'Test',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        $result = $controller->actionDelete($notifId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM notifications WHERE id = :id', [':id' => $notifId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testRegisterDeviceCreatesToken(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['token' => 'fcm-test-token-123', 'platform' => 'android'];

        $result = $controller->actionRegisterDevice();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM device_tokens WHERE token = :t AND user_id = :u',
            [':t' => 'fcm-test-token-123', ':u' => $userId]
        )->queryOne();
        $this->assertNotFalse($row);
    }

    public function testRegisterDeviceUpdatesExistingToken(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Create existing token
        Yii::$app->db->createCommand()->insert('device_tokens', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'token' => 'existing-token',
            'device_type' => 'ios',
            'platform' => 'ios',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['token' => 'existing-token', 'platform' => 'android'];

        $result = $controller->actionRegisterDevice();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT platform FROM device_tokens WHERE token = :t', [':t' => 'existing-token']
        )->queryOne();
        $this->assertSame('android', $row['platform']);
    }

    public function testRegisterDeviceRejectsEmptyToken(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['token' => '', 'platform' => 'android'];

        try {
            $controller->actionRegisterDevice();
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }

    public function testUnregisterDeviceRemovesToken(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Create token
        Yii::$app->db->createCommand()->insert('device_tokens', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'token' => 'remove-me',
            'device_type' => 'android',
            'platform' => 'android',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['token' => 'remove-me'];

        $result = $controller->actionUnregisterDevice();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM device_tokens WHERE token = :t', [':t' => 'remove-me']
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testContactPostSavesMessage(): void
    {
        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone' => '01700000000',
            'subject' => 'Help needed',
            'message' => 'I need assistance with my course.',
        ];

        $result = $controller->actionContact();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM contact_messages WHERE email = :e', [':e' => 'test@example.com']
        )->queryOne();
        $this->assertNotFalse($row);
    }

    public function testContactGetRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);

        try {
            $controller->actionContact();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPushRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['title_bn' => 'Test'];

        try {
            $controller->actionPush();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPushCreatesNotificationRecord(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => 'পুশ টেস্ট',
            'title_en' => 'Push Test',
            'body_bn' => 'শরতী পরীক্ষা',
            'body_en' => 'Midterm exam',
            'target' => 'all',
            'image_url' => '',
            'click_action' => '/',
        ];

        $result = $controller->actionPush();
        $data = $result->data;

        $this->assertSame('পুশ টেস্ট', $data['title_bn']);
        $this->assertSame('all', $data['target']);
        $this->assertSame('pending', $data['status']);
        $this->assertSame(0, (int) $data['sent_count']);
    }

    public function testPushParsesUserTarget(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => 'User Target',
            'target' => 'user:abc-123',
        ];

        $result = $controller->actionPush();
        $data = $result->data;

        $this->assertSame('user:abc-123', $data['target']);
        $this->assertSame('abc-123', $data['target_user_id']);
        $this->assertEmpty($data['target_course_id']);
    }

    public function testPushParsesCourseTarget(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => 'Course Target',
            'target' => 'course:course-123',
        ];

        $result = $controller->actionPush();
        $data = $result->data;

        $this->assertSame('course:course-123', $data['target']);
        $this->assertEmpty($data['target_user_id']);
        $this->assertSame('course-123', $data['target_course_id']);
    }

    public function testPushScheduledSetsStatus(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $futureTime = Time::addMinutes(Time::now(), 60);

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => 'Scheduled',
            'scheduled_for' => $futureTime,
        ];

        $result = $controller->actionPush();
        $data = $result->data;

        $this->assertSame('scheduled', $data['status']);
        $this->assertNotNull($data['scheduled_for']);
    }

    public function testPushDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);

        try {
            $controller->actionPushDelete('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPushResendNotFound(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);

        try {
            $controller->actionPushResend('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testProcessScheduledProcessesDueNotifications(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        // Create a scheduled notification in the past
        $pastTime = Time::addMinutes(Time::now(), -10);
        $notifId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('push_notifications', [
            'id' => $notifId,
            'title_bn' => 'Past Scheduled',
            'target' => 'all',
            'status' => 'scheduled',
            'scheduled_for' => $pastTime,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        $result = $controller->actionProcessScheduled();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        // At least 1 processed (the one we inserted)
        $this->assertGreaterThanOrEqual(1, $data['processed']);
    }

    public function testProcessScheduledSkipsNonScheduled(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        // Create a pending notification (not scheduled)
        Yii::$app->db->createCommand()->insert('push_notifications', [
            'id' => Uuid::v4(),
            'title_bn' => 'Pending',
            'target' => 'all',
            'status' => 'pending',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\NotificationsController('notifications', Yii::$app, []);
        $result = $controller->actionProcessScheduled();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame(0, $data['processed']);
    }
}
