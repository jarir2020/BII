<?php
// 2026-08-24: monthly quizzes can now span days/weeks/months —
// add full-datetime start/end columns (yyyy-mm-dd hh:mm:ss).
// Legacy exam_date + start_time/end_time remain for old rows.

use yii\db\Migration;

class m250824_000015_quiz_datetimes extends Migration
{
    public function safeUp()
    {
        if ($this->db->getTableSchema('monthly_quizzes', true) === null) {
            return true; // table created by content migration with columns below
        }
        $schema = $this->db->schema;
        if (!isset($schema->getTableSchema('monthly_quizzes')->columns['start_at'])) {
            $this->addColumn('monthly_quizzes', 'start_at', $this->string(19)->notNull()->defaultValue(''));
        }
        if (!isset($schema->getTableSchema('monthly_quizzes')->columns['end_at'])) {
            $this->addColumn('monthly_quizzes', 'end_at', $this->string(19)->notNull()->defaultValue(''));
        }
        return true;
    }

    public function safeDown()
    {
        if ($this->db->getTableSchema('monthly_quizzes', true) === null) {
            return true;
        }
        $schema = $this->db->schema;
        if (isset($schema->getTableSchema('monthly_quizzes')->columns['end_at'])) {
            $this->dropColumn('monthly_quizzes', 'end_at');
        }
        if (isset($schema->getTableSchema('monthly_quizzes')->columns['start_at'])) {
            $this->dropColumn('monthly_quizzes', 'start_at');
        }
        return true;
    }
}
