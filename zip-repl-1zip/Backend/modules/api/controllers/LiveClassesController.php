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
        $courseIds = Yii::$app->db->createCommand(
            'SELECT course_id FROM enrollments
             WHERE user_id = :uid
               AND payment_status IN ("success", "paid", "completed", "free")',
            [':uid' => $user['id']]
        )->queryColumn();

        if ($courseIds === []) {
            return $this->json([]);
        }

        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM live_classes WHERE course_id IN (' . implode(',', array_fill(0, count($courseIds), '?')) . ') ORDER BY scheduled_at ASC',
            $this->inParams($courseIds)
        )->queryAll();

        return $this->json(array_map(fn ($r) => $this->toDoc($r), $rows));
    }
}
