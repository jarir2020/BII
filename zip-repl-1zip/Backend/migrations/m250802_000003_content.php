<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Core content: courses, videos, posts, live_classes, quizzes,
 * monthly_quizzes, quiz_sessions, monthly_quiz_submissions, enrollments.
 * Nested structures (questions, rules, winners, detail) are stored as JSON.
 */
class m250802_000003_content extends Migration
{
    private const PK = 36;

    public function safeUp(): void
    {
        // ── courses ──────────────────────────────────────────────
        $this->createTable('courses', [
            'id' => $this->string(self::PK)->notNull(),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'title_en' => $this->string(255)->notNull()->defaultValue(''),
            'description_bn' => $this->text()->null(),
            'description_en' => $this->text()->null(),
            'price' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'is_free' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'cover_image' => $this->string(512)->notNull()->defaultValue(''),
            'instructor' => $this->string(255)->notNull()->defaultValue(''),
            'duration' => $this->string(64)->notNull()->defaultValue(''),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_courses', 'courses', 'id');
        $this->createIndex('idx_courses_created', 'courses', 'created_at');

        // ── videos ───────────────────────────────────────────────
        $this->createTable('videos', [
            'id' => $this->string(self::PK)->notNull(),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'title_en' => $this->string(255)->notNull()->defaultValue(''),
            'description' => $this->text()->null(),
            'video_url' => $this->string(1024)->notNull()->defaultValue(''),
            'thumbnail' => $this->string(512)->notNull()->defaultValue(''),
            'course_id' => $this->string(self::PK)->null(),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_videos', 'videos', 'id');

        // ── posts ────────────────────────────────────────────────
        $this->createTable('posts', [
            'id' => $this->string(self::PK)->notNull(),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'title_en' => $this->string(255)->notNull()->defaultValue(''),
            'body_bn' => $this->text()->null(),
            'body_en' => $this->text()->null(),
            'cover_image' => $this->string(512)->notNull()->defaultValue(''),
            'course_id' => $this->string(self::PK)->null(),
            'cta_label_bn' => $this->string(255)->notNull()->defaultValue('বিস্তারিত দেখুন'),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_posts', 'posts', 'id');

        // ── live_classes ─────────────────────────────────────────
        $this->createTable('live_classes', [
            'id' => $this->string(self::PK)->notNull(),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'title_en' => $this->string(255)->notNull()->defaultValue(''),
            'join_url' => $this->string(1024)->notNull()->defaultValue(''),
            'scheduled_at' => $this->string(40)->null(),
            'description' => $this->text()->null(),
            'course_id' => $this->string(self::PK)->null(),
            'is_free' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_live_classes', 'live_classes', 'id');

        // ── quizzes ──────────────────────────────────────────────
        $this->createTable('quizzes', [
            'id' => $this->string(self::PK)->notNull(),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'title_en' => $this->string(255)->notNull()->defaultValue(''),
            'description' => $this->text()->null(),
            'month' => $this->string(32)->notNull()->defaultValue(''),
            'questions' => $this->text()->null(),
            'starts_at' => $this->string(40)->null(),
            'ends_at' => $this->string(40)->null(),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_quizzes', 'quizzes', 'id');

        // ── monthly_quizzes ──────────────────────────────────────
        $this->createTable('monthly_quizzes', [
            'id' => $this->string(self::PK)->notNull(),
            'title_bn' => $this->string(255)->notNull()->defaultValue(''),
            'title_en' => $this->string(255)->notNull()->defaultValue(''),
            'exam_date' => $this->string(16)->notNull()->defaultValue(''),
            'start_time' => $this->string(8)->notNull()->defaultValue(''),
            'end_time' => $this->string(8)->notNull()->defaultValue(''),
            'start_at' => $this->string(19)->notNull()->defaultValue(''), // 2026-08-24: full datetime window
            'end_at' => $this->string(19)->notNull()->defaultValue(''),
            'duration_minutes' => $this->integer()->notNull()->defaultValue(30),
            'pass_marks' => $this->integer()->notNull()->defaultValue(0),
            'rules' => $this->text()->null(),
            'prize_title' => $this->string(255)->notNull()->defaultValue(''),
            'prize_description' => $this->text()->null(),
            'prize_image' => $this->string(512)->notNull()->defaultValue(''),
            'is_active' => $this->tinyInteger(1)->notNull()->defaultValue(1),
            'questions' => $this->text()->null(),
            'winners' => $this->text()->null(),
            'created_at' => $this->string(40)->null(),
            'updated_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_monthly_quizzes', 'monthly_quizzes', 'id');

        // ── quiz_sessions ────────────────────────────────────────
        $this->createTable('quiz_sessions', [
            'id' => $this->string(self::PK)->notNull(),
            'quiz_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'started_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_quiz_sessions', 'quiz_sessions', 'id');
        $this->createIndex('idx_quiz_sessions_quiz_user', 'quiz_sessions', ['quiz_id', 'user_id']);

        // ── monthly_quiz_submissions ─────────────────────────────
        $this->createTable('monthly_quiz_submissions', [
            'id' => $this->string(self::PK)->notNull(),
            'quiz_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'user_name' => $this->string(255)->notNull()->defaultValue(''),
            'user_email' => $this->string(255)->notNull()->defaultValue(''),
            'user_phone' => $this->string(64)->notNull()->defaultValue(''),
            'user_address' => $this->text()->null(),
            'student_id' => $this->string(32)->notNull()->defaultValue(''),
            'score' => $this->integer()->notNull()->defaultValue(0),
            'total_marks' => $this->integer()->notNull()->defaultValue(0),
            'passed' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'detail' => $this->text()->null(),
            'time_taken_seconds' => $this->integer()->notNull()->defaultValue(0),
            'submitted_at' => $this->string(40)->null(),
        ]);
        $this->addPrimaryKey('pk_monthly_quiz_submissions', 'monthly_quiz_submissions', 'id');
        $this->createIndex('idx_mqs_quiz_user', 'monthly_quiz_submissions', ['quiz_id', 'user_id']);

        // ── enrollments ──────────────────────────────────────────
        $this->createTable('enrollments', [
            'id' => $this->string(self::PK)->notNull(),
            'user_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'course_id' => $this->string(self::PK)->notNull()->defaultValue(''),
            'enrolled_at' => $this->string(40)->null(),
            'payment_status' => $this->string(32)->notNull()->defaultValue(''),
            'amount' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'transaction_id' => $this->string(128)->notNull()->defaultValue(''),
            'payment_method' => $this->string(32)->notNull()->defaultValue(''),
        ]);
        $this->addPrimaryKey('pk_enrollments', 'enrollments', 'id');
        $this->createIndex('idx_enroll_user_course', 'enrollments', ['user_id', 'course_id']);
    }

    public function safeDown(): void
    {
        foreach (['enrollments', 'monthly_quiz_submissions', 'quiz_sessions', 'monthly_quizzes', 'quizzes', 'live_classes', 'posts', 'videos', 'courses'] as $t) {
            $this->dropTable($t);
        }
    }
}
