<?php

declare(strict_types=1);

namespace app\commands;

use app\models\User;
use app\helpers\Uuid;
use Yii;
use yii\console\Controller;

/**
 * Console user helpers.
 *
 *   php yii user/create-admin <email> <role> <password>
 *   php yii user/list
 */
class UserController extends Controller
{
    /** Create an admin/super_admin user. */
    public function actionCreateAdmin(string $email, string $role = 'super_admin', string $password = 'ChangeMe1!'): int
    {
        $email = strtolower(trim($email));
        if (!in_array($role, ['admin', 'super_admin'], true)) {
            $this->stderr("role must be admin or super_admin\n");
            return 1;
        }
        $exists = Yii::$app->db->createCommand('SELECT id FROM users WHERE email = :e', [':e' => $email])->queryOne();
        if ($exists !== false) {
            Yii::$app->db->createCommand()->update('users', [
                'role' => $role,
                'password_hash' => User::hashPassword($password),
            ], ['id' => $exists['id']])->execute();
            $this->stdout("Updated {$email} → {$role}\n");
            return 0;
        }
        Yii::$app->db->createCommand()->insert('users', [
            'id' => Uuid::v4(),
            'name' => 'Admin',
            'email' => $email,
            'password_hash' => User::hashPassword($password),
            'role' => $role,
            'student_id' => 'ADMIN',
            'phone' => '', 'address' => '', 'profile_photo' => '', 'bio' => null, 'specialization' => '',
            'permissions' => null,
            'created_at' => \app\helpers\Time::now(),
            'updated_at' => null,
        ])->execute();
        $this->stdout("Created {$email} → {$role}\n");
        return 0;
    }

    /** List users (id, email, role, student_id). */
    public function actionList(): int
    {
        $rows = Yii::$app->db->createCommand('SELECT email, role, student_id FROM users ORDER BY created_at')->queryAll();
        foreach ($rows as $r) {
            $this->stdout(sprintf("%-32s %-12s %s\n", $r['email'], $r['role'], $r['student_id']));
        }
        return 0;
    }
}
