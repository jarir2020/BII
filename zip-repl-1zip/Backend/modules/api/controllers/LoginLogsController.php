<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/login-logs — admin login history.
 */
class LoginLogsController extends ApiController
{
    /** GET /api/login-logs?limit=300. */
    public function actionIndex(): \yii\web\Response
    {
        $this->requireAdmin();
        $limit = max(1, min(500, (int) Yii::$app->request->get('limit', 200)));
        $rows = Yii::$app->db->createCommand(
            'SELECT id, user_id, email, name, student_id, role, ip, user_agent, success, created_at
             FROM login_logs ORDER BY created_at DESC LIMIT ' . $limit
        )->queryAll();

        foreach ($rows as &$row) {
            $row['success'] = (bool) $row['success'];
        }
        unset($row);

        return $this->json($rows);
    }
}
