<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Json;
use app\helpers\Uuid;
use Yii;

/**
 * Schema-less admin CRUD for the register_crud resources (course_categories,
 * chapters, lessons, pdfs, assignments, exams, results, certificates,
 * recorded_classes, hadiths, islamic_content, blogs, banners, sliders, gallery,
 * downloads, winner_reviews). Docs are stored as JSON in generic_items.
 *
 *   /{resource}         GET list / POST create   (public read, admin write)
 *   /{resource}/{id}    GET / PUT / DELETE
 */
class GenericController extends ApiController
{
    private const ALLOWED = [
        'course_categories', 'chapters', 'lessons', 'pdfs', 'assignments', 'exams',
        'results', 'certificates', 'recorded_classes', 'hadiths', 'islamic_content',
        'blogs', 'banners', 'sliders', 'gallery', 'downloads', 'winner_reviews',
    ];

    public function actionIndex(): \yii\web\Response
    {
        $resource = (string) Yii::$app->request->get('resource', '');
        $this->assertResource($resource);

        if (Yii::$app->request->isPost) {
            $this->requireAdmin();
            $body = Yii::$app->request->post();
            $doc = [
                'id' => Uuid::v4(),
                'resource' => $resource,
                'data' => json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'created_at' => $this->now(),
                'updated_at' => null,
            ];
            Yii::$app->db->createCommand()->insert('generic_items', $doc)->execute();
            $out = $body;
            $out['id'] = $doc['id'];
            $out['created_at'] = $doc['created_at'];
            return $this->json($out);
        }

        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM generic_items WHERE resource = :r ORDER BY created_at DESC LIMIT 200', [':r' => $resource]
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->mergeDoc($r), $rows));
    }

    public function actionItem(string $id): \yii\web\Response
    {
        $resource = (string) Yii::$app->request->get('resource', '');
        $this->assertResource($resource);

        $row = Yii::$app->db->createCommand(
            'SELECT * FROM generic_items WHERE resource = :r AND id = :id', [':r' => $resource, ':id' => $id]
        )->queryOne();
        if ($row === false) {
            $this->notFound('Not Found');
        }

        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            $this->requireAdmin();
            $data = $request->post();
            Yii::$app->db->createCommand()->update('generic_items', [
                'data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'updated_at' => $this->now(),
            ], ['id' => $id])->execute();
            $out = $data;
            $out['id'] = $id;
            return $this->json($out);
        }
        if ($request->isDelete) {
            $this->requireAdmin();
            Yii::$app->db->createCommand()->delete('generic_items', ['id' => $id])->execute();
            return $this->json(['ok' => true, 'deleted' => 1]);
        }

        return $this->json($this->mergeDoc($row));
    }

    private function mergeDoc(array $row): array
    {
        $data = json_decode((string) ($row['data'] ?? 'null'), true);
        if (!is_array($data)) {
            $data = [];
        }
        $data['id'] = $row['id'];
        $data['created_at'] = $row['created_at'];
        $data['updated_at'] = $row['updated_at'];
        return $data;
    }

    private function assertResource(string $resource): void
    {
        if (!in_array($resource, self::ALLOWED, true)) {
            $this->notFound('Not Found');
        }
    }
}
