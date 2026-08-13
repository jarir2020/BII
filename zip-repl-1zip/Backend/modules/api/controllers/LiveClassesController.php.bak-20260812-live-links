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

    /** GET /api/my-live-classes (via url rule) — classes for the user's courses. */
    public function actionMy(): \yii\web\Response
    {
        $user = $this->user();
        $courseIds = Yii::$app->db->createCommand(
            'SELECT course_id FROM enrollments WHERE user_id = :uid',
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
