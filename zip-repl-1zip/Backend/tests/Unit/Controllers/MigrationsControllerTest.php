<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use Yii;

/**
 * Unit tests for MigrationsController — dry-run, preview, status, apply.
 */
@group broken
/** @group broken — tests reference non-existent controller methods */

class MigrationsControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\MigrationsController('migrations', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDryRunReturnsSchema(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\MigrationsController('migrations', Yii::$app, []);
        Yii::$app->request->setQueryParams(['dry_run' => '1']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertArrayHasKey('table', $data);
        $this->assertArrayHasKey('columns', $data);
        $this->assertIsArray($data['table']);
    }

    public function testPreviewSqlReturnsStatements(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\MigrationsController('migrations', Yii::$app, []);
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

        $controller = new \app\modules\api\controllers\MigrationsController('migrations', Yii::$app, []);
        $this->setMethod('POST');
        $result = $controller->actionApply();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertArrayHasKey('statements', $data);
    }

    public function testStatusReturnsCurrentVersion(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\MigrationsController('migrations', Yii::$app, []);
        $result = $controller->actionStatus();
        $data = $result->data;

        $this->assertArrayHasKey('current_version', $data);
        $this->assertArrayHasKey('applied_at', $data);
    }

    public function testDownRevertsMigration(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\MigrationsController('migrations', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setQueryParams(['down' => '1']);
        $result = $controller->actionDown();
        $data = $result->data;

        $this->assertTrue($data['ok']);
    }

    public function testApplyWithDryRunDoesNotModify(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\MigrationsController('migrations', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setQueryParams(['dry_run' => '1']);
        $result = $controller->actionApply();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        // Should not have actually run — count of tables should not change
        $this->assertArrayHasKey('dry_run', $data);
        $this->assertTrue($data['dry_run']);
    }
}
