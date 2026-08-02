<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/my-subscription, /api/admin/subscriptions, /api/admin/revenue-stats.
 */
class SubscriptionsController extends ApiController
{
    /** GET /api/my-subscription */
    public function actionMy(): \yii\web\Response
    {
        $user = $this->user();
        $row = Yii::$app->db->createCommand(
            'SELECT * FROM subscriptions WHERE user_id = :u AND status = "active" ORDER BY started_at DESC LIMIT 1',
            [':u' => $user['id']]
        )->queryOne();
        if ($row === false) {
            return $this->json(new \stdClass());
        }
        $row['amount'] = (float) $row['amount'];
        return $this->json($row);
    }

    /** GET /api/admin/subscriptions */
    public function actionAdmin(): \yii\web\Response
    {
        $this->requireAdmin();
        $rows = Yii::$app->db->createCommand('SELECT * FROM subscriptions ORDER BY started_at DESC')->queryAll();
        return $this->json(array_map(fn ($r) => $this->subDoc($r), $rows));
    }

    /** GET /api/admin/revenue-stats */
    public function actionRevenue(): \yii\web\Response
    {
        $this->requireAdmin();

        $manual = Yii::$app->db->createCommand(
            'SELECT COALESCE(SUM(amount),0) t, COUNT(*) c FROM payment_requests WHERE status = "approved"'
        )->queryOne();
        $shop = Yii::$app->db->createCommand(
            'SELECT COALESCE(SUM(total),0) t, COUNT(*) c FROM orders WHERE status <> "unpaid"'
        )->queryOne();
        $gateway = Yii::$app->db->createCommand(
            'SELECT COALESCE(SUM(amount),0) t, COUNT(*) c FROM payment_intents WHERE status = "fulfilled"'
        )->queryOne();
        $sub = Yii::$app->db->createCommand(
            'SELECT COALESCE(SUM(amount),0) t, COUNT(*) c FROM subscriptions'
        )->queryOne();

        $pending = (int) Yii::$app->db->createCommand('SELECT COUNT(*) FROM payment_requests WHERE status = "pending"')->queryScalar();
        $activeSubs = (int) Yii::$app->db->createCommand('SELECT COUNT(*) FROM subscriptions WHERE status = "active"')->queryScalar();
        $enrolled = (int) Yii::$app->db->createCommand('SELECT COUNT(*) FROM enrollments')->queryScalar();

        $monthly = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = new \DateTimeImmutable('first day of ' . $i . ' months ago 00:00:00 UTC');
            $end = $start->modify('+1 month');
            $s = $start->format('Y-m-d\TH:i:s');
            $e = $end->format('Y-m-d\TH:i:s');

            $mc = $this->sumWhere('payment_requests', 'submitted_at', 'amount', 'status = "approved"', $s, $e);
            $ms = $this->sumWhere('orders', 'created_at', 'total', 'status <> "unpaid"', $s, $e);
            $mg = $this->sumWhere('payment_intents', 'created_at', 'amount', 'status = "fulfilled"', $s, $e);

            $monthly[] = [
                'month' => $start->format('M Y'),
                'courses' => $mc,
                'shop' => $ms,
                'gateway' => $mg,
            ];
        }

        return $this->json([
            'total_revenue' => (float) $manual['t'] + (float) $shop['t'] + (float) $gateway['t'] + (float) $sub['t'],
            'manual_payment_revenue' => (float) $manual['t'],
            'manual_payment_count' => (int) $manual['c'],
            'shop_revenue' => (float) $shop['t'],
            'shop_orders' => (int) $shop['c'],
            'gateway_revenue' => (float) $gateway['t'],
            'gateway_transactions' => (int) $gateway['c'],
            'subscription_revenue' => (float) $sub['t'],
            'subscription_count' => (int) $sub['c'],
            'active_subscriptions' => $activeSubs,
            'pending_payments' => $pending,
            'total_enrollments' => $enrolled,
            'monthly' => $monthly,
        ]);
    }

    private function sumWhere(string $table, string $col, string $sumCol, string $where, string $s, string $e): float
    {
        $val = Yii::$app->db->createCommand(
            "SELECT COALESCE(SUM({$sumCol}),0) FROM {$table} WHERE {$where} AND {$col} >= :s AND {$col} < :e",
            [':s' => $s, ':e' => $e]
        )->queryScalar();
        return (float) $val;
    }

    private function subDoc(array $r): array
    {
        $r['amount'] = (float) $r['amount'];
        return $r;
    }
}
