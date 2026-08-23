<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use Yii;

/**
 * /api/admin/reward-* — reward settings, ads, cashout requests, give-promo.
 */
class AdminRewardsController extends ApiController
{
    private const MAX_DURATION_SECONDS = 86400; // 24 hours; no short ad-specific cap

    /** GET (view) / PUT (update) /api/admin/reward-settings */
    public function actionRewardSettings(): \yii\web\Response
    {
        $this->requireAdmin();
        if (Yii::$app->request->isPut || Yii::$app->request->isPatch) {
            $body = Yii::$app->request->post();
            if (array_key_exists('watch_duration_seconds', $body)) {
                $body['watch_duration_seconds'] = max(1, min(self::MAX_DURATION_SECONDS, (int) $body['watch_duration_seconds']));
            }
            $this->writeConfig('reward_zone', $body);
            return $this->json(['ok' => true]);
        }
        return $this->json($this->configValue('reward_zone'));
    }

    /** GET (list) / POST (create) /api/admin/reward-ads */
    public function actionRewardAds(): \yii\web\Response
    {
        $this->requireAdmin();
        if (Yii::$app->request->isPost) {
            $b = Yii::$app->request->post();
            $platform = in_array($b['platform'] ?? '', ['all', 'web', 'app'], true)
                ? $b['platform']
                : 'all';
            $durationSeconds = max(1, min(
                self::MAX_DURATION_SECONDS,
                (int) ($b['duration_seconds'] ?? 15)
            ));
            $doc = [
                'id' => Uuid::v4(),
                'title' => (string) ($b['title'] ?? ''),
                'ad_type' => (string) ($b['ad_type'] ?? ''),
                'media_url' => (string) ($b['media_url'] ?? ''),
                'thumbnail_url' => (string) ($b['thumbnail_url'] ?? ''),
                'duration_seconds' => $durationSeconds,
                'is_active' => ($b['is_active'] ?? true) ? 1 : 0,
                'order' => (int) ($b['order'] ?? 0),
                'description' => (string) ($b['description'] ?? ''),
                'platform' => $platform,
                'created_at' => $this->now(),
            ];
            Yii::$app->db->createCommand()->insert('reward_ads', $doc)->execute();
            return $this->json($this->adDoc($doc));
        }
        $rows = Yii::$app->db->createCommand('SELECT * FROM reward_ads ORDER BY `order` ASC')->queryAll();
        return $this->json(array_map(fn ($r) => $this->adDoc($r), $rows));
    }

    /** PUT (update) / DELETE /api/admin/reward-ads/{id} */
    public function actionRewardAd(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        $row = Yii::$app->db->createCommand('SELECT * FROM reward_ads WHERE id = :id', [':id' => $id])->queryOne();
        if ($row === false) {
            $this->notFound('বিজ্ঞাপন পাওয়া যায়নি');
        }
        $request = Yii::$app->request;
        if ($request->isDelete) {
            Yii::$app->db->createCommand()->delete('reward_ads', ['id' => $id])->execute();
            return $this->json(['ok' => true]);
        }
        $b = $request->post();
        $durationSeconds = max(1, min(
            self::MAX_DURATION_SECONDS,
            (int) ($b['duration_seconds'] ?? $row['duration_seconds'])
        ));
        $updates = [
            'title' => (string) ($b['title'] ?? $row['title']),
            'ad_type' => (string) ($b['ad_type'] ?? $row['ad_type']),
            'media_url' => (string) ($b['media_url'] ?? $row['media_url']),
            'thumbnail_url' => (string) ($b['thumbnail_url'] ?? $row['thumbnail_url']),
            'duration_seconds' => $durationSeconds,
            'is_active' => ($b['is_active'] ?? $row['is_active']) ? 1 : 0,
            'order' => (int) ($b['order'] ?? $row['order']),
            'description' => (string) ($b['description'] ?? $row['description']),
        ];
        if (isset($b['platform']) && in_array($b['platform'], ['all', 'web', 'app'], true)) {
            $updates['platform'] = $b['platform'];
        }
        Yii::$app->db->createCommand()->update('reward_ads', $updates, ['id' => $id])->execute();
        $row = Yii::$app->db->createCommand('SELECT * FROM reward_ads WHERE id = :id', [':id' => $id])->queryOne();
        return $this->json($this->adDoc($row));
    }

    /** GET /api/admin/cashout-requests?status= */
    public function actionCashoutRequests(): \yii\web\Response
    {
        $this->requireAdmin();
        $status = (string) Yii::$app->request->get('status', 'all');
        $sql = 'SELECT * FROM cashout_requests';
        $params = [];
        if ($status !== 'all') {
            $sql .= ' WHERE status = :s';
            $params[':s'] = $status;
        }
        $sql .= ' ORDER BY created_at DESC';
        $rows = Yii::$app->db->createCommand($sql, $params)->queryAll();
        return $this->json(array_map(fn ($r) => $this->cashoutDoc($r), $rows));
    }

