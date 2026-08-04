<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use app\helpers\Telegram;
use Yii;

/**
 * /api/shop/* — place order, my orders.
 */
class ShopController extends ApiController
{
    /** POST /api/shop/place-order */
    public function actionPlaceOrder(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();
        $items = (array) ($body['items'] ?? []);

        if ($items === []) {
            $this->badRequest('অর্ডারে কোনো প্রোডাক্ট নেই।');
        }

        // Verify products & stock.
        $total = 0.0;
        $orderLines = [];
        foreach ($items as $item) {
            $pid = (string) ($item['product_id'] ?? '');
            $prod = Yii::$app->db->createCommand('SELECT * FROM products WHERE id = :id', [':id' => $pid])->queryOne();
            if ($prod === false) {
                $this->notFound('প্রোডাক্ট পাওয়া যায়নি: ' . (string) ($item['product_name'] ?? ''));
            }
            $stock = (int) ($prod['stock'] ?? 0);
            $qty = (int) ($item['qty'] ?? 1);
            if ($stock > 0 && $qty > $stock) {
                $this->badRequest("'{$prod['name_bn']}' এর স্টক যথেষ্ট নেই (বাকি: {$stock}টি)");
            }
            $unit = (float) ($prod['discount_price'] ?: $prod['price'] ?: $item['unit_price'] ?? 0);
            $subtotal = round($unit * $qty, 2);
            $total += $subtotal;
            $orderLines[] = [
                'product_id' => $pid,
                'product_name' => $prod['name_bn'] ?: ($item['product_name'] ?? ''),
                'qty' => $qty,
                'unit_price' => $unit,
                'subtotal' => $subtotal,
            ];
        }

        // Promo code.
        $discount = 0.0;
        $promoCodeUsed = '';
        $promo = trim((string) ($body['promo_code'] ?? ''));
        if ($promo !== '') {
            $row = Yii::$app->db->createCommand(
                'SELECT * FROM promo_codes WHERE code = :c AND is_active = 1', [':c' => strtoupper($promo)]
            )->queryOne();
            if ($row !== false) {
                $maxUses = (int) ($row['max_uses'] ?? 0);
                $used = (int) ($row['used_count'] ?? 0);
                if ($maxUses === 0 || $used < $maxUses) {
                    $discType = $row['discount_type'] ?? 'flat';
                    $discVal = (float) ($row['discount_value'] ?? 0);
                    $discount = $discType === 'percent'
                        ? min($total * $discVal / 100, $total)
                        : min($discVal, $total);
                    $promoCodeUsed = $row['code'];
                    Yii::$app->db->createCommand()->update('promo_codes', [
                        'used_count' => $used + 1,
                    ], ['id' => $row['id']])->execute();
                }
            }
        }

        $finalTotal = round($total - $discount, 2);
        $orderNumber = 'ORD-' . random_int(100000, 999999);
        $now = $this->now();

        $orderId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('orders', [
            'id' => $orderId,
            'order_number' => $orderNumber,
            'user_id' => $user['id'],
            'customer_name' => (string) ($body['customer_name'] ?? ''),
            'customer_phone' => (string) ($body['customer_phone'] ?? ''),
            'customer_address' => (string) ($body['customer_address'] ?? ''),
            'payment_method' => (string) ($body['payment_method'] ?? ''),
            'payment_number' => (string) ($body['payment_number'] ?? ''),
            'transaction_id' => (string) ($body['transaction_id'] ?? ''),
            'promo_code' => $promoCodeUsed,
            'discount' => $discount,
            'subtotal' => round($total, 2),
            'total' => $finalTotal,
            'status' => 'pending',
            'note' => (string) ($body['note'] ?? ''),
            'created_at' => $now,
        ])->execute();

        foreach ($orderLines as $line) {
            Yii::$app->db->createCommand()->insert('order_items', array_merge(
                ['id' => Uuid::v4(), 'order_id' => $orderId],
                $line
            ))->execute();
        }

        // Notify admins on Telegram when TELEGRAM_BOT_TOKEN + CHAT_ID are set.
        Telegram::notifyShopOrder([
            'id'               => $orderId,
            'user_name'        => $user['name'] ?? '',
            'user_phone'       => $user['phone'] ?? '',
            'user_email'       => $user['email'] ?? '',
            'items'            => $orderLines,
            'total'            => $finalTotal,
            'payment_method'   => (string) ($body['payment_method'] ?? ''),
            'delivery_address' => (string) ($body['customer_address'] ?? ''),
            'created_at'       => $now,
        ]);

        $doc = [
            'order_number' => $orderNumber,
            'user_id' => $user['id'],
            'customer_name' => (string) ($body['customer_name'] ?? ''),
            'customer_phone' => (string) ($body['customer_phone'] ?? ''),
            'customer_address' => (string) ($body['customer_address'] ?? ''),
            'payment_method' => (string) ($body['payment_method'] ?? ''),
            'payment_number' => (string) ($body['payment_number'] ?? ''),
            'transaction_id' => (string) ($body['transaction_id'] ?? ''),
            'promo_code' => $promoCodeUsed,
            'discount' => $discount,
            'subtotal' => round($total, 2),
            'total' => $finalTotal,
            'status' => 'pending',
            'note' => (string) ($body['note'] ?? ''),
            'items' => $orderLines,
            'created_at' => $now,
        ];

        return $this->json([
            'ok' => true,
            'order_number' => $orderNumber,
            'total' => $finalTotal,
            'discount' => $discount,
            'order' => $doc,
        ]);
    }

    /** GET /api/shop/my-orders */
    public function actionMyOrders(): \yii\web\Response
    {
        $user = $this->user();
        $orders = Yii::$app->db->createCommand(
            'SELECT * FROM orders WHERE user_id = :u ORDER BY created_at DESC', [':u' => $user['id']]
        )->queryAll();

        $out = [];
        foreach ($orders as $o) {
            $items = Yii::$app->db->createCommand(
                'SELECT product_id, product_name, qty, unit_price, subtotal FROM order_items WHERE order_id = :id',
                [':id' => $o['id']]
            )->queryAll();
            $o['items'] = $items;
            $o['discount'] = (float) $o['discount'];
            $o['subtotal'] = (float) $o['subtotal'];
            $o['total'] = (float) $o['total'];
            $out[] = $o;
        }
        return $this->json($out);
    }
}
