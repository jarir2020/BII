<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Push/notifications extras: device_tokens columns, contact_messages,
 * push_notifications.
 */
class m250802_000008_notifications extends Migration
{
    private const PK = 36;

    public function safeUp(): void
    {
        $this->addColumn('device_tokens', 'platform', $this->string(32)->notNull()->defaultValue(''));
        $this->addColumn('device_tokens', 'user_email', $this->string(255)->notNull()->defaultValue(''));
        $this->addColumn('device_tokens', 'updated_at', $this->string(40)->null());

        $this->createTable('contact_messages', [
            'id' => $this->string(self::PK)->notNull(),
            'name' => $this->string(255)->notNull()->defaultValue(''),
            'email' => $this->string(255)->notNull()->defaultValue(''),
            'phone' => $this->string(64)->notNull()->defaultValue(''),
            'subject' => $this->string(255)->notNull()->defaultValue(''),
            'message' => $this->text()->null(),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_contact_messages', 'contact_messages', 'id');

        $this->createTable('push_notifications', [
            'id' => $this->string(self::PK)->notNull(),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'title_en' => $this->string(255)->notNull()->defaultValue(''),
            'body_bn' => $this->text()->null(),
            'body_en' => $this->text()->null(),
            'target' => $this->string(64)->notNull()->defaultValue('all'),
            'image_url' => $this->string(512)->notNull()->defaultValue(''),
            'scheduled_for' => $this->string(40)->null(),
            'sent_at' => $this->string(40)->null(),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_push_notifications', 'push_notifications', 'id');
    }

    public function safeDown(): void
    {
        $this->dropTable('push_notifications');
        $this->dropTable('contact_messages');
        $this->dropColumn('device_tokens', 'updated_at');
        $this->dropColumn('device_tokens', 'user_email');
        $this->dropColumn('device_tokens', 'platform');
    }
}
