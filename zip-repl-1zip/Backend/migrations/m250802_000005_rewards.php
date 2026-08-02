<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Rewards + configs: reward_balances, reward_transactions, cashout_requests,
 * reward_ads, configs, and promo_codes.created_by_user.
 */
class m250802_000005_rewards extends Migration
{
    private const PK = 36;

    public function safeUp(): void
    {
        // ── configs (key/value JSON store; used by rewards, payments, settings) ──
        $this->createTable('configs', [
            'key' => $this->string(64)->notNull(),
            'data' => $this->text()->null(),
            'updated_at' => $this->string(40)->null(),
            'updated_by' => $this->string(self::PK)->null(),
        ]);
        $this->addPrimaryKey('pk_configs', 'configs', 'key');

        // ── reward_balances ───────────────────────────────────────
        $this->createTable('reward_balances', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull(),
            'coins' => $this->integer()->notNull()->defaultValue(0),
        ]);
        $this->addPrimaryKey('pk_reward_balances', 'reward_balances', 'id');
        $this->createIndex('idx_rb_user', 'reward_balances', 'user_id', true);

        // ── reward_transactions ───────────────────────────────────
        $this->createTable('reward_transactions', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'type' => $this->string(32)->notNull()->defaultValue(''),
            'coins' => $this->integer()->notNull()->defaultValue(0),
            'promo_code' => $this->string(64)->notNull()->defaultValue(''),
            'ref_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_reward_transactions', 'reward_transactions', 'id');
        $this->createIndex('idx_rt_user_created', 'reward_transactions', ['user_id', 'created_at']);

        // ── cashout_requests ──────────────────────────────────────
        $this->createTable('cashout_requests', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'user_name' => $this->string(255)->notNull()->defaultValue(''),
            'user_email' => $this->string(255)->notNull()->defaultValue(''),
            'coins' => $this->integer()->notNull()->defaultValue(0),
            'taka_amount' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'payment_method' => $this->string(32)->notNull()->defaultValue(''),
            'payment_number' => $this->string(64)->notNull()->defaultValue(''),
            'status' => $this->string(32)->notNull()->defaultValue('pending'),
            'admin_note' => $this->text()->null(),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_cashout_requests', 'cashout_requests', 'id');

        // ── reward_ads ────────────────────────────────────────────
        $this->createTable('reward_ads', [
            'id' => $this->string(self::PK)->notNull(),
            'title' => $this->string(255)->notNull()->defaultValue(''),
            'ad_type' => $this->string(32)->notNull()->defaultValue(''),
            'media_url' => $this->string(512)->notNull()->defaultValue(''),
            'thumbnail_url' => $this->string(512)->notNull()->defaultValue(''),
            'duration_seconds' => $this->integer()->notNull()->defaultValue(15),
            'is_active' => $this->tinyInteger(1)->notNull()->defaultValue(1),
            'order' => $this->integer()->notNull()->defaultValue(0),
            'description' => $this->text()->null(),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_reward_ads', 'reward_ads', 'id');

        // ── promo_codes.created_by_user (for my-promo-codes) ──────
        $this->addColumn('promo_codes', 'created_by_user', $this->string(self::PK)->notNull()->defaultValue(''));
        $this->addColumn('promo_codes', 'given_to_student_id', $this->string(32)->notNull()->defaultValue(''));
        $this->addColumn('promo_codes', 'given_by_admin_id', $this->string(self::PK)->notNull()->defaultValue(''));
        $this->addColumn('promo_codes', 'source', $this->string(32)->notNull()->defaultValue(''));
    }

    public function safeDown(): void
    {
        $this->dropColumn('promo_codes', 'created_by_user');
        foreach (['reward_ads', 'cashout_requests', 'reward_transactions', 'reward_balances', 'configs'] as $t) {
            $this->dropTable($t);
        }
    }
}
