<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Json;
use app\helpers\Uuid;
use Yii;

/**
 * /api/courses/* — courses + enroll + content + my-courses.
 * is_free forces price=0; /live-classes is admin-only; enroll mocks payment.
 */
class CoursesController extends ApiController
{
    private const BOOL_FIELDS = ['is_free'];
    private const FLOAT_FIELDS = ['price'];

    private function defaults(): array
    {
        return [
            'title_bn' => '', 'title_en' => '', 'description_bn' => '', 'description_en' => '',
            'price' => 0, 'is_free' => false, 'cover_image' => '', 'instructor' => '', 'duration' => '',
        ];
    }

    /** /courses — GET list, POST create. */
    public function actionIndex(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            return $this->createCourse();
        }
        $rows = Yii::$app->db->createCommand('SELECT * FROM courses ORDER BY created_at DESC')->queryAll();
        return $this->json(array_map(fn ($r) => $this->toDoc($r), $rows));
    }

    /** /courses/{id} — GET view, PUT update, DELETE delete. */
    public function actionView(string $id): \yii\web\Response
    {
        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            return $this->updateCourse($id);
        }
        if ($request->isDelete) {
            return $this->deleteCourse($id);
        }
        return $this->viewCourse($id);
    }

    public function actionEnroll(): \yii\web\Response
    {
        $user = $this->user();
        $cid = (string) Yii::$app->request->get('cid', '');
        $course = $this->findCourse($cid);
        if ($course === null) {
            $this->notFound('কোর্স পাওয়া যায়নি');
        }

        $existing = Yii::$app->db->createCommand(
            'SELECT id FROM enrollments WHERE user_id = :u AND course_id = :c',
            [':u' => $user['id'], ':c' => $cid]
        )->queryOne();
        if ($existing !== false) {
            return $this->json(['ok' => true, 'already_enrolled' => true]);
        }

        $isFree = !empty($course['is_free']);
        Yii::$app->db->createCommand()->insert('enrollments', [
            'id' => Uuid::v4(),
            'user_id' => $user['id'],
            'course_id' => $cid,
            'enrolled_at' => $this->now(),
            'payment_status' => $isFree ? 'free' : 'success',
            'amount' => $isFree ? 0 : (float) $course['price'],
        ])->execute();

        return $this->json(['ok' => true]);
    }

    /** GET /api/my-courses. */
    public function actionMyCourses(): \yii\web\Response
    {
        $user = $this->user();
        $courseIds = Yii::$app->db->createCommand(
            'SELECT course_id FROM enrollments WHERE user_id = :uid', [':uid' => $user['id']]
        )->queryColumn();
        if ($courseIds === []) {
            return $this->json([]);
        }
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM courses WHERE id IN (' . implode(',', array_fill(0, count($courseIds), '?')) . ')',
            $this->inParams($courseIds)
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->toDoc($r), $rows));
    }

    /** GET /api/courses/{cid}/content — enrolled students only. */
    public function actionContent(): \yii\web\Response
    {
        $user = $this->user();
        $cid = (string) Yii::$app->request->get('cid', '');

        $enrolled = Yii::$app->db->createCommand(
            'SELECT id FROM enrollments WHERE user_id = :u AND course_id = :c',
            [':u' => $user['id'], ':c' => $cid]
        )->queryOne();
        if ($enrolled === false) {
            $this->forbidden('এই কোর্সে আপনি ভর্তি নন');
        }

        $live = Yii::$app->db->createCommand('SELECT * FROM live_classes WHERE course_id = :c ORDER BY scheduled_at ASC', [':c' => $cid])->queryAll();
        $videos = Yii::$app->db->createCommand('SELECT * FROM videos WHERE course_id = :c ORDER BY created_at DESC', [':c' => $cid])->queryAll();
        $pdfs = $this->safePdfs($cid);

        return $this->json([
            'live_classes' => array_map(fn ($r) => $this->toDoc($r), $live),
            'videos' => array_map(fn ($r) => $this->toDoc($r), $videos),
            'pdfs' => $pdfs,
        ]);
    }

    private function viewCourse(string $id): \yii\web\Response
    {
        $row = $this->findCourse($id);
        if ($row === null) {
            $this->notFound('কোর্স পাওয়া যায়নি');
        }
        return $this->json($this->toDoc($row));
    }

    private function createCourse(): \yii\web\Response
    {
        $this->requireAdmin();
        $data = $this->buildDoc(Yii::$app->request->post());
        $data['id'] = Uuid::v4();
        $data['created_at'] = $this->now();
        Yii::$app->db->createCommand()->insert('courses', $data)->execute();
        return $this->json($this->toDoc($data));
    }

    private function updateCourse(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        if ($this->findCourse($id) === null) {
            $this->notFound('কোর্স পাওয়া যায়নি');
        }
        $data = $this->buildDoc(Yii::$app->request->post());
        $data['updated_at'] = $this->now();
        Yii::$app->db->createCommand()->update('courses', $data, ['id' => $id])->execute();
        return $this->json($this->toDoc($this->findCourse($id)));
    }

    private function deleteCourse(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        Yii::$app->db->createCommand()->delete('courses', ['id' => $id])->execute();
        Yii::$app->db->createCommand()->delete('enrollments', ['course_id' => $id])->execute();
        return $this->json(['ok' => true]);
    }

    private function buildDoc(array $body): array
    {
        $data = $this->defaults();
        foreach ($this->defaults() as $k => $v) {
            if (array_key_exists($k, $body)) {
                $data[$k] = $body[$k];
            }
        }
        if (!empty($data['is_free'])) {
            $data['price'] = 0;
        }
        return $data;
    }

    private function safePdfs(string $cid): array
    {
        // pdfs table may not exist yet (created with the files domain).
        try {
            $rows = Yii::$app->db->createCommand(
                'SELECT * FROM pdfs WHERE course_id = :c ORDER BY created_at DESC', [':c' => $cid]
            )->queryAll();
            return array_map(fn ($r) => Json::row($r), $rows);
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function findCourse(string $id): ?array
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM courses WHERE id = :id', [':id' => $id])->queryOne();
        return $row === false ? null : $row;
    }

    private function toDoc(array $row): array
    {
        return Json::row($row, [], self::BOOL_FIELDS, self::FLOAT_FIELDS);
    }
}
