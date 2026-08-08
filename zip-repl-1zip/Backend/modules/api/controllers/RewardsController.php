<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use Yii;

/**
 * /api/rewards/* — coin balance, ads, redeem, cashout, history, leaderboard.
 */
class RewardsController extends ApiController
{
    private function cfg(): array
    {
        $d = $this->configValue('reward_zone');
        return array_merge([
            'coins_per_ad' => 5,
            'ad_watch_cooldown_seconds' => 30,
            'max_ads_per_day' => 0,
            'coins_per_taka' => 10,
            'min_cashout_coins' => 100,
            'coins_per_redeem' => 50,
            'promo_discount_value' => 50,
            'promo_discount_type' => 'flat',
        ], $d);
    }

    /** GET /api/rewards/balance */
    public function actionBalance(): \yii\web\Response
    {
        $user = $this->user();
        $row = $this->balanceRow($user['id']);
        return $this->json(['coins' => (int) ($row['coins'] ?? 0)]);
    }

    /** GET /api/rewards/daily-stats */
    public function actionDailyStats(): \yii\web\Response
    {
        $user = $this->user();
        $cfg = $this->cfg();
        $maxPerDay = (int) $cfg['max_ads_per_day'];

        $todayStart = gmdate('Y-m-d\T00:00:00');
        $todayCount = (int) Yii::$app->db->createCommand(
            'SELECT COUNT(*) FROM reward_transactions WHERE user_id = :u AND type = "ad_watch" AND created_at >= :ts',
            [':u' => $user['id'], ':ts' => $todayStart]
        )->queryScalar();

        $balance = (int) ($this->balanceRow($user['id'])['coins'] ?? 0);

        $last = Yii::$app->db->createCommand(
            'SELECT created_at FROM reward_transactions WHERE user_id = :u AND type = "ad_watch" ORDER BY created_at DESC LIMIT 1',
            [':u' => $user['id']]
        )->queryScalar();
        $cooldownRemaining = 0;
        if ($last !== false && $last !== null) {
            $cooldownSecs = (int) $cfg['ad_watch_cooldown_seconds'];
            $elapsed = max(0, (int) (microtime(true) - (float) strtotime($last)));
            $cooldownRemaining = max(0, $cooldownSecs - $elapsed);
        }

        $unlimited = ($maxPerDay === 0);
        return $this->json([
            'coins' => $balance,
            'today_count' => $todayCount,
            'max_per_day' => $maxPerDay,
            'unlimited' => $unlimited,
            'daily_remaining' => $unlimited ? 999999 : max(0, $maxPerDay - $todayCount),
            'cooldown_remaining' => $cooldownRemaining,
            'coins_per_ad' => (int) $cfg['coins_per_ad'],
            'coins_per_taka' => (int) $cfg['coins_per_taka'],
            'min_cashout_coins' => (int) $cfg['min_cashout_coins'],
        ]);
    }

    /** POST /api/rewards/watch-ad */
    public function actionWatchAd(): \yii\web\Response
    {
        $user = $this->user();
        $cfg = $this->cfg();
        $coinsPerAd = (int) $cfg['coins_per_ad'];
        $cooldownSecs = (int) $cfg['ad_watch_cooldown_seconds'];
        $maxPerDay = (int) $cfg['max_ads_per_day'];

        $todayStart = gmdate('Y-m-d\T00:00:00');
        $todayCount = (int) Yii::$app->db->createCommand(
            'SELECT COUNT(*) FROM reward_transactions WHERE user_id = :u AND type = "ad_watch" AND created_at >= :ts',
            [':u' => $user['id'], ':ts' => $todayStart]
        )->queryScalar();
        if ($maxPerDay > 0 && $todayCount >= $maxPerDay) {
            $this->badRequest("আজকের সীমা ({$maxPerDay}টি) শেষ হয়েছে। আগামীকাল আবার দেখুন।");
        }

        $last = Yii::$app->db->createCommand(
            'SELECT created_at FROM reward_transactions WHERE user_id = :u AND type = "ad_watch" ORDER BY created_at DESC LIMIT 1',
            [':u' => $user['id']]
        )->queryScalar();
        if ($last !== false && $last !== null) {
            $elapsed = (int) (microtime(true) - (float) strtotime($last));
            if ($elapsed < $cooldownSecs) {
                $wait = $cooldownSecs - $elapsed;
                $this->tooMany("একটু অপেক্ষা করুন। {$wait} সেকেন্ড বাকি।");
            }
        }

        $this->addCoins($user['id'], $coinsPerAd);
        Yii::$app->db->createCommand()->insert('reward_transactions', [
            'id' => Uuid::v4(), 'user_id' => $user['id'], 'type' => 'ad_watch',
            'coins' => $coinsPerAd, 'promo_code' => '', 'created_at' => $this->now(),
        ])->execute();

        $balance = (int) ($this->balanceRow($user['id'])['coins'] ?? 0);
        return $this->json([
            'ok' => true,
            'coins_earned' => $coinsPerAd,
            'total_coins' => $balance,
        ]);
    }

