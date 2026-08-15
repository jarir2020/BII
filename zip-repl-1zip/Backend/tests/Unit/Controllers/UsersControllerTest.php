<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for UsersController — user management (teacher/student/admin profiles).
 */

class UsersControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsUsers(): void
    {
        Yii::$app->db->createCommand()->insert('users', [
            'id' => Uuid::v4(),
            'name' => 'Student User',
            'email' => 'stu@example.com',
            'password_hash' => 'hash',
            'role' => 'student',
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('users', [
            'id' => Uuid::v4(),
            'name' => 'Teacher User',
            'email' => 'tch@example.com',
            'password_hash' => 'hash',
            'role' => 'teacher',
            'is_active' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\UsersController('users', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
    }

}
