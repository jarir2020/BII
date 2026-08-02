<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Core auth tables: counters, users, login_logs, password_resets.
 *
 * Timestamps are stored as Python-isoformat strings (VARCHAR) so responses
 * match the FastAPI backend byte-for-byte; lexicographic ordering is valid
 * because every value is UTC with a consistent format.
 */
class m250802_000001_create_core extends Migration
{
    private const PK_LEN = 36; // uuid

    public function safeUp(): void
    {
        // ── counters ───────────────────────────────────────────────
        $this->createTable('counters', [
            'name' => $this->string(64)->notNull(),
            'seq' => $this->bigInteger()->notNull()->defaultValue(0),
        ]);
        $this->addPrimaryKey('pk_counters', 'counters', 'name');

        // ── users ──────────────────────────────────────────────────
        $this->createTable('users', [
            'id' => $this->string(self::PK_LEN)->notNull(),
            'name' => $this->string(255)->notNull()->defaultValue(''),
            'email' => $this->string(255)->notNull(),
            'password_hash' => $this->string(255)->notNull()->defaultValue(''),
            'role' => $this->string(32)->notNull()->defaultValue('student'),
            'student_id' => $this->string(32)->notNull()->defaultValue(''),
            'phone' => $this->string(64)->notNull()->defaultValue(''),
            'address' => $this->text()->null(),
            'profile_photo' => $this->string(512)->notNull()->defaultValue(''),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_users', 'users', 'id');
        $this->createIndex('idx_users_email', 'users', 'email', true);
        $this->createIndex('idx_users_student_id', 'users', 'student_id');

        // ── login_logs ─────────────────────────────────────────────
        $this->createTable('login_logs', [
            'id' => $this->string(self::PK_LEN)->notNull(),
            'user_id' => $this->string(self::PK_LEN)->null(),
            'email' => $this->string(255)->notNull()->defaultValue(''),
            'name' => $this->string(255)->notNull()->defaultValue(''),
            'student_id' => $this->string(32)->notNull()->defaultValue(''),
            'role' => $this->string(32)->notNull()->defaultValue(''),
            'ip' => $this->string(64)->notNull()->defaultValue(''),
            'user_agent' => $this->string(255)->notNull()->defaultValue(''),
            'success' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_login_logs', 'login_logs', 'id');
        $this->createIndex('idx_login_logs_email_time', 'login_logs', ['email', 'created_at']);

        // ── password_resets ────────────────────────────────────────
        $this->createTable('password_resets', [
            'id' => $this->string(self::PK_LEN)->notNull(),
            'user_id' => $this->string(self::PK_LEN)->null(),
            'email' => $this->string(255)->notNull()->defaultValue(''),
            'otp' => $this->string(16)->notNull()->defaultValue(''),
            'token' => $this->string(64)->notNull()->defaultValue(''),
            'used' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'expires_at' => $this->string(40)->null(),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_password_resets', 'password_resets', 'id');
        $this->createIndex('idx_password_resets_email', 'password_resets', 'email');
    }

    public function safeDown(): void
    {
        $this->dropTable('password_resets');
        $this->dropTable('login_logs');
        $this->dropTable('users');
        $this->dropTable('counters');
    }
}