    /** POST /api/rewards/redeem */
    public function actionRedeem(): \yii\web\Response
    {
        $user = $this->user();
        $cfg = $this->cfg();
        $coinsPerRedeem = (int) $cfg['coins_per_redeem'];
        $promoDiscount = (float) $cfg['promo_discount_value'];
        $promoType = $cfg['promo_discount_type'];

        $current = (int) ($this->balanceRow($user['id'])['coins'] ?? 0);
        if ($current < $coinsPerRedeem) {
            $this->badRequest("পর্যাপ্ত কয়েন নেই। প্রয়োজন: {$coinsPerRedeem}, আপনার: {$current}");
        }

        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $code = 'RWD' . substr(str_shuffle($chars), 0, 6);

        $this->addCoins($user['id'], -$coinsPerRedeem);
        Yii::$app->db->createCommand()->insert('promo_codes', [
            'id' => Uuid::v4(),
            'code' => $code,
            'discount_type' => $promoType,
            'discount_value' => $promoDiscount,
            'min_order' => 0,
            'max_uses' => 1,
            'is_active' => 1,
            'note' => 'রিওয়ার্ড জোন — ' . $user['name'],
            'used_count' => 0,
            'created_by_user' => $user['id'],
            'created_at' => $this->now(),
        ])->execute();
        Yii::$app->db->createCommand()->insert('reward_transactions', [
            'id' => Uuid::v4(), 'user_id' => $user['id'], 'type' => 'redeem',
            'coins' => -$coinsPerRedeem, 'promo_code' => $code, 'created_at' => $this->now(),
        ])->execute();

        $balance = (int) ($this->balanceRow($user['id'])['coins'] ?? 0);
        return $this->json([
            'ok' => true,
            'promo_code' => $code,
            'discount_type' => $promoType,
            'discount_value' => $promoDiscount,
            'coins_spent' => $coinsPerRedeem,
            'remaining_coins' => $balance,
        ]);
    }

    /** POST /api/rewards/cashout */
    public function actionCashout(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();
        $cfg = $this->cfg();
        $coinsPerTaka = (int) $cfg['coins_per_taka'];
        $minCoins = (int) $cfg['min_cashout_coins'];

        $coins = (int) ($body['coins'] ?? 0);
        $method = (string) ($body['payment_method'] ?? '');
        $number = trim((string) ($body['payment_number'] ?? ''));

        if ($coins < $minCoins) {
            $this->badRequest("সর্বনিম্ন ক্যাশআউট {$minCoins} কয়েন (৳" . intdiv($minCoins, $coinsPerTaka) . ')');
        }
        if ($coins % $coinsPerTaka !== 0) {
            $this->badRequest("কয়েনের পরিমাণ অবশ্যই {$coinsPerTaka}-এর গুণিতক হতে হবে");
        }
        if (!in_array($method, ['bkash', 'nagad', 'rocket'], true)) {
            $this->badRequest('পেমেন্ট মেথড ভুল। bkash, nagad বা rocket দিন।');
        }
        if ($number === '') {
            $this->badRequest('মোবাইল নম্বর দিন');
        }

        $current = (int) ($this->balanceRow($user['id'])['coins'] ?? 0);
        if ($current < $coins) {
            $this->badRequest("পর্যাপ্ত কয়েন নেই। আপনার: {$current}, প্রয়োজন: {$coins}");
        }

        $taka = intdiv($coins, $coinsPerTaka);
        $reqId = Uuid::v4();
        $now = $this->now();

        $this->addCoins($user['id'], -$coins);
        Yii::$app->db->createCommand()->insert('cashout_requests', [
            'id' => $reqId,
            'user_id' => $user['id'],
            'user_name' => $user['name'] ?? '',
            'user_email' => $user['email'] ?? '',
            'coins' => $coins,
            'taka_amount' => $taka,
            'payment_method' => $method,
            'payment_number' => $number,
            'status' => 'pending',
            'admin_note' => '',
            'created_at' => $now,
            'updated_at' => $now,
        ])->execute();

        return $this->json([
            'ok' => true,
            'id' => $reqId,
            'coins' => $coins,
            'taka_amount' => $taka,
            'status' => 'pending',
            'created_at' => $now,
        ]);
    }

