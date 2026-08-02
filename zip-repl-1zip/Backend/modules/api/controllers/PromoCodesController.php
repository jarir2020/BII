<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use Yii;

/**
 * /api/promo-codes/validate and /api/admin/promo-codes/*.
 */
class PromoCodesController extends ApiController
{
    /** GET /api/promo-codes/validate?code=&order_total= */
    public function actionValidate(): \yii\web\Response
    {
        $this->user();
        $code = (string) Yii::$app->request->get('code', '');
        $orderTotal = (float) Yii::$app->request->get('order_total', 0);

        $row = Yii::$app->db->createCommand(
            'SELECT * FROM promo_codes WHERE code = :c AND is_active = 1', [':c' => strtoupper(trim($code))]
        )->queryOne();
        if ($row === false) {
            $this->notFound('এই প্রমো কোডটি বৈধ নয় বা মেয়াদ উত্তীর্ণ।');
        }

        $minOrder = (float) ($row['min_order'] ?? 0);
        if ($minOrder > 0 && $orderTotal < $minOrder) {
            $this->badRequest('এই কোডের জন্য ন্যূনতম অর্ডার ৳' . round($minOrder) . ' হতে হবে।');
        }
        $maxUses = (int) ($row['max_uses'] ?? 0);
        $used = (int) ($row['used_count'] ?? 0);
        if ($maxUses > 0 && $used >= $maxUses) {
            $this->badRequest('এই প্রমো কোডের ব্যবহার সীমা শেষ হয়েছে।');
        }

        $discType = $row['discount_type'] ?? 'flat';
        $discVal = (float) ($row['discount_value'] ?? 0);
        $discount = $discType === 'percent'
            ? min($orderTotal * $discVal / 100, $orderTotal)
            : min($discVal, $orderTotal);

        return $this->json([
            'code' => $row['code'],
            'discount_type' => $discType,
            'discount_value' => $discVal,
            'discount' => round($discount, 2),
            'note' => $row['note'] ?? '',
        ]);
    }

    /** GET (list) / POST (create) /api/admin/promo-codes */
    public function actionAdmin(): \yii\web\Response
    {
        $this->requireAdmin();
        if (Yii::$app->request->isPost) {
            $body = Yii::$app->request->post();
            $doc = [
                'id' => Uuid::v4(),
                'code' => strtoupper(trim((string) ($body['code'] ?? ''))),
                'discount_type' => (string) ($body['discount_type'] ?? 'flat'),
                'discount_value' => (float) ($body['discount_value'] ?? 0),
                'min_order' => (float) ($body['min_order'] ?? 0),
                'max_uses' => (int) ($body['max_uses'] ?? 0),
                'used_count' => 0,
                'is_active' => ($body['is_active'] ?? true) ? 1 : 0,
                'note' => (string) ($body['note'] ?? ''),
                'created_at' => $this->now(),
            ];
            Yii::$app->db->createCommand()->insert('promo_codes', $doc)->execute();
            return $this->json($this->promoDoc($doc));
        }

        $rows = Yii::$app->db->createCommand('SELECT * FROM promo_codes ORDER BY created_at DESC')->queryAll();
        return $this->json(array_map(fn ($r) => $this->promoDoc($r), $rows));
    }

    /** PUT (update) / DELETE /api/admin/promo-codes/{id} */
    public function actionUpdate(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        $existing = Yii::$app->db->createCommand('SELECT * FROM promo_codes WHERE id = :id', [':id' => $id])->queryOne();
        if ($existing === false) {
            $this->notFound('প্রমো কোড পাওয়া যায়নি');
        }
        $request = Yii::$app->request;
        if ($request->isDelete) {
            Yii::$app->db->createCommand()->delete('promo_codes', ['id' => $id])->execute();
            return $this->json(['ok' => true]);
        }

        $body = $request->post();
        $updates = [
            'code' => strtoupper(trim((string) ($body['code'] ?? $existing['code']))),
            'discount_type' => (string) ($body['discount_type'] ?? $existing['discount_type']),
            'discount_value' => (float) ($body['discount_value'] ?? $existing['discount_value']),
            'min_order' => (float) ($body['min_order'] ?? $existing['min_order']),
            'max_uses' => (int) ($body['max_uses'] ?? $existing['max_uses']),
            'is_active' => ($body['is_active'] ?? $existing['is_active']) ? 1 : 0,
            'note' => (string) ($body['note'] ?? $existing['note']),
        ];
        Yii::$app->db->createCommand()->update('promo_codes', $updates, ['id' => $id])->execute();
        $row = Yii::$app->db->createCommand('SELECT * FROM promo_codes WHERE id = :id', [':id' => $id])->queryOne();
        return $this->json($this->promoDoc($row));
    }

    private function promoDoc(array $row): array
    {
        $row['is_active'] = (bool) $row['is_active'];
        $row['discount_value'] = (float) $row['discount_value'];
        $row['min_order'] = (float) $row['min_order'];
        return $row;
    }
}
