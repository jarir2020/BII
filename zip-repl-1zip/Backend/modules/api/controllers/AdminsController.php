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

    /** GET /api/admins/{id}; PUT/PATCH updates; DELETE removes an admin. */
    public function actionView(string $id): \yii\web\Response
    {
        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            return $this->actionUpdate($id);
        }
        if ($request->isDelete) {
            return $this->actionDelete($id);
        }

        $this->requireSuperAdmin();
        $row = Yii::$app->db->createCommand(
            'SELECT * FROM users WHERE id = :id AND role IN ("admin", "super_admin")',
            [':id' => $id]
        )->queryOne();
        if ($row === false) {
            $this->notFound('Admin not found');
        }

        return $this->json($this->safe($row));
    }

    /** PUT/PATCH /api/admins/{id} — update an existing admin safely. */
    public function actionUpdate(string $id): \yii\web\Response
    {
        $this->requireSuperAdmin();
        $row = Yii::$app->db->createCommand(
            'SELECT * FROM users WHERE id = :id AND role IN ("admin", "super_admin")',
            [':id' => $id]
        )->queryOne();
        if ($row === false) {
            $this->notFound('Admin not found');
        }

        $body = Yii::$app->request->post();
        $updates = [];

        if (array_key_exists('name', $body)) {
            $name = trim((string) $body['name']);
            if ($name === '') {
                $this->badRequest('Name is required');
            }
            $updates['name'] = $name;
        }

        if (array_key_exists('email', $body)) {
            $email = strtolower(trim((string) $body['email']));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->badRequest('Valid email is required');
            }
            $duplicate = Yii::$app->db->createCommand(
                'SELECT id FROM users WHERE email = :email AND id <> :id',
                [':email' => $email, ':id' => $id]
            )->queryOne();
            if ($duplicate !== false) {
                $this->badRequest('এই ইমেইল ইতিমধ্যে নিবন্ধিত');
            }
            $updates['email'] = $email;
        }

        if (array_key_exists('permissions', $body)) {
            if (!is_array($body['permissions'])) {
                $this->badRequest('Permissions must be an array');
            }
            $updates['permissions'] = json_encode(
                array_values($body['permissions']),
                JSON_UNESCAPED_UNICODE
            );
        }

        if (array_key_exists('password', $body) && (string) $body['password'] !== '') {
            $password = (string) $body['password'];
            if (strlen($password) < 6) {
                $this->badRequest('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
            }
            $updates['password_hash'] = User::hashPassword($password);
        }

        if ($updates !== []) {
            $updates['updated_at'] = $this->now();
            Yii::$app->db->createCommand()->update('users', $updates, ['id' => $id])->execute();
        }

        $updated = Yii::$app->db->createCommand(
            'SELECT * FROM users WHERE id = :id', [':id' => $id]
        )->queryOne();
        return $this->json($this->safe($updated));
    }

    public function actionDelete(string $id): \yii\web\Response
    {
        $actor = $this->requireSuperAdmin();
        if (!Yii::$app->request->isDelete) {
            throw new \yii\web\HttpException(405, 'Method Not Allowed');
        }

        $row = Yii::$app->db->createCommand(
            'SELECT role FROM users WHERE id = :id', [':id' => $id]
        )->queryOne();
        if ($row === false) {
            $this->notFound('Admin not found');
        }
        if (($row['role'] ?? '') === 'super_admin' || (string) ($actor['id'] ?? '') === $id) {
            $this->forbidden('Super Admin accounts cannot be deleted');
        }

        Yii::$app->db->createCommand()->delete('users', ['id' => $id])->execute();
        return $this->json(['ok' => true, 'deleted' => 1]);
    }

    /**
     * POST /api/admin/maintenance  {"enabled": true|false}
     * Lock/unlock the app (server-side). Super admin only.
     */
    public function actionMaintenance(): \yii\web\Response
    {
        $this->requireSuperAdmin();
        $b = Yii::$app->request->post();
        $enabled = (bool) ($b['enabled'] ?? false);
        \app\helpers\License::setMaintenance($enabled);
        return $this->json(['ok' => true, 'maintenance_enabled' => $enabled]);
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
