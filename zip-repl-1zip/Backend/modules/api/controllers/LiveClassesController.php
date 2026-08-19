<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

class LiveClassesController extends CrudController
{
    protected string $table = 'live_classes';
    protected array $fields = ['title_bn', 'title_en', 'join_url', 'scheduled_at', 'description', 'course_id', 'is_free'];
    protected array $defaults = [
        'title_bn' => '', 'title_en' => '', 'join_url' => '', 'scheduled_at' => '',
        'description' => '', 'course_id' => '', 'is_free' => false,
    ];
    protected array $boolFields = ['is_free'];

    // GET /live-classes is admin-only in FastAPI (students use /my-live-classes).
    protected bool $publicRead = false;

    /** Reject partial/Bengali values instead of allowing them to become browser-relative URLs. */
    protected function postProcess(array &$data): void
    {
        $joinUrl = trim((string) ($data['join_url'] ?? ''));
        if ($joinUrl === '') {
            $data['join_url'] = '';
            return;
        }

        $parts = parse_url($joinUrl);
        if (!is_array($parts) || !in_array(strtolower((string) ($parts['scheme'] ?? '')), ['http', 'https'], true)) {
            $data['join_url'] = '';
        } else {
            $data['join_url'] = $joinUrl;
        }
    }

    /** GET /api/my-live-classes (via url rule) — classes for the user's courses. */
    public function actionMy(): \yii\web\Response
    {
        $user = $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT lc.*
             FROM live_classes lc
             WHERE COALESCE(lc.is_free, 0) = 1
                OR EXISTS (
                    SELECT 1
                    FROM enrollments e
                    WHERE e.user_id = :uid
                      AND e.course_id = lc.course_id
                      AND e.payment_status IN ("success", "paid", "completed", "approved")
                )
             ORDER BY lc.scheduled_at ASC',
            [':uid' => $user['id']]
        )->queryAll();

        return $this->json(array_map(fn ($r) => $this->toDoc($r), $rows));
    }
}
