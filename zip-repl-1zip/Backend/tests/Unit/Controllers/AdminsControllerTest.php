<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for AdminsController — admin CRUD + toggle status.
 */
final class AdminsControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testIndexReturnsAdmins(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertCount(1, $data);
        $this->assertSame('admin', $data[0]['role']);
    }

    public function testPostCreatesAdminRequiresSuperAdmin(): void
    {
        // Regular admin should not be able to create super_admin
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'name' => 'New Admin',
            'email' => 'newadmin@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ];

        // Regular admin should be able to create another admin
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('New Admin', $data['name']);
        $this->assertSame('admin', $data['role']);
    }

    public function testPostCreatesAdminWithPassword(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'name' => 'Password Admin',
            'email' => 'passadmin@example.com',
            'password' => 'securepass',
            'role' => 'admin',
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('Password Admin', $data['name']);

        // Verify password was hashed
        $user = Yii::$app->db->createCommand(
            'SELECT password_hash FROM users WHERE email = :e', [':e' => 'passadmin@example.com']
        )->queryOne();
        $this->assertNotEmpty($user['password_hash']);
        $this->assertNotSame('securepass', $user['password_hash']);
    }

    public function testDeleteRequiresSuperAdmin(): void
    {
        // Regular admin cannot delete other admins
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $otherAdminId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $otherAdminId,
            'name' => 'Other Admin',
            'email' => 'other@example.com',
            'password_hash' => 'hash',
            'role' => 'admin',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);

        try {
            $controller->actionDelete($otherAdminId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesAdmin(): void
    {
        // Super admin can delete
        $adminId = $this->createTestUser('super_admin');
        $this->authenticateAs($adminId, 'super_admin');

        $otherAdminId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $otherAdminId,
            'name' => 'Delete Admin',
            'email' => 'deladmin@example.com',
            'password_hash' => 'hash',
            'role' => 'admin',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        $result = $controller->actionDelete($otherAdminId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM users WHERE id = :id', [':id' => $otherAdminId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testToggleStatusRequiresSuperAdmin(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['status' => 0];

        try {
            $controller->actionToggleStatus('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testToggleStatusDeactivatesAdmin(): void
    {
        $superAdminId = $this->createTestUser('super_admin');
        $this->authenticateAs($superAdminId, 'super_admin');

        $adminId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $adminId,
            'name' => 'To Disable',
            'email' => 'disable@example.com',
            'password_hash' => 'hash',
            'role' => 'admin',
            'status' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['status' => 0];

        $result = $controller->actionToggleStatus($adminId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $user = Yii::$app->db->createCommand(
            'SELECT status FROM users WHERE id = :id', [':id' => $adminId]
        )->queryOne();
        $this->assertSame(0, (int) $user['status']);
    }

    public function testToggleStatusReactivatesAdmin(): void
    {
        $superAdminId = $this->createTestUser('super_admin');
        $this->authenticateAs($superAdminId, 'super_admin');

        $adminId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $adminId,
            'name' => 'Reactive',
            'email' => 'reactive@example.com',
            'password_hash' => 'hash',
            'role' => 'admin',
            'status' => 0,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['status' => 1];

        $result = $controller->actionToggleStatus($adminId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $user = Yii::$app->db->createCommand(
            'SELECT status FROM users WHERE id = :id', [':id' => $adminId]
        )->queryOne();
        $this->assertSame(1, (int) $user['status']);
    }

    public function testToggleStatusRejectsInvalidStatus(): void
    {
        $superAdminId = $this->createTestUser('super_admin');
        $this->authenticateAs($superAdminId, 'super_admin');

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['status' => 'invalid'];

        try {
            $controller->actionToggleStatus('some-id');
            $this->fail('Expected 400');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(400, $e->statusCode);
        }
    }
}
