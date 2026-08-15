<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for TeachersController — teacher CRUD.
 */
final class TeachersControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testIndexReturnsEmptyWhenNoTeachers(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsTeachers(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $teacherId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $teacherId,
            'name' => 'Shajed Ali',
            'email' => 'shajed@example.com',
            'password_hash' => 'some-hash',
            'role' => 'teacher',
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('teachers', [
            'id' => $teacherId,
            'specialization' => 'Quran',
            'experience_years' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Shajed Ali', $data[0]['name']);
        $this->assertSame('Quran', $data[0]['specialization']);
    }

    public function testPostCreatesTeacherRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody(['name' => 'New Teacher']);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesTeacher(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'name' => 'New Teacher',
            'email' => 'newteacher@example.com',
            'password' => 'password123',
            'specialization' => 'Fiqh',
        ]);

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('New Teacher', $data['name']);
        $this->assertSame('teacher', $data['role']);
        $this->assertSame('Fiqh', $data['specialization']);
        $this->assertArrayHasKey('id', $data);
    }

    public function testViewReturnsTeacher(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $teacherId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $teacherId,
            'name' => 'View Teacher',
            'email' => 'view@example.com',
            'password_hash' => 'hash',
            'role' => 'teacher',
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('teachers', [
            'id' => $teacherId,
            'specialization' => 'Hadith',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);
        $result = $controller->actionView($teacherId);
        $data = $result->data;

        $this->assertSame('View Teacher', $data['name']);
        $this->assertSame('Hadith', $data['specialization']);
    }

    public function testViewReturns404ForMissing(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $teacherId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $teacherId,
            'name' => 'Delete Teacher',
            'email' => 'del@example.com',
            'password_hash' => 'hash',
            'role' => 'teacher',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);
        $this->setMethod('DELETE');

        try {
            $controller->actionView($teacherId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesTeacher(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $teacherId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $teacherId,
            'name' => 'Delete Teacher',
            'email' => 'del@example.com',
            'password_hash' => 'hash',
            'role' => 'teacher',
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('teachers', [
            'id' => $teacherId,
            'specialization' => 'Fiqh',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);
        $this->setMethod('DELETE');
        $result = $controller->actionView($teacherId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM users WHERE id = :id', [':id' => $teacherId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testUpdateRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $teacherId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $teacherId,
            'name' => 'Update Teacher',
            'email' => 'upd@example.com',
            'password_hash' => 'hash',
            'role' => 'teacher',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['name' => 'Updated Name']);

        try {
            $controller->actionView($teacherId);
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testUpdateTeacher(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $teacherId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $teacherId,
            'name' => 'Update Teacher',
            'email' => 'upd@example.com',
            'password_hash' => 'hash',
            'role' => 'teacher',
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('teachers', [
            'id' => $teacherId,
            'specialization' => 'Fiqh',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\TeachersController('teachers', Yii::$app, []);
        $this->setMethod('PUT');
        $this->setBody(['name' => 'Updated Name']);

        $result = $controller->actionView($teacherId);
        $data = $result->data;

        $this->assertSame('Updated Name', $data['name']);
        $this->assertSame($teacherId, $data['id']);
    }
}
