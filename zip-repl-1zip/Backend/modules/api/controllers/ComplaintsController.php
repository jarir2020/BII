<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use Yii;

/**
 * /api/complaints — students submit; admin lists + resolves.
 */
class ComplaintsController extends ApiController
{
    /** POST /api/complaints */
    public function actionIndex(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            $user = $this->user();
            $body = Yii::$app->request->post();
            $subject = trim((string) ($body['subject'] ?? ''));
            $message = (string) ($body['message'] ?? '');
            if ($subject === '') {
                $this->badRequest('বিষয় লিখুন');
            }
            Yii::$app->db->createCommand()->insert('complaints', [
                'id' => Uuid::v4(), 'user_id' => $user['id'], 'user_name' => $user['name'] ?? '',
                'subject' => $subject, 'message' => $message, 'status' => 'pending',
                'created_at' => $this->now(),
            ])->execute();
            return $this->json(['ok' => true]);
        }

        // GET — admin list.
        $this->requireAdmin();
        $status = (string) Yii::$app->request->get('status', 'all');
        $sql = 'SELECT * FROM complaints';
        $params = [];
        if ($status !== 'all') {
            $sql .= ' WHERE status = :s';
            $params[':s'] = $status;
        }
        $sql .= ' ORDER BY created_at DESC';
        $rows = Yii::$app->db->createCommand($sql, $params)->queryAll();
        return $this->json($rows);
    }

    /** PATCH /api/complaints/{id}/resolve */
    public function actionResolve(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        Yii::$app->db->createCommand()->update('complaints', ['status' => 'resolved'], ['id' => $id])->execute();
        return $this->json(['ok' => true]);
    }
}
