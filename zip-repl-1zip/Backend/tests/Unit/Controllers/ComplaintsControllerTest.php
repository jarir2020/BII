<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for ComplaintsController — ticket CRUD + assignment + status changes.
 */
final class ComplaintsControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
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

    public function testIndexReturnsEmptyWhenNoComplaints(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsComplaints(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('complaints', [
            'id' => Uuid::v4(),
            'user_id' => $adminId,
            'subject' => 'Issue with course',
            'description' => 'Course is not working.',
            'status' => 'open',
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
        Yii::$app->request->isPost = true;
        $_POST = [
            'subject' => 'Payment not working',
            'description' => 'I paid but not enrolled.',
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('Payment not working', $data['subject']);
        $this->assertSame('open', $data['status']);
        $this->assertSame($userId, $data['user_id']);
    }

    public function testPostRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['subject' => 'No auth'];

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);

        try {
            $controller->actionDelete('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesComplaint(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $complaintId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('complaints', [
            'id' => $complaintId,
            'user_id' => $adminId,
            'subject' => 'To delete',
            'status' => 'open',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        $result = $controller->actionDelete($complaintId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM complaints WHERE id = :id', [':id' => $complaintId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testAssignRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['to_user_id' => 'admin-id'];

        try {
            $controller->actionAssign('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testAssignToUser(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $complaintId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('complaints', [
            'id' => $complaintId,
            'user_id' => $adminId,
            'subject' => 'Assign test',
            'status' => 'open',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['to_user_id' => $adminId];

        $result = $controller->actionAssign($complaintId);
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame('assigned', $data['status']);
        $this->assertSame($adminId, $data['to_user_id']);
    }

    public function testSetStatusValidatesStatus(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['status' => 'invalid_status'];

        try {
            $controller->actionSetStatus('some-id');
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }

    public function testSetStatusChangesStatus(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $complaintId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('complaints', [
            'id' => $complaintId,
            'user_id' => $adminId,
            'subject' => 'Status test',
            'status' => 'open',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['status' => 'resolved'];

        $result = $controller->actionSetStatus($complaintId);
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame('resolved', $data['status']);
    }

    public function testSetStatusMissingComplaint(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['status' => 'resolved'];

        try {
            $controller->actionSetStatus('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testReplyAddsReply(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $complaintId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('complaints', [
            'id' => $complaintId,
            'user_id' => $adminId,
            'subject' => 'Reply test',
            'status' => 'open',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['reply' => 'We have resolved the issue.'];

        $result = $controller->actionReply($complaintId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $reply = Yii::$app->db->createCommand(
            'SELECT id FROM complaint_replies WHERE complaint_id = :c',
            [':c' => $complaintId]
        )->queryOne();
        $this->assertNotFalse($reply);
    }

    public function testMyComplaintsReturnsUserComplaints(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('complaints', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'subject' => 'My complaint',
            'status' => 'open',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\ComplaintsController('complaints', Yii::$app, []);
        $result = $controller->actionMyComplaints();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('My complaint', $data[0]['subject']);
    }
}
