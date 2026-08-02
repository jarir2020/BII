<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Json;
use app\helpers\Uuid;
use Yii;

/**
 * /api/subscription-plans/* — plans CRUD + admin list.
 */
class SubscriptionPlansController extends ApiController
{
    private const FIELDS = ['name_bn', 'name_en', 'description_bn', 'description_en', 'price', 'duration_days', 'features', 'is_active'];
    private const DEFAULTS = [
        'name_bn' => '', 'name_en' => '', 'description_bn' => '', 'description_en' => '',
        'price' => 0, 'duration_days' => 30, 'features' => [], 'is_active' => true,
    ];

    /** /subscription-plans — GET public (active) / POST admin create. */
    public function actionIndex(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            return $this->createPlan();
        }
        $rows = Yii::$app->db->createCommand('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC')->queryAll();
        return $this->json(array_map(fn ($r) => $this->toDoc($r), $rows));
    }

    /** /subscription-plans/{id} — PUT update / DELETE. */
    public function actionView(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        $existing = $this->findPlan($id);
        if ($existing === null) {
            $this->notFound('সাবস্ক্রিপশন প্ল্যান পাওয়া যায়নি');
        }
        $request = Yii::$app->request;
        if ($request->isDelete) {
            Yii::$app->db->createCommand()->delete('subscription_plans', ['id' => $id])->execute();
            return $this->json(['ok' => true]);
        }
        // Full replacement (FastAPI $set body).
        $data = $this->buildDoc($request->post());
        Yii::$app->db->createCommand()->update('subscription_plans', Json::encodeRow($data, ['features']), ['id' => $id])->execute();
        return $this->json($this->toDoc($this->findPlan($id)));
    }

    /** GET /api/admin/subscription-plans */
    public function actionAdmin(): \yii\web\Response
    {
        $this->requireAdmin();
        $rows = Yii::$app->db->createCommand('SELECT * FROM subscription_plans ORDER BY price ASC')->queryAll();
        return $this->json(array_map(fn ($r) => $this->toDoc($r), $rows));
    }

    private function createPlan(): \yii\web\Response
    {
        $this->requireAdmin();
        $data = $this->buildDoc(Yii::$app->request->post());
        $data['id'] = Uuid::v4();
        $data['created_at'] = $this->now();
        $row = Json::encodeRow($data, ['features']);
        Yii::$app->db->createCommand()->insert('subscription_plans', $row)->execute();
        return $this->json($this->toDoc($row));
    }

    private function buildDoc(array $body): array
    {
        $data = self::DEFAULTS;
        foreach (self::FIELDS as $f) {
            if (array_key_exists($f, $body)) {
                $data[$f] = $body[$f];
            }
        }
        return $data;
    }

    private function findPlan(string $id): ?array
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM subscription_plans WHERE id = :id', [':id' => $id])->queryOne();
        return $row === false ? null : $row;
    }

    private function toDoc(array $row): array
    {
        return Json::row($row, ['features'], ['is_active'], ['price']);
    }
}
