<?php

declare(strict_types=1);

use app\helpers\Time;
use app\helpers\Uuid;
use app\models\User;
use yii\db\Migration;

/**
 * Corrective seed for the two client-confirmed test accounts.
 *
 * Client-confirmed roles (2026-08-04):
 *   - saidurmollah10@gmail.com             → student   (was super_admin via legacy seed)
 *   - bengaliislamicinstitute@gmail.com    → super_admin (the "Admin User")
 *
 * Idempotent create-or-update; safe to re-run. Version is newer than
 * m250802_000010_seed_admin so it overrides that legacy role if both apply.
 * A down-run is intentionally a no-op — we never delete real users.
 */
class m250804_000011_seed_test_users extends Migration
{
    /** @var array<array{email:string,password:string,role:string,name:string}> */
    private const USERS = [
        ['email' => 'saidurmollah10@gmail.com',           'password' => 'saidur12', 'role' => 'student',    'name' => 'Saidur'],
        ['email' => 'bengaliislamicinstitute@gmail.com',  'password' => '12345678', 'role' => 'super_admin', 'name' => 'Super Admin'],
        ['email' => 'jarircse16@gmail.com',               'password' => '12345678', 'role' => 'student',    'name' => 'Jarir'],
    ];

    public function safeUp(): void
    {
        foreach (self::USERS as $u) {
            $email = strtolower(trim($u['email']));
            $exists = Yii::$app->db->createCommand(
                'SELECT id FROM users WHERE email = :e',
                [':e' => $email]
            )->queryOne();

            if ($exists !== false) {
                // Already present → assert role + password so re-runs converge.
                Yii::$app->db->createCommand()->update('users', [
                    'role' => $u['role'],
                    'password_hash' => User::hashPassword($u['password']),
                    'updated_at' => Time::now(),
                ], ['id' => $exists['id']])->execute();
                continue;
            }

            Yii::$app->db->createCommand()->insert('users', [
                'id' => Uuid::v4(),
                'name' => $u['name'],
                'email' => $email,
                'password_hash' => User::hashPassword($u['password']),
                'role' => $u['role'],
                'student_id' => $u['role'] === 'student' ? User::nextStudentId() : 'ADMIN',
                'phone' => '',
                'address' => '',
                'profile_photo' => '',
                'bio' => null,
                'specialization' => '',
                'permissions' => null,
                'created_at' => Time::now(),
                'updated_at' => null,
            ])->execute();
        }
    }

    public function safeDown(): void
    {
        // Reverse is intentionally a no-op: we do not delete a real user on rollback.
    }
}
