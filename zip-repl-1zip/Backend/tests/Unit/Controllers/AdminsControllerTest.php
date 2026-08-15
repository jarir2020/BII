<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for AdminsController — super_admin CRUD.
 */
final class AdminsControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresSuperAdmin(): void
    {
        $userId = $this->createTestUser('admin');
        $this->authenticateAs($userId, 'admin');

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
        $superAdminId = $this->createTestUser('super_admin');
        $this->authenticateAs($superAdminId, 'super_admin');

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
    }

    public function testPostCreatesAdminRequiresSuperAdmin(): void
    {
        $userId = $this->createTestUser('admin');
        $this->authenticateAs($userId, 'admin');

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'name' => 'New Admin',
            'email' => 'newadmin@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesAdmin(): void
    {
        $superAdminId = $this->createTestUser('super_admin');
        $this->authenticateAs($superAdminId, 'super_admin');

        $controller = new \app\modules\api\controllers\AdminsController('admins', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'name' => 'New Admin',
            'email' => 'newadmin@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('New Admin', $data['name']);

        // Verify password was hashed
        $user = Yii::$app->db->createCommand(
            'SELECT password_hash FROM users WHERE email = :e', [':e' => 'newadmin@example.com']
        )->queryOne();
        $this->assertNotEmpty($user['password_hash']);
        $this->assertNotSame('password123', $user['password_hash']);
    }

    public function testDeleteRequiresSuperAdmin(): void
    {
        $userId = $this->createTestUser('admin');
        $this->authenticateAs($userId, 'admin');

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
        $superAdminId = $this->createTestUser('super_admin');
        $this->authenticateAs($superAdminId, 'super_admin');

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
}
