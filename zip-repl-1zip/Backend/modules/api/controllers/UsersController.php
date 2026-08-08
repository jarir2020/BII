<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Time;
use app\models\User;
use Yii;

/**
 * /api/users/* — profile + admin user management.
 */
class UsersController extends ApiController
{
    /** GET /api/users — admin: list all users with enrollment counts. (2026-08-08) */
    public function actionIndex(): \yii\web\Response
    {
        $this->requireAdmin();

        $rows = Yii::$app->db->createCommand(
            'SELECT u.*, COUNT(e.id) AS enrollment_count
             FROM users u
             LEFT JOIN enrollments e ON e.user_id = u.id
             GROUP BY u.id
             ORDER BY u.created_at DESC
             LIMIT 500'
        )->queryAll();

        // Strip sensitive fields
        foreach ($rows as &$row) {
            unset($row['password_hash']);
        }
        unset($row);

        return $this->json($rows);
    }

    /** GET /api/users/<id>/details — admin: full user profile + enrollments + login history. (2026-08-08) */
    public function actionDetails(string $id): \yii\web\Response
    {
        $this->requireAdmin();

        $user = Yii::$app->db->createCommand(
            'SELECT * FROM users WHERE id = :id', [':id' => $id]
        )->queryOne();

        if ($user === false) {
            return $this->json(['detail' => 'ব্যবহারকারী পাওয়া যায়নি'], 404);
        }
        unset($user['password_hash']);

        $enrollments = Yii::$app->db->createCommand(
            'SELECT e.*, c.title_bn, c.title_en, c.cover_image
             FROM enrollments e
             LEFT JOIN courses c ON c.id = e.course_id
             WHERE e.user_id = :uid
             ORDER BY e.enrolled_at DESC',
            [':uid' => $id]
        )->queryAll();

        // Map course fields into a nested object for frontend compatibility
        foreach ($enrollments as &$en) {
            $en['course'] = [
                'title_bn' => $en['title_bn'],
                'title_en' => $en['title_en'],
                'cover_image' => $en['cover_image'],
            ];
            unset($en['title_bn'], $en['title_en'], $en['cover_image']);
        }
        unset($en);

        $loginHistory = Yii::$app->db->createCommand(
            'SELECT * FROM login_logs WHERE user_id = :uid ORDER BY created_at DESC LIMIT 50',
            [':uid' => $id]
        )->queryAll();

        $complaints = Yii::$app->db->createCommand(
            'SELECT * FROM complaints WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20',
            [':uid' => $id]
        )->queryAll();

        $totalSpent = Yii::$app->db->createCommand(
            'SELECT COALESCE(SUM(amount), 0) FROM enrollments WHERE user_id = :uid AND amount > 0',
            [':uid' => $id]
        )->queryScalar();

        return $this->json([
            'user' => $user,
            'enrollments' => $enrollments,
            'login_history' => $loginHistory,
            'complaints' => $complaints,
            'total_spent' => $totalSpent,
        ]);
    }

    /** PUT /api/users/me — update own profile. */
    public function actionMe(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();

        $updates = [];
        foreach (['name', 'phone', 'address', 'profile_photo'] as $field) {
            if (array_key_exists($field, $body) && $body[$field] !== null) {
                $updates[$field] = (string) $body[$field];
            }
        }
        if ($updates !== []) {
            $updates['updated_at'] = Time::now();
            Yii::$app->db->createCommand()->update('users', $updates, ['id' => $user['id']])->execute();
        }

        $doc = User::findById($user['id']);
        return $this->json(User::clean($doc));
    }
}
