<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Add performance indexes for frequently queried columns.
 *
 * 2026-08-09: Covers N+1 fix lookups, status filters, and list query columns.
 */
class m250809_000001_add_performance_indexes extends Migration
{
    public function safeUp(): void
    {
        // payment_intents — user lookups + status filter
        $this->createIndex('idx_payment_intents_user_id', 'payment_intents', 'user_id');
        $this->createIndex('idx_payment_intents_status', 'payment_intents', 'status');

        // login_logs — user history lookups
        $this->createIndex('idx_login_logs_user_id', 'login_logs', 'user_id');

        // payment_requests — status filter + transaction_id lookup
        $this->createIndex('idx_payment_requests_status', 'payment_requests', 'status');
        $this->createIndex('idx_payment_requests_transaction_id', 'payment_requests', 'transaction_id');

        // orders — status filter + user lookups
        $this->createIndex('idx_orders_status', 'orders', 'status');
        $this->createIndex('idx_orders_user_id', 'orders', 'user_id');

        // subscriptions — status filter + user lookups
        $this->createIndex('idx_subscriptions_status', 'subscriptions', 'status');
        $this->createIndex('idx_subscriptions_user_id', 'subscriptions', 'user_id');

        // duas — today-featured + category filter
        $this->createIndex('idx_duas_is_today_dua', 'duas', 'is_today_dua');
        $this->createIndex('idx_duas_category_id', 'duas', 'category_id');

        // promo_codes — creator lookup
        $this->createIndex('idx_promo_codes_created_by_user', 'promo_codes', 'created_by_user');

        // reward_transactions — user + type (leaderboard, daily stats)
        $this->createIndex('idx_reward_transactions_user_type', 'reward_transactions', ['user_id', 'type']);

        // order_items — order_id (batch fetch in my-orders)
        $this->createIndex('idx_order_items_order_id', 'order_items', 'order_id');

        // enrollments — user + course lookups
        $this->createIndex('idx_enrollments_user_id', 'enrollments', 'user_id');
        $this->createIndex('idx_enrollments_course_id', 'enrollments', 'course_id');

        // course_completions — user + course
        $this->createIndex('idx_course_completions_user_id', 'course_completions', 'user_id');
        $this->createIndex('idx_course_completions_course_id', 'course_completions', 'course_id');

        // cashout_requests — user lookups
        $this->createIndex('idx_cashout_requests_user_id', 'cashout_requests', 'user_id');

        // quizzes / quiz_submissions — user + quiz
        $this->createIndex('idx_quiz_submissions_user_id', 'quiz_submissions', 'user_id');
        $this->createIndex('idx_quiz_submissions_quiz_id', 'quiz_submissions', 'quiz_id');

        // notifications — user lookups
        $this->createIndex('idx_notifications_user_id', 'notifications', 'user_id');
    }

    public function safeDown(): void
    {
        $this->dropIndex('idx_payment_intents_user_id', 'payment_intents');
        $this->dropIndex('idx_payment_intents_status', 'payment_intents');
        $this->dropIndex('idx_login_logs_user_id', 'login_logs');
        $this->dropIndex('idx_payment_requests_status', 'payment_requests');
        $this->dropIndex('idx_payment_requests_transaction_id', 'payment_requests');
        $this->dropIndex('idx_orders_status', 'orders');
        $this->dropIndex('idx_orders_user_id', 'orders');
        $this->dropIndex('idx_subscriptions_status', 'subscriptions');
        $this->dropIndex('idx_subscriptions_user_id', 'subscriptions');
        $this->dropIndex('idx_duas_is_today_dua', 'duas');
        $this->dropIndex('idx_duas_category_id', 'duas');
        $this->dropIndex('idx_promo_codes_created_by_user', 'promo_codes');
        $this->dropIndex('idx_reward_transactions_user_type', 'reward_transactions');
        $this->dropIndex('idx_order_items_order_id', 'order_items');
        $this->dropIndex('idx_enrollments_user_id', 'enrollments');
        $this->dropIndex('idx_enrollments_course_id', 'enrollments');
        $this->dropIndex('idx_course_completions_user_id', 'course_completions');
        $this->dropIndex('idx_course_completions_course_id', 'course_completions');
        $this->dropIndex('idx_cashout_requests_user_id', 'cashout_requests');
        $this->dropIndex('idx_quiz_submissions_user_id', 'quiz_submissions');
        $this->dropIndex('idx_quiz_submissions_quiz_id', 'quiz_submissions');
        $this->dropIndex('idx_notifications_user_id', 'notifications');
    }
}
