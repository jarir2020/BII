<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

require_once __DIR__ . '/../../../tests/_bootstrap.php';

use app\helpers\Time;
use app\helpers\Uuid;
use app\models\User;
use Yii;

/**
 * Shared bootstrap for API controller unit tests.
 * Sets up SQLite DB and runs all migrations before each test.
 */
abstract class ApiControllerTestCase extends \PHPUnit\Framework\TestCase
{
    protected function setUp(): void
    {
        putenv('YII_ENV=test');
        // Ensure Yii2 web request has entry script info in CLI context
        $_SERVER['SCRIPT_NAME'] = '/index.php';
        $_SERVER['REQUEST_URI'] = '/';
        $_SERVER['PHP_SELF'] = '/index.php';
        $_SERVER['SERVER_NAME'] = 'localhost';
        $_SERVER['SERVER_PORT'] = '80';
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $app = new \yii\web\Application(require __DIR__ . '/../../../config/test.php');
        $app->run();
        $this->setUpDatabase();
    }

    protected function tearDown(): void
    {
        // Reset request method to GET for the next test
        $_SERVER['REQUEST_METHOD'] = 'GET';
        // Reset $_POST to prevent leaking between tests
        $_POST = [];
        // Reset body params to null so getBodyParam() re-reads from $_POST
        if (Yii::$app) {
            Yii::$app->request->bodyParams = null;
        }
        parent::tearDown();
    }

    /**
     * Set the simulated HTTP method for the current test request.
     * Uses $_SERVER instead of the read-only isPost/isPut/isDelete properties.
     */
    protected function setMethod(string $method): void
    {
        $_SERVER['REQUEST_METHOD'] = $method;
    }

    /**
     * Set the request body params (used for POST/PUT/DELETE where $_POST may not be read).
     */
    protected function setBody(array $params): void
    {
        Yii::$app->request->bodyParams = $params;
    }

