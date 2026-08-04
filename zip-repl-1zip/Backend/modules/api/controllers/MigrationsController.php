<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Throwable;
use Yii;

/**
 * Apply pending DB migrations over HTTP (no SSH required).
 *
 *   POST /api/admin/migrate        (alias)  Body: none
 *   POST /api/migrations/run
 *
 * Security gate (a migration runner is powerful — it can create/drop tables):
 *   - Disabled by default: if `MIGRATE_SECRET` is not configured on the server,
 *     the endpoint returns 403.
 *   - Allowed when EITHER the caller is `super_admin` (JWT) OR the request sends
 *     an `X-Migrate-Secret` header that matches `MIGRATE_SECRET`.
 *
 * Only migrations present in the repo `migrations/` dir are considered (a curated
 * set), each runs through Yii's normal transaction bookkeeping, and every migration
 * is attempted independently so one failure does not abort the rest.
 */
class MigrationsController extends ApiController
{
    public function actionRun(): \yii\web\Response
    {
        // ── Gate ─────────────────────────────────────────────────────
        $secret = (string) getenv('MIGRATE_SECRET');
        $provided = (string) Yii::$app->request->headers->get('X-Migrate-Secret', '');

        $isSuper = false;
        try {
            $this->requireSuperAdmin();
            $isSuper = true;
        } catch (Throwable $e) {
            // Not (or not yet) a super_admin — fall through to the secret gate.
        }

        $hasSecret = $secret !== '' && hash_equals($secret, $provided);

        if (!$isSuper && !$hasSecret) {
            $this->forbidden('Super Admin access, or a valid X-Migrate-Secret header, is required.');
        }
        if (!$isSuper && $secret === '') {
            $this->forbidden('MIGRATE_SECRET is not configured on the server; migration endpoint is disabled.');
        }

        @set_time_limit(0);

        $db = Yii::$app->db;

        // Ensure the Yii migration-history table exists (mirrors the console
        // MigrateController::createMigrationHistoryTable()).
        if ($db->schema->getTableSchema('migration') === null) {
            $db->createCommand()->createTable('migration', [
                'version' => 'varchar(180) NOT NULL PRIMARY KEY',
                'apply_time' => 'integer',
            ])->execute();
        }

        $dir = Yii::getAlias('@app/migrations');
        $applied = array_fill_keys(
            $db->createCommand('SELECT version FROM migration')->queryColumn(),
            true
        );

        $files = glob($dir . '/*.php') ?: [];
        sort($files, SORT_STRING);

        $appliedNow = [];
        $errors = [];
        $skipped = 0;

        foreach ($files as $file) {
            $version = basename($file, '.php');
            if (isset($applied[$version])) {
                $skipped++;
                continue;
            }

            try {
                require_once $file;
                /** @var \yii\db\Migration $migration */
                $migration = new $version();
                // up() runs the migration inside a transaction and throws on failure.
                if ($migration->up() === false) {
                    $errors[$version] = 'Migration returned false (no changes applied).';
                    continue;
                }
                // Record history like the console MigrateController::addMigrationHistory().
                $db->createCommand()->insert('migration', [
                    'version' => $version,
                    'apply_time' => time(),
                ])->execute();
                $appliedNow[] = $version;
            } catch (Throwable $e) {
                $errors[$version] = $e->getMessage();
            }
        }

        Yii::warning(
            'Migrations applied=' . implode(',', $appliedNow) . ' errors=' . json_encode($errors),
            __METHOD__
        );

        return $this->json([
            'ok' => true,
            'applied' => $appliedNow,
            'already_applied' => $skipped,
            'total' => count($files),
            'errors' => $errors,
        ], $errors ? 500 : 200);
    }
}
