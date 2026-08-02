<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/backup/export — super_admin JSON dump (users sanitized).
 */
class BackupController extends ApiController
{
    private const TABLES = [
        'users', 'courses', 'posts', 'videos', 'live_classes', 'notifications',
        'products', 'orders', 'banners', 'sliders', 'gallery', 'downloads',
        'configs', 'settings', 'enrollments', 'duas', 'dua_categories', 'books',
    ];

    public function actionExport(): \yii\web\Response
    {
        $this->requireSuperAdmin();
        $db = Yii::$app->db;
        $out = [];
        foreach (self::TABLES as $t) {
            try {
                $rows = $db->createCommand("SELECT * FROM {$t} LIMIT 5000")->queryAll();
            } catch (\Throwable $e) {
                continue;
            }
            if ($t === 'users') {
                foreach ($rows as &$r) {
                    unset($r['password_hash']);
                }
            }
            $out[$t] = $rows;
        }
        return $this->json(['exported_at' => $this->now(), 'collections' => $out]);
    }
}
