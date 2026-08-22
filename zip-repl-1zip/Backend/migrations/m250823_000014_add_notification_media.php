<?php

declare(strict_types=1);

use yii\db\Migration;

/** Add optional images to in-app notifications. */
class m250823_000014_add_notification_media extends Migration
{
    public function safeUp(): void
    {
        if (!$this->db->getSchema()->hasColumn('notifications', 'image_url')) {
            $this->addColumn('notifications', 'image_url', $this->string(512)->notNull()->defaultValue(''));
        }
    }

    public function safeDown(): void
    {
        if ($this->db->getSchema()->hasColumn('notifications', 'image_url')) {
            $this->dropColumn('notifications', 'image_url');
        }
    }
}
