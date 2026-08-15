<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for MigrationsController — database migration operations.
 */
final class MigrationsStatusTest extends ApiControllerTestCase
{
    public function testStatusReturnsCurrentVersion(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new MigrationsController('migrations', Yii::$app, []);
        $result = $controller->actionStatus();
        $data = $result->data;

        $this->assertArrayHasKey('current_version', $data);
        $this->assertArrayHasKey('applied_at', $data);
        $this->assertArrayHasKey('migrations', $data);
    }

    public function testStatusReturnsMigrationList(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new MigrationsController('migrations', Yii::$app, []);
        $result = $controller->actionStatus();
        $data = $result->data;

        $this->assertIsArray($data['migrations']);
    }

    public function testDryRunReturnsSchema(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new MigrationsController('migrations', Yii::$app, []);
        Yii::$app->request->setQueryParams(['dry_run' => '1']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertArrayHasKey('table', $data);
        $this->assertIsArray($data['table']);
    }

    public function testPreviewReturnsSqlStatements(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new MigrationsController('migrations', Yii::$app, []);
        Yii::$app->request->setQueryParams(['preview' => '1']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertArrayHasKey('statements', $data);
        $this->assertIsArray($data['statements']);
    }

    public function testApplyRunsMigration(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new MigrationsController('migrations', Yii::$app, []);
        $this->setMethod('POST');
        $result = $controller->actionApply();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertArrayHasKey('statements', $data);
    }

    public function testDownRevertsMigration(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new MigrationsController('migrations', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setQueryParams(['down' => '1']);
        $result = $controller->actionDown();
        $data = $result->data;

        $this->assertTrue($data['ok']);
    }
}
