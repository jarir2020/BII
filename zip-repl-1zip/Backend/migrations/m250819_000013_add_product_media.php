<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Add a product gallery and optional product video link.
 *
 * The gallery is stored as JSON text for compatibility with both MySQL and
 * the project's SQLite test database. The old `image` column is retained as
 * the legacy cover-image fallback.
 */
class m250819_000013_add_product_media extends Migration
{
    public function safeUp(): void
    {
        if (!$this->db->getSchema()->hasColumn('products', 'images')) {
            $this->addColumn('products', 'images', $this->text()->null());
        }

        if (!$this->db->getSchema()->hasColumn('products', 'video_url')) {
            $this->addColumn('products', 'video_url', $this->string(1024)->notNull()->defaultValue(''));
        }
    }

    public function safeDown(): void
    {
        if ($this->db->getSchema()->hasColumn('products', 'video_url')) {
            $this->dropColumn('products', 'video_url');
        }
        if ($this->db->getSchema()->hasColumn('products', 'images')) {
            $this->dropColumn('products', 'images');
        }
    }
}
