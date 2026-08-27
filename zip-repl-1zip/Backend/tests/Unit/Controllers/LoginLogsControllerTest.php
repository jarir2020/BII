<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

final class LoginLogsControllerTest extends ApiControllerTestCase
{
    public function testAdminCanListLoginLogsWithBooleanStatus(): void
    {
        $adminId = $this->createAdminUser('logs-admin@example.com');
        $this->authenticateAs($adminId, 'admin');
        Yii::$app->db->createCommand()->insert('login_logs', [
            'id' => Uuid::v4(),
            'user_id' => $adminId,
            'email' => 'logs-admin@example.com',
            'name' => 'Logs Admin',
            'role' => 'admin',
            'ip' => '127.0.0.1',
            'success' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\LoginLogsController('login-logs', Yii::$app, []);
        $data = $controller->actionIndex()->data;

        $this->assertCount(1, $data);
        $this->assertTrue($data[0]['success']);
        $this->assertSame('logs-admin@example.com', $data[0]['email']);
    }
}
