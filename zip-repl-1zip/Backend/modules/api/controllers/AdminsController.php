<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\models\User;
use app\helpers\Uuid;
use Yii;

/**
 * /api/admins — super_admin only.
 */
class AdminsController extends ApiController
{
    public function actionIndex(): \yii\web\Response
    {
        $this->requireSuperAdmin();
        if (Yii::$app->request->isPost) {
            $b = Yii::$app->request->post();
            $email = strtolower(trim((string) ($b['email'] ?? '')));
            if (Yii::$app->db->createCommand('SELECT id FROM users WHERE email = :e', [':e' => $email])->queryOne() !== false) {
                $this->badRequest('এই ইমেইল ইতিমধ্যে নিবন্ধিত');
            }
            $perms = $b['permissions'] ?? ['dashboard', 'students', 'courses', 'content'];
            $doc = [
                'id' => Uuid::v4(),
                'name' => trim((string) ($b['name'] ?? '')),
                'email' => $email,
                'password_hash' => User::hashPassword((string) ($b['password'] ?? '')),
                'role' => 'admin',
                'permissions' => json_encode($perms, JSON_UNESCAPED_UNICODE),
                'student_id' => 'ADMIN',
                'phone' => '', 'address' => '', 'profile_photo' => '', 'bio' => null, 'specialization' => '',
                'created_at' => $this->now(), 'updated_at' => null,
            ];
            Yii::$app->db->createCommand()->insert('users', $doc)->execute();
            return $this->json($this->safe($doc));
        }
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM users WHERE role IN ("admin","super_admin") ORDER BY created_at DESC LIMIT 200'
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->safe($r), $rows));
    }

    public function actionDelete(string $id): \yii\web\Response
    {
        $this->requireSuperAdmin();
        Yii::$app->db->createCommand()->delete('users', ['id' => $id])->execute();
        return $this->json(['ok' => true, 'deleted' => 1]);
    }

    private function safe(array $r): array
    {
        unset($r['password_hash']);
        if (isset($r['permissions']) && $r['permissions'] !== null) {
            $decoded = json_decode((string) $r['permissions'], true);
            $r['permissions'] = is_array($decoded) ? $decoded : [];
        }
        return $r;
    }
}
