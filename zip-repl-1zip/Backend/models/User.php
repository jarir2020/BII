<?php

declare(strict_types=1);

namespace app\models;

use app\helpers\Uuid;
use yii\db\ActiveRecord;

/**
 * MySQL ActiveRecord for the `users` table.
 * Passwords are bcrypt hashes, compatible with the Python bcrypt hashes already
 * in MongoDB — so existing users log in without a reset.
 */
class User extends ActiveRecord
{
    public static function tableName(): string
    {
        return 'users';
    }

    public static function findById(string $id): ?array
    {
        $row = self::find()->where(['id' => $id])->asArray()->one();
        return $row ?: null;
    }

    public static function findByEmail(string $email): ?array
    {
        $row = self::find()->where(['email' => strtolower(trim($email))])->asArray()->one();
        return $row ?: null;
    }

    /** Remove the password hash from a user row before sending to clients. */
    public static function clean(array $user): array
    {
        unset($user['password_hash']);
        return $user;
    }

    public static function hashPassword(string $plain): string
    {
        return password_hash($plain, PASSWORD_BCRYPT);
    }

    public static function verifyPassword(string $plain, string $hash): bool
    {
        return $hash !== '' && password_verify($plain, $hash);
    }

    /** Generate a new sequential student id: YYYY0001. */
    public static function nextStudentId(): string
    {
        $year = (int) gmdate('Y');
        $key = "student_id_{$year}";

        $db = \Yii::$app->db;
        $driver = $db->getDriverName();

        if ($driver === 'sqlite') {
            // SQLite: use INSERT OR REPLACE for atomic upsert
            $db->createCommand(
                'INSERT OR REPLACE INTO counters (name, seq) VALUES (:name, COALESCE((SELECT seq FROM counters WHERE name = :name2), 0) + 1)',
                [':name' => $key, ':name2' => $key]
            )->execute();
            $seq = (int) $db->createCommand('SELECT seq FROM counters WHERE name = :name', [':name' => $key])->queryScalar();
        } else {
            // MySQL/MariaDB: use LAST_INSERT_ID(expr) for atomic upsert
            $sql = 'INSERT INTO counters (`name`, `seq`) VALUES (:name, LAST_INSERT_ID(1)) '
                . 'ON DUPLICATE KEY UPDATE `seq` = LAST_INSERT_ID(`seq` + 1)';
            $db->createCommand($sql, [':name' => $key])->execute();
            $seq = (int) $db->getLastInsertID();
        }

        return sprintf('%d%04d', $year, $seq);
    }

    public static function newId(): string
    {
        return Uuid::v4();
    }
}
