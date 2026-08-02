<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\models\User;
use app\helpers\Uuid;
use Yii;

/**
 * /api/teachers — public list; admin create/update/delete.
 */
class TeachersController extends ApiController
{
    public function actionIndex(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            return $this->create();
        }
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM users WHERE role = "teacher" ORDER BY created_at DESC LIMIT 500'
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->safe($r), $rows));
    }

    public function actionView(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        $row = Yii::$app->db->createCommand(
            'SELECT * FROM users WHERE id = :id AND role = "teacher"', [':id' => $id]
        )->queryOne();
        if ($row === false) {
            $this->notFound('শিক্ষক পাওয়া যায়নি');
        }
        $request = Yii::$app->request;
        if ($request->isDelete) {
            Yii::$app->db->createCommand()->delete('users', ['id' => $id, 'role' => 'teacher'])->execute();
            return $this->json(['ok' => true, 'deleted' => 1]);
        }
        $b = $request->post();
        $updates = [];
        foreach (['name', 'phone', 'address', 'bio', 'specialization', 'profile_photo'] as $f) {
            if (array_key_exists($f, $b)) {
                $updates[$f] = (string) $b[$f];
            }
        }
        if (!empty($b['password'])) {
            $updates['password_hash'] = User::hashPassword((string) $b['password']);
        }
        Yii::$app->db->createCommand()->update('users', $updates, ['id' => $id])->execute();
        $row = Yii::$app->db->createCommand('SELECT * FROM users WHERE id = :id', [':id' => $id])->queryOne();
        return $this->json($this->safe($row));
    }

    private function create(): \yii\web\Response
    {
        $this->requireAdmin();
        $b = Yii::$app->request->post();
        $email = strtolower(trim((string) ($b['email'] ?? '')));
        if (Yii::$app->db->createCommand('SELECT id FROM users WHERE email = :e', [':e' => $email])->queryOne() !== false) {
            $this->badRequest('এই ইমেইল ইতিমধ্যে নিবন্ধিত');
        }
        $seq = (int) Yii::$app->db->createCommand('SELECT COUNT(*) FROM users WHERE role = "teacher"')->queryScalar();
        $doc = [
            'id' => Uuid::v4(),
            'name' => trim((string) ($b['name'] ?? '')),
            'email' => $email,
            'password_hash' => User::hashPassword((string) ($b['password'] ?? '')),
            'role' => 'teacher',
            'student_id' => 'T' . gmdate('Y') . str_pad((string) ($seq + 1), 3, '0', STR_PAD_LEFT),
            'phone' => (string) ($b['phone'] ?? ''),
            'address' => (string) ($b['address'] ?? ''),
            'bio' => (string) ($b['bio'] ?? ''),
            'specialization' => (string) ($b['specialization'] ?? ''),
            'profile_photo' => (string) ($b['photo'] ?? ''),
            'permissions' => null,
            'created_at' => $this->now(),
            'updated_at' => null,
        ];
        Yii::$app->db->createCommand()->insert('users', $doc)->execute();
        return $this->json($this->safe($doc));
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
