<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * settings — single-document JSON settings store.
 * Row id='main' holds the merged settings object (smtp_*, app config, etc.).
 */
class m250802_000002_add_settings extends Migration
{
    public function safeUp(): void
    {
        $this->createTable('settings', [
            'id' => $this->string(64)->notNull(),
            'data' => $this->text()->null(),
            'updated_at' => $this->string(40)->null(),
            'updated_by' => $this->string(36)->null(),
        ]);
        $this->addPrimaryKey('pk_settings', 'settings', 'id');
    }

    public function safeDown(): void
    {
        $this->dropTable('settings');
    }
}