    /** PUT /api/admin/cashout-requests/{id}/approve */
    public function actionCashoutApprove(): \yii\web\Response
    {
        $this->requireAdmin();
        $id = (string) Yii::$app->request->get('id', '');
        $doc = $this->findCashout($id);
        if ($doc === null) {
            $this->notFound('রিকোয়েস্ট পাওয়া যায়নি');
        }
        if ($doc['status'] !== 'pending') {
            $this->badRequest("এই রিকোয়েস্ট ইতিমধ্যে {$doc['status']} করা হয়েছে");
        }
        $body = Yii::$app->request->post();
        Yii::$app->db->createCommand()->update('cashout_requests', [
            'status' => 'approved',
            'admin_note' => (string) ($body['note'] ?? ''),
            'updated_at' => $this->now(),
        ], ['id' => $id])->execute();
        return $this->json(['ok' => true]);
    }

    /** PUT /api/admin/cashout-requests/{id}/reject — refunds coins. */
    public function actionCashoutReject(): \yii\web\Response
    {
        $this->requireAdmin();
        $id = (string) Yii::$app->request->get('id', '');
        $doc = $this->findCashout($id);
        if ($doc === null) {
            $this->notFound('রিকোয়েস্ট পাওয়া যায়নি');
        }
        if ($doc['status'] !== 'pending') {
            $this->badRequest("এই রিকোয়েস্ট ইতিমধ্যে {$doc['status']} করা হয়েছে");
        }
        $this->addCoins($doc['user_id'], (int) $doc['coins']);
        Yii::$app->db->createCommand()->update('cashout_requests', [
            'status' => 'rejected',
            'admin_note' => (string) (Yii::$app->request->post()['note'] ?? ''),
            'updated_at' => $this->now(),
        ], ['id' => $id])->execute();
        Yii::$app->db->createCommand()->insert('reward_transactions', [
            'id' => Uuid::v4(), 'user_id' => $doc['user_id'], 'type' => 'cashout_refund',
            'coins' => (int) $doc['coins'], 'promo_code' => '', 'ref_id' => $id, 'created_at' => $this->now(),
        ])->execute();
        return $this->json(['ok' => true]);
    }

    /** POST /api/admin/reward-zone/give-promo */
    public function actionGivePromo(): \yii\web\Response
    {
        $this->requireAdmin();
        $body = Yii::$app->request->post();
        $studentId = trim((string) ($body['student_id'] ?? ''));
        if ($studentId === '') {
            $this->badRequest('স্টুডেন্ট আইডি দিন');
        }
        $student = Yii::$app->db->createCommand('SELECT * FROM users WHERE student_id = :s', [':s' => $studentId])->queryOne();
        if ($student === false) {
            $this->notFound("স্টুডেন্ট '{$studentId}' পাওয়া যায়নি");
        }

        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $code = 'GIFT-' . substr(str_shuffle($chars), 0, 7);

        Yii::$app->db->createCommand()->insert('promo_codes', [
            'id' => Uuid::v4(),
            'code' => $code,
            'discount_type' => (string) ($body['discount_type'] ?? 'flat'),
            'discount_value' => (float) ($body['discount_value'] ?? 50),
            'min_order' => 0,
            'max_uses' => 1,
            'used_count' => 0,
            'is_active' => 1,
            'note' => (string) ($body['note'] ?? ("এডমিন গিফট — {$student['name']}")),
            'created_by_user' => '',
            'given_to_student_id' => $studentId,
            'given_by_admin_id' => $this->requireAdmin()['id'],
            'source' => 'admin_gift',
            'created_at' => $this->now(),
        ])->execute();

        return $this->json(['ok' => true, 'promo_code' => $code]);
    }

    private function findCashout(string $id): ?array
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM cashout_requests WHERE id = :id', [':id' => $id])->queryOne();
        return $row === false ? null : $row;
    }

    private function addCoins(string $userId, int $delta): void
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM reward_balances WHERE user_id = :u', [':u' => $userId])->queryOne();
        if ($row === false) {
            Yii::$app->db->createCommand()->insert('reward_balances', [
                'id' => Uuid::v4(), 'user_id' => $userId, 'coins' => max(0, $delta),
            ])->execute();
        } else {
            Yii::$app->db->createCommand()->update('reward_balances', [
                'coins' => max(0, (int) $row['coins'] + $delta),
            ], ['id' => $row['id']])->execute();
        }
    }

    private function adDoc(array $r): array
    {
        $r['duration_seconds'] = max(1, min(
            self::MAX_DURATION_SECONDS,
            (int) ($r['duration_seconds'] ?? 15)
        ));
        $r['is_active'] = (bool) $r['is_active'];
        return $r;
    }

    private function cashoutDoc(array $r): array
    {
        $r['taka_amount'] = (float) $r['taka_amount'];
        return $r;
    }
}
