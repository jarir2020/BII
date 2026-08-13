<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for BackupController — database backup and restore.
 */
final class BackupControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\BackupController('backup', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testIndexReturnsEmpty(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\BackupController('backup', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testCreateCreatesBackup(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        // Add some data to back up
        Yii::$app->db->createCommand()->insert('users', [
            'id' => Uuid::v4(),
            'name' => 'Backup User',
            'email' => 'backup@example.com',
            'password_hash' => 'hash',
            'role' => 'student',
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\BackupController('backup', Yii::$app, []);
        $result = $controller->actionCreate();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertArrayHasKey('backup_path', $data);
        $this->assertStringContainsString('.sql', $data['backup_path']);
    }

    public function testDeleteBackupRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\BackupController('backup', Yii::$app, []);

        try {
            $controller->actionDelete('some-backup.sql');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDownloadRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\BackupController('backup', Yii::$app, []);

        try {
            $controller->actionDownload('backup.sql');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }
}
