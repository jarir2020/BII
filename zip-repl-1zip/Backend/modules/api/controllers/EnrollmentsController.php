<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/enrollments — admin enrollment list with nested user/course data.
 */
class EnrollmentsController extends ApiController
{
    public function actionIndex(): \yii\web\Response
    {
        $this->requireAdmin();

        $rows = Yii::$app->db->createCommand(
            'SELECT
                e.id, e.user_id, e.course_id, e.enrolled_at, e.payment_status,
                e.amount, e.transaction_id, e.payment_method,
                u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
                u.student_id AS user_student_id, u.profile_photo AS user_profile_photo,
                c.title_bn AS course_title_bn, c.title_en AS course_title_en,
                c.instructor AS course_instructor, c.cover_image AS course_cover_image,
                c.price AS course_price, c.is_free AS course_is_free, c.duration AS course_duration
             FROM enrollments e
             LEFT JOIN users u ON u.id = e.user_id
             LEFT JOIN courses c ON c.id = e.course_id
             ORDER BY e.enrolled_at DESC
             LIMIT 1000'
        )->queryAll();

        return $this->json(array_map(static function (array $row): array {
            return [
                'id' => $row['id'],
                'user_id' => $row['user_id'],
                'course_id' => $row['course_id'],
                'enrolled_at' => $row['enrolled_at'],
                'payment_status' => $row['payment_status'],
                'amount' => (float) $row['amount'],
                'transaction_id' => $row['transaction_id'],
                'payment_method' => $row['payment_method'],
                'user' => [
                    'id' => $row['user_id'],
                    'name' => $row['user_name'] ?? '',
                    'email' => $row['user_email'] ?? '',
                    'phone' => $row['user_phone'] ?? '',
                    'student_id' => $row['user_student_id'] ?? '',
                    'profile_photo' => $row['user_profile_photo'] ?? '',
                ],
                'course' => [
                    'id' => $row['course_id'],
                    'title_bn' => $row['course_title_bn'] ?? '',
                    'title_en' => $row['course_title_en'] ?? '',
                    'instructor' => $row['course_instructor'] ?? '',
                    'cover_image' => $row['course_cover_image'] ?? '',
                    'price' => (float) ($row['course_price'] ?? 0),
                    'is_free' => in_array((string) ($row['course_is_free'] ?? '0'), ['1', 'true'], true),
                    'duration' => $row['course_duration'] ?? '',
                ],
            ];
        }, $rows));
    }
}