    protected function setUpDatabase(): void
    {
        $db = Yii::$app->db;
        $cm = $db->createCommand();

        // Drop all existing tables
        foreach ($db->schema->getTableNames() as $table) {
            $cm->dropTable($table)->execute();
        }

        $now = Time::now();
        $uid = fn() => Uuid::v4();

        // ── counters ──────────────────────────────────────────────
        $cm->createTable('counters', [
            'name'    => 'VARCHAR(64) NOT NULL PRIMARY KEY',
            'seq'     => 'BIGINT NOT NULL DEFAULT 0',
        ])->execute();

        // ── users ─────────────────────────────────────────────────
        $cm->createTable('users', [
            'id'            => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'name'          => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'email'         => 'VARCHAR(255) NOT NULL',
            'password_hash' => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'role'          => 'VARCHAR(32) NOT NULL DEFAULT \'student\'',
            'student_id'    => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'phone'         => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'address'       => 'TEXT',            'profile_photo' => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'permissions' => 'TEXT',
            'bio' => 'TEXT',
            'specialization' => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'status' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'created_at' => 'VARCHAR(40)',
            'updated_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_users_email', 'users', 'email', true)->execute();
        $cm->createIndex('idx_users_student_id', 'users', 'student_id')->execute();

        // ── login_logs ────────────────────────────────────────────
        $cm->createTable('login_logs', [
            'id'         => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'    => 'VARCHAR(36)',
            'email'      => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'name'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'student_id' => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'role'       => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'ip'         => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'user_agent' => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'success'    => 'TINYINT(1) NOT NULL DEFAULT 0',
            'created_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_login_logs_email_time', 'login_logs', ['email', 'created_at'])->execute();
        $cm->createIndex('idx_login_logs_user_id', 'login_logs', 'user_id')->execute();

        // ── password_resets ───────────────────────────────────────
        $cm->createTable('password_resets', [
            'id'        => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'   => 'VARCHAR(36)',
            'email'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'otp'       => 'VARCHAR(16) NOT NULL DEFAULT \'\'',
            'token'     => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'used'      => 'TINYINT(1) NOT NULL DEFAULT 0',
            'expires_at'=> 'VARCHAR(40)',
            'created_at'=> 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_password_resets_email', 'password_resets', 'email')->execute();

        // ── settings ──────────────────────────────────────────────
        $cm->createTable('settings', [
            'id'         => 'VARCHAR(64) NOT NULL PRIMARY KEY',
            'data'       => 'TEXT',
            'updated_at' => 'VARCHAR(40)',
            'updated_by' => 'VARCHAR(36)',
        ])->execute();

        // ── courses ───────────────────────────────────────────────
        $cm->createTable('courses', [
            'id'             => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title_bn'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'title_en'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'description_bn' => 'TEXT',
            'description_en' => 'TEXT',
            'price'          => 'REAL NOT NULL DEFAULT 0',
            'is_free'        => 'TINYINT(1) NOT NULL DEFAULT 0',
            'cover_image'    => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'instructor'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'duration'       => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'created_at'     => 'VARCHAR(40)',
            'updated_at'     => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_courses_created', 'courses', 'created_at')->execute();

        // ── videos ────────────────────────────────────────────────
        $cm->createTable('videos', [
            'id'          => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title_bn'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'title_en'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'description' => 'TEXT',
            'video_url'   => 'VARCHAR(1024) NOT NULL DEFAULT \'\'',
            'thumbnail'   => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'course_id'   => 'VARCHAR(36)',
            'duration'    => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'created_at'  => 'VARCHAR(40)',
            'updated_at'  => 'VARCHAR(40)',
        ])->execute();

        // ── posts ─────────────────────────────────────────────────
        $cm->createTable('posts', [
            'id'           => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title_bn'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'title_en'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'body_bn'      => 'TEXT',
            'body_en'      => 'TEXT',
            'cover_image'  => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'course_id'    => 'VARCHAR(36)',
            'cta_label_bn' => 'VARCHAR(255) NOT NULL DEFAULT \'বিস্তারিত দেখুন\'',
            'created_at'   => 'VARCHAR(40)',
            'updated_at'   => 'VARCHAR(40)',
        ])->execute();

        // ── live_classes ──────────────────────────────────────────
        $cm->createTable('live_classes', [
            'id'          => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title_bn'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'title_en'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'join_url'    => 'VARCHAR(1024) NOT NULL DEFAULT \'\'',
            'scheduled_at'=> 'VARCHAR(40)',
            'description' => 'TEXT',
            'course_id'   => 'VARCHAR(36)',
            'is_free'     => 'TINYINT(1) NOT NULL DEFAULT 0',
            'created_at'  => 'VARCHAR(40)',
            'updated_at'  => 'VARCHAR(40)',
        ])->execute();

        // ── quizzes ───────────────────────────────────────────────
        $cm->createTable('quizzes', [
            'id'          => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title_bn'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'title_en'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'description' => 'TEXT',
            'month'       => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'questions'   => 'TEXT',
            'starts_at'   => 'VARCHAR(40)',
            'ends_at'     => 'VARCHAR(40)',
            'created_at'  => 'VARCHAR(40)',
            'updated_at'  => 'VARCHAR(40)',
        ])->execute();

        // ── monthly_quizzes ───────────────────────────────────────
        $cm->createTable('monthly_quizzes', [
            'id'               => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title_bn'         => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'title_en'         => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'exam_date'        => 'VARCHAR(16) NOT NULL DEFAULT \'\'',
            'start_time'       => 'VARCHAR(8) NOT NULL DEFAULT \'\'',
            'end_time'         => 'VARCHAR(8) NOT NULL DEFAULT \'\'',
            'duration_minutes' => 'INTEGER NOT NULL DEFAULT 30',
            'pass_marks'       => 'INTEGER NOT NULL DEFAULT 0',
            'rules'            => 'TEXT',
            'prize_title'      => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'prize_description'=> 'TEXT',
            'prize_image'      => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'is_active'        => 'TINYINT(1) NOT NULL DEFAULT 1',
            'questions'        => 'TEXT',
            'winners'          => 'TEXT',
            'created_at'       => 'VARCHAR(40)',
            'updated_at'       => 'VARCHAR(40)',
        ])->execute();

        // ── quiz_sessions ─────────────────────────────────────────
        $cm->createTable('quiz_sessions', [
            'id'         => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'quiz_id'    => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'user_id'    => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'started_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_quiz_sessions_quiz_user', 'quiz_sessions', ['quiz_id', 'user_id'])->execute();

        // ── monthly_quiz_submissions ──────────────────────────────
        $cm->createTable('monthly_quiz_submissions', [
            'id'                    => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'quiz_id'               => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'user_id'               => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'user_name'             => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'user_email'            => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'user_phone'            => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'user_address'          => 'TEXT',
            'student_id'            => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'score'                 => 'INTEGER NOT NULL DEFAULT 0',
            'total_marks'           => 'INTEGER NOT NULL DEFAULT 0',
            'passed'                => 'TINYINT(1) NOT NULL DEFAULT 0',
            'detail'                => 'TEXT',
            'time_taken_seconds'    => 'INTEGER NOT NULL DEFAULT 0',
            'submitted_at'          => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_mqs_quiz_user', 'monthly_quiz_submissions', ['quiz_id', 'user_id'])->execute();

        // ── enrollments ───────────────────────────────────────────
        $cm->createTable('enrollments', [
            'id'             => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'        => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'course_id'      => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'enrolled_at'    => 'VARCHAR(40)',
            'payment_status' => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'amount'         => 'REAL NOT NULL DEFAULT 0',
            'transaction_id' => 'VARCHAR(128) NOT NULL DEFAULT \'\'',
            'payment_method' => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
        ])->execute();
        $cm->createIndex('idx_enroll_user_course', 'enrollments', ['user_id', 'course_id'])->execute();
        $cm->createIndex('idx_enrollments_user_id', 'enrollments', 'user_id')->execute();
        $cm->createIndex('idx_enrollments_course_id', 'enrollments', 'course_id')->execute();

        // ── products ──────────────────────────────────────────────
        $cm->createTable('products', [
            'id'              => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'name_bn'         => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'name_en'         => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'description'     => 'TEXT',
            'price'           => 'REAL NOT NULL DEFAULT 0',
            'discount_price'  => 'REAL',
            'stock'           => 'INTEGER NOT NULL DEFAULT 0',
            'category'        => 'VARCHAR(128) NOT NULL DEFAULT \'\'',
            'image'           => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'images'          => 'TEXT',
            'video_url'       => 'VARCHAR(1024) NOT NULL DEFAULT \'\'',
            'is_active'       => 'TINYINT(1) NOT NULL DEFAULT 1',
            'is_featured'     => 'TINYINT(1) NOT NULL DEFAULT 0',
            'created_at'      => 'VARCHAR(40)',
            'updated_at'      => 'VARCHAR(40)',
        ])->execute();

        // ── promo_codes ───────────────────────────────────────────
        $cm->createTable('promo_codes', [
            'id'              => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'code'            => 'VARCHAR(64) NOT NULL',
            'discount_type'   => 'VARCHAR(16) NOT NULL DEFAULT \'flat\'',
            'discount_value'  => 'REAL NOT NULL DEFAULT 0',
            'min_order'       => 'REAL NOT NULL DEFAULT 0',
            'max_uses'        => 'INTEGER NOT NULL DEFAULT 0',
            'used_count'      => 'INTEGER NOT NULL DEFAULT 0',
            'is_active'       => 'TINYINT(1) NOT NULL DEFAULT 1',
            'note'            => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'created_at'      => 'VARCHAR(40)',
            'created_by_user' => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'given_to_student_id' => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'given_by_admin_id'   => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'source'          => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
        ])->execute();
        $cm->createIndex('idx_promo_codes_code', 'promo_codes', 'code', true)->execute();
        $cm->createIndex('idx_promo_codes_created_by_user', 'promo_codes', 'created_by_user')->execute();

        // ── orders ────────────────────────────────────────────────
        $cm->createTable('orders', [
            'id'               => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'order_number'     => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'user_id'          => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'customer_name'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'customer_phone'   => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'customer_address' => 'TEXT',
            'payment_method'   => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'payment_number'   => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'transaction_id'   => 'VARCHAR(128) NOT NULL DEFAULT \'\'',
            'promo_code'       => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'discount'         => 'REAL NOT NULL DEFAULT 0',
            'subtotal'         => 'REAL NOT NULL DEFAULT 0',
            'total'            => 'REAL NOT NULL DEFAULT 0',
            'status'           => 'VARCHAR(32) NOT NULL DEFAULT \'pending\'',
            'note'             => 'TEXT',
            'created_at'       => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_orders_user', 'orders', 'user_id')->execute();
        $cm->createIndex('idx_orders_status', 'orders', 'status')->execute();

        // ── order_items ───────────────────────────────────────────
        $cm->createTable('order_items', [
            'id'         => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'order_id'   => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'product_id' => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'product_name' => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'qty'        => 'INTEGER NOT NULL DEFAULT 1',
            'unit_price' => 'REAL NOT NULL DEFAULT 0',
            'subtotal'   => 'REAL NOT NULL DEFAULT 0',
        ])->execute();
        $cm->createIndex('idx_order_items_order', 'order_items', 'order_id')->execute();
        $cm->createIndex('idx_order_items_order_id', 'order_items', 'order_id')->execute();

        // ── payment_requests ──────────────────────────────────────
        $cm->createTable('payment_requests', [
            'id'             => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'        => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'user_name'      => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'user_email'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'user_phone'     => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'course_id'      => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'course_title'   => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'transaction_id' => 'VARCHAR(128) NOT NULL DEFAULT \'\'',
            'payment_method' => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'amount'         => 'REAL NOT NULL DEFAULT 0',
            'note'           => 'TEXT',
            'status'         => 'VARCHAR(32) NOT NULL DEFAULT \'pending\'',
            'submitted_ip'   => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'submitted_at'   => 'VARCHAR(40)',
            'processed_at'   => 'VARCHAR(40)',
            'processed_by'   => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
        ])->execute();
        $cm->createIndex('idx_pr_user', 'payment_requests', 'user_id')->execute();
        $cm->createIndex('idx_payment_requests_status', 'payment_requests', 'status')->execute();
        $cm->createIndex('idx_payment_requests_transaction_id', 'payment_requests', 'transaction_id')->execute();

        // ── payment_intents ───────────────────────────────────────
        $cm->createTable('payment_intents', [
            'id'                      => 'VARCHAR(64) NOT NULL PRIMARY KEY',
            'user_id'                 => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'user_email'              => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'user_name'               => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'user_phone'              => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'course_id'               => 'VARCHAR(36)',
            'subscription_plan_id'    => 'VARCHAR(36)',
            'amount'                  => 'REAL NOT NULL DEFAULT 0',
            'product_name'            => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'status'                  => 'VARCHAR(32) NOT NULL DEFAULT \'pending\'',
            'created_at'              => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_payment_intents_user_id', 'payment_intents', 'user_id')->execute();
        $cm->createIndex('idx_payment_intents_status', 'payment_intents', 'status')->execute();

        // ── configs ───────────────────────────────────────────────
        $cm->createTable('configs', [
            'key'        => 'VARCHAR(64) NOT NULL PRIMARY KEY',
            'data'       => 'TEXT',
            'updated_at' => 'VARCHAR(40)',
            'updated_by' => 'VARCHAR(36)',
        ])->execute();

        // ── reward_balances ───────────────────────────────────────
        $cm->createTable('reward_balances', [
            'id'    => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id' => 'VARCHAR(36) NOT NULL',
            'coins' => 'INTEGER NOT NULL DEFAULT 0',
        ])->execute();
        $cm->createIndex('idx_rb_user', 'reward_balances', 'user_id', true)->execute();

        // ── reward_transactions ───────────────────────────────────
        $cm->createTable('reward_transactions', [
            'id'         => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'    => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'type'       => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'coins'      => 'INTEGER NOT NULL DEFAULT 0',
            'promo_code' => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'ref_id'     => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'created_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_rt_user_created', 'reward_transactions', ['user_id', 'created_at'])->execute();
        $cm->createIndex('idx_reward_transactions_user_type', 'reward_transactions', ['user_id', 'type'])->execute();

        // ── cashout_requests ──────────────────────────────────────
        $cm->createTable('cashout_requests', [
            'id'           => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'      => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'user_name'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'user_email'   => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'coins'        => 'INTEGER NOT NULL DEFAULT 0',
            'taka_amount'  => 'REAL NOT NULL DEFAULT 0',
            'payment_method' => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'payment_number' => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'status'       => 'VARCHAR(32) NOT NULL DEFAULT \'pending\'',
            'admin_note'   => 'TEXT',
            'created_at'   => 'VARCHAR(40)',
            'updated_at'   => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_cashout_requests_user_id', 'cashout_requests', 'user_id')->execute();

        // ── reward_ads ────────────────────────────────────────────
        $cm->createTable('reward_ads', [
            'id'                  => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title'               => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'ad_type'             => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'media_url'           => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'thumbnail_url'       => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'duration_seconds'    => 'INTEGER NOT NULL DEFAULT 15',
            'is_active'           => 'TINYINT(1) NOT NULL DEFAULT 1',
            'order'               => 'INTEGER NOT NULL DEFAULT 0',
            'description'         => 'TEXT',
            'created_at'          => 'VARCHAR(40)',
            'platform'            => 'VARCHAR(16) NOT NULL DEFAULT \'all\'',
        ])->execute();
        $cm->createIndex('idx_ra_platform', 'reward_ads', 'platform')->execute();

        // ── subscription_plans ────────────────────────────────────
        $cm->createTable('subscription_plans', [
            'id'            => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'name_bn'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'name_en'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'description_bn'=> 'TEXT',
            'description_en'=> 'TEXT',
            'price'         => 'REAL NOT NULL DEFAULT 0',
            'duration_days' => 'INTEGER NOT NULL DEFAULT 30',
            'features'      => 'TEXT',
            'is_active'     => 'TINYINT(1) NOT NULL DEFAULT 1',
            'created_at'    => 'VARCHAR(40)',
        ])->execute();

        // ── subscriptions ─────────────────────────────────────────
        $cm->createTable('subscriptions', [
            'id'              => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'         => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'plan_id'         => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'plan_name'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'amount'          => 'REAL NOT NULL DEFAULT 0',
            'transaction_id'  => 'VARCHAR(128) NOT NULL DEFAULT \'\'',
            'gateway'         => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'started_at'      => 'VARCHAR(40)',
            'expires_at'      => 'VARCHAR(40)',
            'status'          => 'VARCHAR(32) NOT NULL DEFAULT \'active\'',
        ])->execute();
        $cm->createIndex('idx_subscriptions_user', 'subscriptions', 'user_id')->execute();
        $cm->createIndex('idx_subscriptions_status', 'subscriptions', 'status')->execute();
        $cm->createIndex('idx_subscriptions_user_id', 'subscriptions', 'user_id')->execute();

        // ── dua_categories ────────────────────────────────────────
        $cm->createTable('dua_categories', [
            'id'          => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'name_bn'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'icon'        => 'VARCHAR(32) NOT NULL DEFAULT \'🤲\'',
            'description' => 'TEXT',
            'sort_order'  => 'INTEGER NOT NULL DEFAULT 0',
            'color'       => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
        ])->execute();

        // ── duas ──────────────────────────────────────────────────
        $cm->createTable('duas', [
            'id'             => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title_bn'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'category_id'    => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'arabic_text'    => 'TEXT',
            'transliteration'=> 'TEXT',
            'meaning_bn'     => 'TEXT',
            'when_to_read'   => 'TEXT',
            'fazilat'        => 'TEXT',
            'source'         => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'is_today_dua'   => 'TINYINT(1) NOT NULL DEFAULT 0',
            'view_count'     => 'INTEGER NOT NULL DEFAULT 0',
            'created_at'     => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_duas_is_today_dua', 'duas', 'is_today_dua')->execute();
        $cm->createIndex('idx_duas_category_id', 'duas', 'category_id')->execute();

        // ── dua_favorites ─────────────────────────────────────────
        $cm->createTable('dua_favorites', [
            'id'     => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'=> 'VARCHAR(36) NOT NULL',
            'dua_id' => 'VARCHAR(36) NOT NULL',
        ])->execute();
        $cm->createIndex('idx_df_user_dua', 'dua_favorites', ['user_id', 'dua_id'], true)->execute();

        // ── complaints ────────────────────────────────────────────
        $cm->createTable('complaints', [
            'id'        => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'   => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'user_name' => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'subject'   => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'message'   => 'TEXT',
            'status'    => 'VARCHAR(32) NOT NULL DEFAULT \'pending\'',
            'created_at'=> 'VARCHAR(40)',
        ])->execute();

        // ── library_categories ────────────────────────────────────
        $cm->createTable('library_categories', [
            'id'          => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'name_bn'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'name_en'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'description' => 'TEXT',
            'icon'        => 'VARCHAR(32) NOT NULL DEFAULT \'📚\'',
            'sort_order'  => 'INTEGER NOT NULL DEFAULT 0',
        ])->execute();

        // ── books ─────────────────────────────────────────────────
        $cm->createTable('books', [
            'id'          => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title_bn'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'title_en'    => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'author_bn'   => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'author_en'   => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'category'    => 'VARCHAR(128) NOT NULL DEFAULT \'\'',
            'description' => 'TEXT',
            'cover_image' => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'file_url'    => 'VARCHAR(1024) NOT NULL DEFAULT \'\'',
            'file_type'   => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'file_size'   => 'BIGINT NOT NULL DEFAULT 0',
            'is_published'=> 'TINYINT(1) NOT NULL DEFAULT 1',
            'is_featured' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'sort_order'  => 'INTEGER NOT NULL DEFAULT 0',
            'created_at'  => 'VARCHAR(40)',
        ])->execute();

        // ── generic_items ─────────────────────────────────────────
        $cm->createTable('generic_items', [
            'id'         => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'resource'   => 'VARCHAR(64) NOT NULL',
            'data'       => 'TEXT',
            'created_at' => 'VARCHAR(40)',
            'updated_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_gi_resource', 'generic_items', 'resource')->execute();

        // ── notifications ─────────────────────────────────────────
        $cm->createTable('notifications', [
            'id'        => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'   => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'title_bn'  => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'title_en'  => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'body_bn'   => 'TEXT',
            'body_en'   => 'TEXT',
            'read'      => 'TINYINT(1) NOT NULL DEFAULT 0',
            'created_at'=> 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_notif_user', 'notifications', 'user_id')->execute();
        $cm->createIndex('idx_notifications_user_id', 'notifications', 'user_id')->execute();

        // ── device_tokens ─────────────────────────────────────────
        $cm->createTable('device_tokens', [
            'id'         => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'    => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'token'      => 'VARCHAR(512) NOT NULL',
            'device_type'=> 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'platform'   => 'VARCHAR(32) NOT NULL DEFAULT \'\'',
            'user_email' => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'created_at' => 'VARCHAR(40)',
            'updated_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_device_tokens_user_id', 'device_tokens', 'user_id')->execute();

        // ── activity_logs ─────────────────────────────────────────
        $cm->createTable('activity_logs', [
            'id'      => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id' => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'action'  => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'target'  => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'meta'    => 'TEXT',
            'created_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_al_user', 'activity_logs', 'user_id')->execute();

        // ── contact_messages ──────────────────────────────────────
        $cm->createTable('contact_messages', [
            'id'        => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'name'      => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'email'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'phone'     => 'VARCHAR(64) NOT NULL DEFAULT \'\'',
            'subject'   => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'message'   => 'TEXT',
            'created_at'=> 'VARCHAR(40)',
        ])->execute();

        // ── push_notifications ────────────────────────────────────
        $cm->createTable('push_notifications', [
            'id'             => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'title_bn'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'title_en'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'body_bn'        => 'TEXT',
            'body_en'        => 'TEXT',
            'target'         => 'VARCHAR(64) NOT NULL DEFAULT \'all\'',
            'image_url'      => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'scheduled_for'  => 'VARCHAR(40)',
            'sent_at'        => 'VARCHAR(40)',
            'created_at'     => 'VARCHAR(40)',
            'click_action'   => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'target_user_id' => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'target_course_id'=> 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'status'         => 'VARCHAR(20) NOT NULL DEFAULT \'pending\'',
            'sent_count'     => 'INTEGER NOT NULL DEFAULT 0',
            'failed_count'   => 'INTEGER NOT NULL DEFAULT 0',
            'error'          => 'TEXT',
        ])->execute();
        $cm->createIndex('idx_push_notif_status', 'push_notifications', 'status')->execute();
        $cm->createIndex('idx_push_notif_scheduled', 'push_notifications', 'scheduled_for')->execute();

        // ── web_push_vapid_keys ───────────────────────────────────
        $cm->createTable('web_push_vapid_keys', [
            'id'          => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'public_key'  => 'VARCHAR(255) NOT NULL',
            'private_key' => 'VARCHAR(255) NOT NULL',
            'created_at'  => 'VARCHAR(40)',
        ])->execute();

        // ── web_push_subscriptions ────────────────────────────────
        $cm->createTable('web_push_subscriptions', [
            'id'         => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'    => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'endpoint'   => 'VARCHAR(1024) NOT NULL',
            'p256dh'     => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'auth'       => 'VARCHAR(255) NOT NULL DEFAULT \'\'',
            'user_agent' => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'created_at' => 'VARCHAR(40)',
            'updated_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_web_push_user', 'web_push_subscriptions', 'user_id')->execute();
        $cm->createIndex('idx_web_push_endpoint', 'web_push_subscriptions', 'endpoint', true)->execute();

        // ── course_completions (referenced by performance indexes) ─
        $cm->createTable('course_completions', [
            'id'         => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'user_id'    => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'course_id'  => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'completed_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_course_completions_user_id', 'course_completions', 'user_id')->execute();
        $cm->createIndex('idx_course_completions_course_id', 'course_completions', 'course_id')->execute();

        // ── quiz_submissions (referenced by performance indexes) ──
        $cm->createTable('quiz_submissions', [
            'id'         => 'VARCHAR(36) NOT NULL PRIMARY KEY',
            'quiz_id'    => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'user_id'    => 'VARCHAR(36) NOT NULL DEFAULT \'\'',
            'score'      => 'INTEGER NOT NULL DEFAULT 0',
            'submitted_at' => 'VARCHAR(40)',
        ])->execute();
        $cm->createIndex('idx_quiz_submissions_user_id', 'quiz_submissions', 'user_id')->execute();
        $cm->createIndex('idx_quiz_submissions_quiz_id', 'quiz_submissions', 'quiz_id')->execute();

        // Seed counters to avoid MySQL-specific ON DUPLICATE KEY UPDATE in SQLite
        $cm->insert('counters', ['name' => 'student_id', 'seq' => 100])->execute();

        // Seed default ad_slots config
        $cm->insert('configs', [
            'key' => 'ad_slots',
            'data' => json_encode([
                'courses-bottom' => true,
                'my-courses-bottom' => true,
                'live-classes-bottom' => true,
                'videos-bottom' => true,
                'quiz-bottom' => true,
                'reward-zone-bottom' => true,
                'contact-bottom' => true,
                'shop-bottom' => true,
                'notifications-bottom' => true,
                'complaints-bottom' => true,
                'library-first-click' => true,
                'payment-success-fullscreen' => true,
            ], JSON_UNESCAPED_UNICODE),
            'updated_at' => $now,
        ])->execute();
    }

    /** Create a test user and return their ID. */
    protected function createTestUser(string $role = 'student', string $email = 'test@example.com'): string
    {
        $id = Uuid::v4();
        Yii::$app->db->createCommand()->insert('users', [
            'id' => $id,
            'name' => 'Test User',
            'email' => $email,
            'password_hash' => User::hashPassword('password123'),
            'role' => $role,
            'student_id' => 'TEST001',
            'phone' => '',
            'address' => '',
            'profile_photo' => '',
            'created_at' => Time::now(),
        ])->execute();
        return $id;
    }

    /** Create an admin user and return their ID. */
    protected function createAdminUser(string $email = 'admin@example.com'): string
    {
        return $this->createTestUser('admin', $email);
    }

    /** Set up a JWT-authenticated session for the given user ID. */
    protected function authenticateAs(string $userId, string $role = 'student'): void
    {
        $jwt = Yii::$app->jwt;
        $token = $jwt->issue($userId, 'test@example.com', $role);
        // Set Bearer header so $jwt->rawToken() finds it
        Yii::$app->request->headers->set('Authorization', 'Bearer ' . $token);
    }

    /** Insert a course and return its ID. */
    protected function createTestCourse(array $extra = []): string
    {
        $id = Uuid::v4();
        $now = Time::now();
        Yii::$app->db->createCommand()->insert('courses', array_merge([
            'id' => $id,
            'title_bn' => 'টেস্ট কোর্স',
            'title_en' => 'Test Course',
            'description_bn' => null,
            'description_en' => null,
            'price' => 500,
            'is_free' => 0,
            'cover_image' => '',
            'instructor' => '',
            'duration' => '',
            'created_at' => $now,
        ], $extra))->execute();
        return $id;
    }
}
