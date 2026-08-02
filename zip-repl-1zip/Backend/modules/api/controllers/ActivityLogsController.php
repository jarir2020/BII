<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/activity-logs — admin.
 */
class ActivityLogsController extends ApiController
{
    public function actionIndex(): \yii\web\Response
    {
        $this->requireAdmin();
        $limit = (int) Yii::$app->request->get('limit', 200);
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ' . $limit
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->logDoc($r), $rows));
    }

    private function logDoc(array $r): array
    {
        $meta = json_decode((string) ($r['meta'] ?? 'null'), true);
        $r['meta'] = is_array($meta) ? $meta : [];
        return $r;
    }
}
