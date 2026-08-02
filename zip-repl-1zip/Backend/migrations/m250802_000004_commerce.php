<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Commerce: products, promo_codes, orders, order_items, payment_requests,
 * payment_intents.
 */
class m250802_000004_commerce extends Migration
{
    private const PK = 36;

    public function safeUp(): void
    {
        // ── products ─────────────────────────────────────────────
        $this->createTable('products', [
            'id' => $this->string(self::PK)->notNull(),
            'name_bn' => $this->string(255)->notNull()->defaultValue(''),
            'name_en' => $this->string(255)->notNull()->defaultValue(''),
            'description' => $this->text()->null(),
            'price' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'discount_price' => $this->decimal(12, 2)->null(),
            'stock' => $this->integer()->notNull()->defaultValue(0),
            'category' => $this->string(128)->notNull()->defaultValue(''),
            'image' => $this->string(512)->notNull()->defaultValue(''),
            'is_active' => $this->tinyInteger(1)->notNull()->defaultValue(1),
            'is_featured' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_products', 'products', 'id');

        // ── promo_codes ──────────────────────────────────────────
        $this->createTable('promo_codes', [
            'id' => $this->string(self::PK)->notNull(),
            'code' => $this->string(64)->notNull(),
            'discount_type' => $this->string(16)->notNull()->defaultValue('flat'),
            'discount_value' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'min_order' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'max_uses' => $this->integer()->notNull()->defaultValue(0),
            'used_count' => $this->integer()->notNull()->defaultValue(0),
            'is_active' => $this->tinyInteger(1)->notNull()->defaultValue(1),
            'note' => $this->string(255)->notNull()->defaultValue(''),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_promo_codes', 'promo_codes', 'id');
        $this->createIndex('idx_promo_codes_code', 'promo_codes', 'code', true);

        // ── orders ───────────────────────────────────────────────
        $this->createTable('orders', [
            'id' => $this->string(self::PK)->notNull(),
            'order_number' => $this->string(32)->notNull()->defaultValue(''),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'customer_name' => $this->string(255)->notNull()->defaultValue(''),
            'customer_phone' => $this->string(64)->notNull()->defaultValue(''),
            'customer_address' => $this->text()->null(),
            'payment_method' => $this->string(32)->notNull()->defaultValue(''),
            'payment_number' => $this->string(64)->notNull()->defaultValue(''),
            'transaction_id' => $this->string(128)->notNull()->defaultValue(''),
            'promo_code' => $this->string(64)->notNull()->defaultValue(''),
            'discount' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'subtotal' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'total' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'status' => $this->string(32)->notNull()->defaultValue('pending'),
            'note' => $this->text()->null(),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_orders', 'orders', 'id');
        $this->createIndex('idx_orders_user', 'orders', 'user_id');

        // ── order_items ──────────────────────────────────────────
        $this->createTable('order_items', [
            'id' => $this->string(self::PK)->notNull(),
            'order_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'product_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'product_name' => $this->string(255)->notNull()->defaultValue(''),
            'qty' => $this->integer()->notNull()->defaultValue(1),
            'unit_price' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'subtotal' => $this->decimal(12, 2)->notNull()->defaultValue(0),
        ]);
        $this->addPrimaryKey('pk_order_items', 'order_items', 'id');
        $this->createIndex('idx_order_items_order', 'order_items', 'order_id');

        // ── payment_requests ─────────────────────────────────────
        $this->createTable('payment_requests', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'user_name' => $this->string(255)->notNull()->defaultValue(''),
            'user_email' => $this->string(255)->notNull()->defaultValue(''),
            'user_phone' => $this->string(64)->notNull()->defaultValue(''),
            'course_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'course_title' => $this->string(255)->notNull()->defaultValue(''),
            'transaction_id' => $this->string(128)->notNull()->defaultValue(''),
            'payment_method' => $this->string(32)->notNull()->defaultValue(''),
            'amount' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'note' => $this->text()->null(),
            'status' => $this->string(32)->notNull()->defaultValue('pending'),
            'submitted_ip' => $this->string(64)->notNull()->defaultValue(''),
            'submitted_at' => $this->string(40)->null(),
            'processed_at' => $this->string(40)->null(),
            'processed_by' => $this->string(255)->notNull()->defaultValue(''),
        ]);
        $this->addPrimaryKey('pk_payment_requests', 'payment_requests', 'id');
        $this->createIndex('idx_pr_user', 'payment_requests', 'user_id');

        // ── payment_intents (SSLCommerz) ─────────────────────────
        $this->createTable('payment_intents', [
            'id' => $this->string(64)->notNull(),   // tran_id
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'user_email' => $this->string(255)->notNull()->defaultValue(''),
            'user_name' => $this->string(255)->notNull()->defaultValue(''),
            'user_phone' => $this->string(64)->notNull()->defaultValue(''),
            'course_id' => $this->string(self::PK)->null(),
            'subscription_plan_id' => $this->string(self::PK)->null(),
            'amount' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'product_name' => $this->string(255)->notNull()->defaultValue(''),
            'status' => $this->string(32)->notNull()->defaultValue('pending'),
            'created_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_payment_intents', 'payment_intents', 'id');
    }

    public function safeDown(): void
    {
        foreach (['payment_intents', 'payment_requests', 'order_items', 'orders', 'promo_codes', 'products'] as $t) {
            $this->dropTable($t);
        }
    }
}
