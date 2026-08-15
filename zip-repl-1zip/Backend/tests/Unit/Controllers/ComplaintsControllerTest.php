<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for ComplaintsController — student submit + admin list/resolve.
 */
class ComplaintsControllerTest extends ApiControllerTestCase
{
    public function testGetListRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGetListReturnsEmptyWhenNoComplaints(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testGetListReturnsComplaints(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('complaints', [
            'id' => Uuid::v4(),
            'user_id' => $adminId,
            'user_name' => 'Admin User',
            'subject' => 'Issue with course',
            'message' => 'Course is not working.',
            'status' => 'pending',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Issue with course', $data[0]['subject']);
    }

    public function testPostCreatesComplaint(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'subject' => 'Payment not working',
            'message' => 'I paid but not enrolled.',
        ]);

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        // Verify it was actually inserted
        $row = Yii::$app->db->createCommand(
            'SELECT * FROM complaints WHERE user_id = :uid', [':uid' => $userId]
        )->queryOne();
        $this->assertSame('Payment not working', $row['subject']);
        $this->assertSame('I paid but not enrolled.', $row['message']);
        $this->assertSame('pending', $row['status']);
    }

    public function testPostRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody(['subject' => 'No auth']);

        try {
            $controller->actionIndex();
            $this->fail('Expected 401');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(401, $e->statusCode);
        }
    }

    public function testResolveRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);

        try {
            $controller->actionResolve('some-id');
            $this->fail('Expected 401');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }
}
