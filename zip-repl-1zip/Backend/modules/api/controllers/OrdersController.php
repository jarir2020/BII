<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;
use yii\web\HttpException;

/**
 * /api/orders/* — admin order management.
 *
 * Orders are created by ShopController so the product totals and order items
 * cannot be edited from the admin CRUD form. Admins can inspect, update the
 * delivery status/customer details, and remove an order with its items.
 */
class OrdersController extends ApiController
{
    private const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

    /** GET /api/orders. */
    public function actionIndex(): \yii\web\Response
    {
        $this->requireAdmin();
        if (Yii::$app->request->isPost) {
            throw new HttpException(405, 'Orders must be created through the shop checkout');
        }

        $rows = Yii::$app->db->createCommand(
            'SELECT o.*, u.email AS user_email
             FROM orders o
             LEFT JOIN users u ON u.id = o.user_id
             ORDER BY o.created_at DESC
             LIMIT 500'
        )->queryAll();

        $itemsByOrder = [];
        $orderIds = array_values(array_filter(array_column($rows, 'id')));
        if ($orderIds !== []) {
            $params = [];
            $placeholders = [];
            foreach ($orderIds as $index => $orderId) {
                $placeholder = ':order' . $index;
                $placeholders[] = $placeholder;
                $params[$placeholder] = $orderId;
            }
            $items = Yii::$app->db->createCommand(
                'SELECT order_id, product_id, product_name, qty, unit_price, subtotal
                 FROM order_items WHERE order_id IN (' . implode(',', $placeholders) . ')
                 ORDER BY product_name ASC',
                $params
            )->queryAll();
            foreach ($items as $item) {
                $itemsByOrder[$item['order_id']][] = $item;
            }
        }
        foreach ($rows as &$row) {
            $row['items'] = $itemsByOrder[$row['id']] ?? [];
        }
        unset($row);

        return $this->json(array_map(fn (array $row): array => $this->toDoc($row), $rows));
    }

    /** GET/PUT/PATCH/DELETE /api/orders/{id}. */
    public function actionView(string $id): \yii\web\Response
    {
        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            return $this->actionUpdate($id);
        }
        if ($request->isDelete) {
            return $this->actionDelete($id);
        }

        $this->requireAdmin();
        $order = $this->findOrder($id);
        if ($order === null) {
            $this->notFound('Order not found');
        }
        return $this->json($this->toDoc($order));
    }

    /** PUT/PATCH /api/orders/{id}. */
    public function actionUpdate(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        if ($this->findOrder($id) === null) {
            $this->notFound('Order not found');
        }

        $body = Yii::$app->request->post();
        $updates = [];
        foreach (['customer_name', 'customer_phone', 'customer_address', 'payment_method', 'payment_number', 'transaction_id', 'note'] as $field) {
            if (array_key_exists($field, $body)) {
                $updates[$field] = (string) $body[$field];
            }
        }

        if (array_key_exists('status', $body)) {
            $status = strtolower(trim((string) $body['status']));
            if (!in_array($status, self::STATUSES, true)) {
                $this->badRequest('Invalid order status');
            }
            $updates['status'] = $status;
        }

        if ($updates !== []) {
            Yii::$app->db->createCommand()->update('orders', $updates, ['id' => $id])->execute();
        }

        return $this->json($this->toDoc($this->findOrder($id)));
    }

    /** DELETE /api/orders/{id}. */
    public function actionDelete(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        if (!Yii::$app->request->isDelete) {
            throw new HttpException(405, 'Method Not Allowed');
        }
        if ($this->findOrder($id) === null) {
            $this->notFound('Order not found');
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            Yii::$app->db->createCommand()->delete('order_items', ['order_id' => $id])->execute();
            Yii::$app->db->createCommand()->delete('orders', ['id' => $id])->execute();
            $transaction->commit();
        } catch (\Throwable $e) {
            $transaction->rollBack();
            throw $e;
        }

        return $this->json(['ok' => true, 'deleted' => 1]);
    }

    private function findOrder(string $id): ?array
    {
        $row = Yii::$app->db->createCommand(
            'SELECT o.*, u.email AS user_email
             FROM orders o
             LEFT JOIN users u ON u.id = o.user_id
             WHERE o.id = :id',
            [':id' => $id]
        )->queryOne();
        if ($row === false) {
            return null;
        }

        $row['items'] = Yii::$app->db->createCommand(
            'SELECT product_id, product_name, qty, unit_price, subtotal
             FROM order_items WHERE order_id = :id ORDER BY product_name ASC',
            [':id' => $id]
        )->queryAll();
        return $row;
    }

    private function toDoc(array $row): array
    {
        $items = array_map(static function (array $item): array {
            $item['qty'] = (int) $item['qty'];
            $item['unit_price'] = (float) $item['unit_price'];
            $item['subtotal'] = (float) $item['subtotal'];
            return $item;
        }, (array) ($row['items'] ?? []));

        foreach (['discount', 'subtotal', 'total'] as $field) {
            if (array_key_exists($field, $row)) {
                $row[$field] = (float) $row[$field];
            }
        }
        $row['products'] = $items;
        $row['items'] = $items;
        return $row;
    }
}
