<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Add missing columns to push_notifications for FCM v1 support,
 * targeting, scheduling, and delivery stats.
 */
class m250808_000001_push_notifications_fix extends Migration
{
    public function safeUp(): void
    {
        // push_notifications: add columns
        $this->addColumn('push_notifications', 'click_action', $this->string(512)->notNull()->defaultValue(''));
        $this->addColumn('push_notifications', 'target_user_id', $this->string(36)->notNull()->defaultValue(''));
        $this->addColumn('push_notifications', 'target_course_id', $this->string(36)->notNull()->defaultValue(''));
        $this->addColumn('push_notifications', 'status', $this->string(20)->notNull()->defaultValue('pending'));
        $this->addColumn('push_notifications', 'sent_count', $this->integer()->notNull()->defaultValue(0));
        $this->addColumn('push_notifications', 'failed_count', $this->integer()->notNull()->defaultValue(0));
        $this->addColumn('push_notifications', 'error', $this->text()->null());

        // Indexes for push_notifications
        $this->createIndex('idx_push_notif_status', 'push_notifications', 'status');
        $this->createIndex('idx_push_notif_scheduled', 'push_notifications', 'scheduled_for');

        // device_tokens: index on user_id for faster targeting queries
        $this->createIndex('idx_device_tokens_user_id', 'device_tokens', 'user_id');
    }

    public function safeDown(): void
    {
        $this->dropIndex('idx_device_tokens_user_id', 'device_tokens');
        $this->dropIndex('idx_push_notif_scheduled', 'push_notifications');
        $this->dropIndex('idx_push_notif_status', 'push_notifications');
        $this->dropColumn('push_notifications', 'error');
        $this->dropColumn('push_notifications', 'failed_count');
        $this->dropColumn('push_notifications', 'sent_count');
        $this->dropColumn('push_notifications', 'status');
        $this->dropColumn('push_notifications', 'target_course_id');
        $this->dropColumn('push_notifications', 'target_user_id');
        $this->dropColumn('push_notifications', 'click_action');
    }
}
