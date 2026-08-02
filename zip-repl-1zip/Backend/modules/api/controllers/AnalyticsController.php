<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/analytics — admin dashboard counts.
 */
class AnalyticsController extends ApiController
{
    public function actionIndex(): \yii\web\Response
    {
        $this->requireAdmin();
        $db = Yii::$app->db;
        $today = gmdate('Y-m-d');

        $count = fn (string $sql, array $p = []) => (int) $db->createCommand($sql, $p)->queryScalar();
        $giCount = fn (string $res) => $count('SELECT COUNT(*) FROM generic_items WHERE resource = :r', [':r' => $res]);

        $revenue = (float) $db->createCommand(
            'SELECT COALESCE(SUM(amount),0) FROM enrollments WHERE payment_status = "success"'
        )->queryScalar();
        $loginsRecent = (int) $db->createCommand(
            'SELECT COUNT(*) FROM login_logs WHERE created_at >= :ts', [':ts' => gmdate('Y-m-d\TH:i:s', time() - 7 * 86400)]
        )->queryScalar();

        return $this->json([
            'students' => $count('SELECT COUNT(*) FROM users WHERE role = "student"'),
            'teachers' => $count('SELECT COUNT(*) FROM users WHERE role = "teacher"'),
            'admins' => $count('SELECT COUNT(*) FROM users WHERE role IN ("admin","super_admin")'),
            'courses' => $count('SELECT COUNT(*) FROM courses'),
            'lessons' => $giCount('lessons'),
            'videos' => $count('SELECT COUNT(*) FROM videos'),
            'pdfs' => $giCount('pdfs'),
            'live_classes' => $count('SELECT COUNT(*) FROM live_classes'),
            'enrollments' => $count('SELECT COUNT(*) FROM enrollments'),
            'orders' => $count('SELECT COUNT(*) FROM orders'),
            'products' => $count('SELECT COUNT(*) FROM products'),
            'hadiths' => $giCount('hadiths'),
            'notifications' => $count('SELECT COUNT(*) FROM notifications'),
            'revenue' => $revenue,
            'logins_recent' => $loginsRecent,
            'date' => $today,
        ]);
    }
}
