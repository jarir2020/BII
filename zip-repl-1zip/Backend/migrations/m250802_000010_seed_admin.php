<?php

declare(strict_types=1);

use app\helpers\Time;
use app\helpers\Uuid;
use app\models\User;
use yii\db\Migration;

/**
 * Idempotent seed for the institute's admin account.
 *
 * Ensures `saidurmollah10@gmail.com` exists as a super_admin with password
 * `saidur12`:
 *   - If the user does NOT exist → create it.
 *   - If the user already exists → update password + role (safe to re-run).
 *
 * Mirrors the `php yii user/create-admin` command so the result is identical
 * to running that seeder manually.
 */
class m250802_000010_seed_admin extends Migration
{
    private const EMAIL = 'saidurmollah10@gmail.com';
    private const PASSWORD = 'saidur12';
    private const ROLE = 'super_admin';

    public function safeUp(): void
    {
        $email = strtolower(trim(self::EMAIL));
        $exists = Yii::$app->db->createCommand(
            'SELECT id FROM users WHERE email = :e',
            [':e' => $email]
        )->queryOne();

        if ($exists !== false) {
            Yii::$app->db->createCommand()->update('users', [
                'role' => self::ROLE,
                'password_hash' => User::hashPassword(self::PASSWORD),
                'updated_at' => Time::now(),
            ], ['id' => $exists['id']])->execute();
            $this->stdout("Updated {$email} → " . self::ROLE . "\n");
            return;
        }

        Yii::$app->db->createCommand()->insert('users', [
            'id' => Uuid::v4(),
            'name' => 'Admin',
            'email' => $email,
            'password_hash' => User::hashPassword(self::PASSWORD),
            'role' => self::ROLE,
            'student_id' => 'ADMIN',
            'phone' => '',
            'address' => '',
            'profile_photo' => '',
            'bio' => null,
            'specialization' => '',
            'permissions' => null,
            'created_at' => Time::now(),
            'updated_at' => null,
        ])->execute();
        $this->stdout("Created {$email} → " . self::ROLE . "\n");
    }

    public function safeDown(): void
    {
        // Reverse is intentionally a no-op: we do not delete a real user on rollback.
        $this->stdout("Seed migration rolled back (user left untouched).\n");
    }
}
