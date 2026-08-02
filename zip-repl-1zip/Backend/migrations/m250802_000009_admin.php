<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Admin/misc: users columns for teachers & admins.
 */
class m250802_000009_admin extends Migration
{
    public function safeUp(): void
    {
        $this->addColumn('users', 'bio', $this->text()->null());
        $this->addColumn('users', 'specialization', $this->string(255)->notNull()->defaultValue(''));
        $this->addColumn('users', 'permissions', $this->text()->null());
    }

    public function safeDown(): void
    {
        $this->dropColumn('users', 'permissions');
        $this->dropColumn('users', 'specialization');
        $this->dropColumn('users', 'bio');
    }
}
