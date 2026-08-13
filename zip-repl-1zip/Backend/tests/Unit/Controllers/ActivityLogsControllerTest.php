<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for ActivityLogsController — admin activity log listing.
 */
final class ActivityLogsControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ActivityLogsController('activity-logs', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testIndexReturnsEmptyWhenNoLogs(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ActivityLogsController('activity-logs', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsLogs(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        // Create some activity logs
        for ($i = 0; $i < 3; $i++) {
            Yii::$app->db->createCommand()->insert('activity_logs', [
                'id' => Uuid::v4(),
                'user_id' => $adminId,
                'action' => 'login',
                'target' => 'web',
                'meta' => json_encode(['ip' => '127.0.0.1']),
                'created_at' => Time::now(),
            ])->execute();
        }

        $controller = new \app\modules\api\controllers\ActivityLogsController('activity-logs', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(3, $data);
        $this->assertArrayHasKey('meta', $data[0]);
        $this->assertIsArray($data[0]['meta']);
    }

    public function testIndexRespectsLimit(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        // Create 5 logs
        for ($i = 0; $i < 5; $i++) {
            Yii::$app->db->createCommand()->insert('activity_logs', [
                'id' => Uuid::v4(),
                'user_id' => $adminId,
                'action' => 'test',
                'created_at' => Time::now(),
            ])->execute();
        }

        $controller = new \app\modules\api\controllers\ActivityLogsController('activity-logs', Yii::$app, []);
        Yii::$app->request->setQueryParams(['limit' => '2']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
    }

    public function testMetaParsedFromJson(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('activity_logs', [
            'id' => Uuid::v4(),
            'user_id' => $adminId,
            'action' => 'enroll',
            'target' => 'course-123',
            'meta' => json_encode(['course_id' => 'course-123', 'amount' => 500]),
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ActivityLogsController('activity-logs', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('course-123', $data[0]['meta']['course_id']);
        $this->assertSame(500, $data[0]['meta']['amount']);
    }
}
