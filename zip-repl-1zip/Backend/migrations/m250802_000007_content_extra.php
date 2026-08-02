<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Content extras + library + notifications:
 * settings, dua_categories, duas, complaints, library_categories, books,
 * generic_items (schema-less CRUD), notifications, device_tokens, activity_logs.
 */
class m250802_000007_content_extra extends Migration
{
    private const PK = 36;

    public function safeUp(): void
    {
        // ── dua_categories ────────────────────────────────────────
        $this->createTable('dua_categories', [
            'id' => $this->string(self::PK)->notNull(),
            'name_bn' => $this->string(255)->notNull()->defaultValue(''),
            'icon' => $this->string(32)->notNull()->defaultValue('🤲'),
            'description' => $this->text()->null(),
            'sort_order' => $this->integer()->notNull()->defaultValue(0),
            'color' => $this->string(32)->notNull()->defaultValue(''),
        ]);
        $this->addPrimaryKey('pk_dua_categories', 'dua_categories', 'id');

        // ── duas ──────────────────────────────────────────────────
        $this->createTable('duas', [
            'id' => $this->string(self::PK)->notNull(),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'category_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'arabic_text' => $this->text()->null(),
            'transliteration' => $this->text()->null(),
            'meaning_bn' => $this->text()->null(),
            'when_to_read' => $this->text()->null(),
            'fazilat' => $this->text()->null(),
            'source' => $this->string(255)->notNull()->defaultValue(''),
            'is_today_dua' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'view_count' => $this->integer()->notNull()->defaultValue(0),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_duas', 'duas', 'id');

        // ── dua_favorites ─────────────────────────────────────────
        $this->createTable('dua_favorites', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull(),
            'dua_id' => $this->string(self::PK)->notNull(),
        ]);
        $this->addPrimaryKey('pk_dua_favorites', 'dua_favorites', 'id');
        $this->createIndex('idx_df_user_dua', 'dua_favorites', ['user_id', 'dua_id'], true);

        // ── complaints ────────────────────────────────────────────
        $this->createTable('complaints', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'user_name' => $this->string(255)->notNull()->defaultValue(''),
            'subject' => $this->string(255)->notNull()->defaultValue(''),
            'message' => $this->text()->null(),
            'status' => $this->string(32)->notNull()->defaultValue('pending'),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_complaints', 'complaints', 'id');

        // ── library_categories ────────────────────────────────────
        $this->createTable('library_categories', [
            'id' => $this->string(self::PK)->notNull(),
            'name_bn' => $this->string(255)->notNull()->defaultValue(''),
            'name_en' => $this->string(255)->notNull()->defaultValue(''),
            'description' => $this->text()->null(),
            'icon' => $this->string(32)->notNull()->defaultValue('📚'),
            'sort_order' => $this->integer()->notNull()->defaultValue(0),
        ]);
        $this->addPrimaryKey('pk_library_categories', 'library_categories', 'id');

        // ── books ─────────────────────────────────────────────────
        $this->createTable('books', [
            'id' => $this->string(self::PK)->notNull(),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'title_en' => $this->string(255)->notNull()->defaultValue(''),
            'author_bn' => $this->string(255)->notNull()->defaultValue(''),
            'author_en' => $this->string(255)->notNull()->defaultValue(''),
            'category' => $this->string(128)->notNull()->defaultValue(''),
            'description' => $this->text()->null(),
            'cover_image' => $this->string(512)->notNull()->defaultValue(''),
            'pdf_url' => $this->string(1024)->notNull()->defaultValue(''),
            'is_published' => $this->tinyInteger(1)->notNull()->defaultValue(1),
            'is_featured' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'sort_order' => $this->integer()->notNull()->defaultValue(0),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_books', 'books', 'id');

        // ── generic_items (schema-less admin CRUD resources) ───────
        $this->createTable('generic_items', [
            'id' => $this->string(self::PK)->notNull(),
            'resource' => $this->string(64)->notNull(),
            'data' => $this->text()->null(),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_generic_items', 'generic_items', 'id');
        $this->createIndex('idx_gi_resource', 'generic_items', 'resource');

        // ── notifications ─────────────────────────────────────────
        $this->createTable('notifications', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'title_en' => $this->string(255)->notNull()->defaultValue(''),
            'body_bn' => $this->text()->null(),
            'body_en' => $this->text()->null(),
            'read' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_notifications', 'notifications', 'id');
        $this->createIndex('idx_notif_user', 'notifications', 'user_id');

        // ── device_tokens ─────────────────────────────────────────
        $this->createTable('device_tokens', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'token' => $this->string(512)->notNull(),
            'device_type' => $this->string(32)->notNull()->defaultValue(''),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_device_tokens', 'device_tokens', 'id');

        // ── activity_logs ─────────────────────────────────────────
        $this->createTable('activity_logs', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'action' => $this->string(64)->notNull()->defaultValue(''),
            'target' => $this->string(255)->notNull()->defaultValue(''),
            'meta' => $this->text()->null(),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_activity_logs', 'activity_logs', 'id');
        $this->createIndex('idx_al_user', 'activity_logs', 'user_id');
    }

    public function safeDown(): void
    {
        foreach (['dua_favorites', 'activity_logs', 'device_tokens', 'notifications', 'generic_items', 'books', 'library_categories', 'complaints', 'duas', 'dua_categories'] as $t) {
            $this->dropTable($t);
        }
    }
}