    /** GET /api/rewards/cashout-history */
    public function actionCashoutHistory(): \yii\web\Response
    {
        $user = $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM cashout_requests WHERE user_id = :u ORDER BY created_at DESC LIMIT 100', [':u' => $user['id']]
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->cashoutDoc($r), $rows));
    }

    /** GET /api/rewards/history */
    public function actionHistory(): \yii\web\Response
    {
        $user = $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM reward_transactions WHERE user_id = :u ORDER BY created_at DESC LIMIT 100', [':u' => $user['id']]
        )->queryAll();
        return $this->json($rows);
    }

    /** GET /api/rewards/leaderboard */
    public function actionLeaderboard(): \yii\web\Response
    {
        $user = $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM reward_balances ORDER BY coins DESC LIMIT 50'
        )->queryAll();

        if ($rows === []) {
            return $this->json([]);
        }

        // 2026-08-09: Batch queries instead of N+1 per-user queries
        $uids = array_values(array_unique(array_map(fn ($r) => $r['user_id'], $rows)));
        $placeholders = implode(',', array_fill(0, count($uids), ':' . 'u' . '%d'));

        // Batch fetch user info
        $userParams = [];
        foreach ($uids as $i => $uid) {
            $userParams[':u' . $i] = $uid;
        }
        $userRows = Yii::$app->db->createCommand(
            'SELECT id, name, profile_photo FROM users WHERE id IN (' . implode(',', array_keys($userParams)) . ')',
            $userParams
        )->queryAll();
        $userMap = [];
        foreach ($userRows as $ur) {
            $userMap[$ur['id']] = $ur;
        }

        // Batch fetch ad watch counts
        $adRows = Yii::$app->db->createCommand(
            'SELECT user_id, COUNT(*) AS cnt FROM reward_transactions WHERE user_id IN (' . implode(',', array_keys($userParams)) . ') AND type = "ad_watch" GROUP BY user_id',
            $userParams
        )->queryAll();
        $adMap = [];
        foreach ($adRows as $ar) {
            $adMap[$ar['user_id']] = (int) $ar['cnt'];
        }

        // Batch fetch order counts
        $orderRows = Yii::$app->db->createCommand(
            'SELECT user_id, COUNT(*) AS cnt FROM orders WHERE user_id IN (' . implode(',', array_keys($userParams)) . ') GROUP BY user_id',
            $userParams
        )->queryAll();
        $orderMap = [];
        foreach ($orderRows as $or) {
            $orderMap[$or['user_id']] = (int) $or['cnt'];
        }

        $result = [];
        foreach ($rows as $i => $bal) {
            $uid = $bal['user_id'];
            if ($uid === '' || !isset($userMap[$uid])) {
                continue;
            }
            $u = $userMap[$uid];
            $result[] = [
                'rank' => $i + 1,
                'user_id' => $uid,
                'name' => $u['name'] ?: 'অজানা',
                'avatar' => $u['profile_photo'] ?? '',
                'coins' => (int) $bal['coins'],
                'ad_watches' => $adMap[$uid] ?? 0,
                'orders' => $orderMap[$uid] ?? 0,
                'is_me' => $uid === $user['id'],
            ];
        }
        return $this->json($result);
    }

    /** GET /api/rewards/my-promo-codes */
    public function actionMyPromoCodes(): \yii\web\Response
    {
        $user = $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM promo_codes WHERE created_by_user = :u ORDER BY created_at DESC', [':u' => $user['id']]
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->promoDoc($r), $rows));
    }

    /** GET /api/rewards/ads */
    public function actionAds(): \yii\web\Response
    {
        $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM reward_ads WHERE is_active = 1 ORDER BY `order` ASC'
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->adDoc($r), $rows));
    }

    private function balanceRow(string $userId): ?array
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM reward_balances WHERE user_id = :u', [':u' => $userId])->queryOne();
        return $row === false ? null : $row;
    }

    private function addCoins(string $userId, int $delta): void
    {
        $exists = $this->balanceRow($userId);
        if ($exists === null) {
            Yii::$app->db->createCommand()->insert('reward_balances', [
                'id' => Uuid::v4(), 'user_id' => $userId, 'coins' => max(0, $delta),
            ])->execute();
        } else {
            Yii::$app->db->createCommand()->update('reward_balances', [
                'coins' => max(0, (int) $exists['coins'] + $delta),
            ], ['id' => $exists['id']])->execute();
        }
    }

    private function cashoutDoc(array $r): array
    {
        $r['taka_amount'] = (float) $r['taka_amount'];
        return $r;
    }

    private function promoDoc(array $r): array
    {
        $r['is_active'] = (bool) $r['is_active'];
        $r['discount_value'] = (float) $r['discount_value'];
        $r['min_order'] = (float) $r['min_order'];
        return $r;
    }

    private function adDoc(array $r): array
    {
        $r['is_active'] = (bool) $r['is_active'];
        return $r;
    }
}
