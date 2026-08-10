<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Add display_order column to notifications and push_notifications tables
 * for manual sorting of in-app and push notification history.
 *
 * 2026-08-10: Admins can now manually set the display order of notifications.
 * When a notification is inserted at an occupied position, existing orders
 * are shifted down by 1 (insert-at-position behaviour).
 */
class m250810_000001_display_order extends Migration
{
    public function safeUp(): void
    {
        // notifications (in-app): manual display order
        $this->addColumn('notifications', 'display_order', $this->integer()->notNull()->defaultValue(0));
        $this->createIndex('idx_notifications_display_order', 'notifications', 'display_order');

        // push_notifications (FCM history): manual display order
        $this->addColumn('push_notifications', 'display_order', $this->integer()->notNull()->defaultValue(0));
        $this->createIndex('idx_push_notif_display_order', 'push_notifications', 'display_order');
    }

    public function safeDown(): void
    {
        $this->dropIndex('idx_push_notif_display_order', 'push_notifications');
        $this->dropIndex('idx_notifications_display_order', 'notifications');
        $this->dropColumn('push_notifications', 'display_order');
        $this->dropColumn('notifications', 'display_order');
    }
}
