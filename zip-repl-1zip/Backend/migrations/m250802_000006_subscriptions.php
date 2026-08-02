<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Subscriptions: subscription_plans, subscriptions.
 */
class m250802_000006_subscriptions extends Migration
{
    private const PK = 36;

    public function safeUp(): void
    {
        $this->createTable('subscription_plans', [
            'id' => $this->string(self::PK)->notNull(),
            'name_bn' => $this->string(255)->notNull()->defaultValue(''),
            'name_en' => $this->string(255)->notNull()->defaultValue(''),
            'description_bn' => $this->text()->null(),
            'description_en' => $this->text()->null(),
            'price' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'duration_days' => $this->integer()->notNull()->defaultValue(30),
            'features' => $this->text()->null(),
            'is_active' => $this->tinyInteger(1)->notNull()->defaultValue(1),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_subscription_plans', 'subscription_plans', 'id');

        $this->createTable('subscriptions', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'plan_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'plan_name' => $this->string(255)->notNull()->defaultValue(''),
            'amount' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'transaction_id' => $this->string(128)->notNull()->defaultValue(''),
            'gateway' => $this->string(32)->notNull()->defaultValue(''),
            'started_at' => $this->string(40)->null(),
            'expires_at' => $this->string(40)->null(),
            'status' => $this->string(32)->notNull()->defaultValue('active'),
        ]);
        $this->addPrimaryKey('pk_subscriptions', 'subscriptions', 'id');
        $this->createIndex('idx_subscriptions_user', 'subscriptions', 'user_id');
    }

    public function safeDown(): void
    {
        $this->dropTable('subscriptions');
        $this->dropTable('subscription_plans');
    }
}
