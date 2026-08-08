<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Web Push (VAPID) tables — zero-Firebase push for web browsers.
 *
 * 2026-08-08: Created for custom push without Firebase dependency.
 */
class m250808_000002_web_push_vapid extends Migration
{
    private const PK = 36;

    public function safeUp(): void
    {
        // VAPID key pair (generated once, stored server-side)
        $this->createTable('web_push_vapid_keys', [
            'id' => $this->string(self::PK)->notNull(),
            'public_key' => $this->string(255)->notNull(),
            'private_key' => $this->string(255)->notNull(),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_web_push_vapid_keys', 'web_push_vapid_keys', 'id');

        // Browser push subscriptions (one per device/browser)
        $this->createTable('web_push_subscriptions', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'endpoint' => $this->string(1024)->notNull(),
            'p256dh' => $this->string(255)->notNull()->defaultValue(''),
            'auth' => $this->string(255)->notNull()->defaultValue(''),
            'user_agent' => $this->string(512)->notNull()->defaultValue(''),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_web_push_subs', 'web_push_subscriptions', 'id');

        // Index for fast user lookups and cleanup
        $this->createIndex('idx_web_push_user', 'web_push_subscriptions', 'user_id');
        $this->createIndex('idx_web_push_endpoint', 'web_push_subscriptions', 'endpoint', true);
    }

    public function safeDown(): void
    {
        $this->dropTable('web_push_subscriptions');
        $this->dropTable('web_push_vapid_keys');
    }
}
