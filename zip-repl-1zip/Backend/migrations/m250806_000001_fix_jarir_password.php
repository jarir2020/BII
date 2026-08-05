<?php

declare(strict_types=1);

use app\helpers\Time;
use app\models\User;
use yii\db\Migration;

/**
 * Fix password for jarircse16@gmail.com — the seed migration didn't
 * re-run because it was already applied.
 */
class m250806_000001_fix_jarir_password extends Migration
{
    public function safeUp(): void
    {
        $email = strtolower(trim('jarircse16@gmail.com'));
        $exists = Yii::$app->db->createCommand(
            'SELECT id FROM users WHERE email = :e',
            [':e' => $email]
        )->queryOne();

        if ($exists !== false) {
            Yii::$app->db->createCommand()->update('users', [
                'password_hash' => User::hashPassword('12345678'),
                'role' => 'student',
                'updated_at' => Time::now(),
            ], ['id' => $exists['id']])->execute();
        }
    }

    public function safeDown(): void {}
}
