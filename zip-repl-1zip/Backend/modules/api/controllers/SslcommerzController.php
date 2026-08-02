<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use GuzzleHttp\Client;
use Throwable;
use Yii;
use yii\web\Response;

/**
 * /api/payments/sslcommerz/* — SSLCommerz v4 checkout + IPN fulfillment.
 */
class SslcommerzController extends ApiController
{
    private function gateways(): array
    {
        try {
            $row = Yii::$app->db->createCommand(
                'SELECT data FROM configs WHERE `key` = :k', [':k' => 'payment_gateways']
            )->queryOne();
        } catch (Throwable $e) {
            return [];
        }
        if ($row === false) {
            return [];
        }
        $data = json_decode((string) ($row['data'] ?? 'null'), true);
        return is_array($data) ? $data : [];
    }

    /** POST /api/payments/sslcommerz/init */
    public function actionInit(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();

        $cfg = $this->gateways();
        $storeId = (string) ($cfg['sslcommerz_store_id'] ?? '');
        $storePass = (string) ($cfg['sslcommerz_store_password'] ?? '');
        $sandbox = (($cfg['sslcommerz_mode'] ?? 'sandbox') !== 'live');

        if ($storeId === '' || $storePass === '') {
            $this->badRequest('SSLCommerz কনফিগার করা হয়নি। এডমিন প্যানেল → পেমেন্ট গেটওয়ে সেটিংস থেকে Store ID ও Password দিন।');
        }

        $amount = 0.0;
        $productName = '';
        $courseId = (string) ($body['course_id'] ?? '');
        $planId = (string) ($body['subscription_plan_id'] ?? '');

        if ($courseId !== '') {
            $course = Yii::$app->db->createCommand('SELECT * FROM courses WHERE id = :id', [':id' => $courseId])->queryOne();
            if ($course === false) {
                $this->notFound('কোর্স পাওয়া যায়নি');
            }
            if (Yii::$app->db->createCommand('SELECT id FROM enrollments WHERE user_id = :u AND course_id = :c', [':u' => $user['id'], ':c' => $courseId])->queryOne() !== false) {
                $this->badRequest('আপনি ইতিমধ্যে এই কোর্সে ভর্তি আছেন');
            }
            $amount = (float) $course['price'];
            $productName = $course['title_bn'] ?: $course['title_en'];
        } elseif ($planId !== '') {
            $plan = $this->findPlan($planId);
            if ($plan === null) {
                $this->notFound('সাবস্ক্রিপশন প্ল্যান পাওয়া যায়নি');
            }
            $amount = (float) $plan['price'];
            $productName = $plan['name_bn'] ?? 'সাবস্ক্রিপশন';
        } else {
            $this->badRequest('course_id অথবা subscription_plan_id দিন');
        }

        if ($amount < 10) {
            $this->badRequest('পেমেন্টের পরিমাণ কমপক্ষে ১০ টাকা হতে হবে');
        }

        $tranId = Uuid::v4();
        $siteUrl = rtrim((string) (Yii::$app->params['siteUrl'] ?? 'http://localhost'), '/');

        Yii::$app->db->createCommand()->insert('payment_intents', [
            'id' => $tranId,
            'user_id' => $user['id'],
            'user_email' => $user['email'] ?? '',
            'user_name' => $user['name'] ?? '',
            'user_phone' => $user['phone'] ?? '',
            'course_id' => $courseId !== '' ? $courseId : null,
            'subscription_plan_id' => $planId !== '' ? $planId : null,
            'amount' => $amount,
            'product_name' => $productName,
            'status' => 'pending',
            'created_at' => $this->now(),
        ])->execute();

        $api = $sandbox
            ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
            : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

        $payload = [
            'store_id' => $storeId,
            'store_passwd' => $storePass,
            'total_amount' => $amount,
            'currency' => 'BDT',
            'tran_id' => $tranId,
            'success_url' => $siteUrl . '/api/payments/sslcommerz/success',
            'fail_url' => $siteUrl . '/api/payments/sslcommerz/fail',
            'cancel_url' => $siteUrl . '/api/payments/sslcommerz/cancel',
            'ipn_url' => $siteUrl . '/api/payments/sslcommerz/ipn',
            'cus_name' => $user['name'] ?? '',
            'cus_email' => $user['email'] ?? '',
            'cus_add1' => $user['address'] ?? 'N/A',
            'cus_city' => 'Dhaka',
            'cus_state' => 'Dhaka',
            'cus_postcode' => '1000',
            'cus_country' => 'Bangladesh',
            'cus_phone' => $user['phone'] ?? '01700000000',
            'shipping_method' => 'NO',
            'num_of_item' => 1,
            'product_name' => $productName,
            'product_category' => 'Service',
            'product_profile' => 'non-physical-goods',
        ];

        try {
            $client = new Client(['timeout' => 20]);
            $resp = $client->post($api, ['form_params' => $payload]);
            $data = json_decode((string) $resp->getBody(), true);
        } catch (Throwable $e) {
            $this->json(['detail' => 'SSLCommerz সার্ভারে সংযোগ করা সম্ভব হয়নি। পরে চেষ্টা করুন।'], 502);
            return $this->json(['detail' => 'error']);
        }

        if (($data['status'] ?? '') !== 'SUCCESS') {
            $this->json(['detail' => 'SSLCommerz ত্রুটি: ' . ($data['failedreason'] ?? 'Unknown error')], 502);
            return $this->json(['detail' => 'error']);
        }

        return $this->json([
            'gateway_url' => $data['GatewayPageURL'] ?? '',
            'tran_id' => $tranId,
        ]);
    }

    /** POST /api/payments/sslcommerz/ipn */
    public function actionIpn(): \yii\web\Response
    {
        $form = Yii::$app->request->post();
        $tranId = (string) ($form['tran_id'] ?? '');
        $valId = (string) ($form['val_id'] ?? '');
        $status = (string) ($form['status'] ?? '');

        if (!in_array($status, ['VALID', 'VALIDATED'], true)) {
            return $this->json(['ok' => false, 'reason' => 'status not valid']);
        }

        $cfg = $this->gateways();
        $storeId = (string) ($cfg['sslcommerz_store_id'] ?? '');
        $storePass = (string) ($cfg['sslcommerz_store_password'] ?? '');
        $sandbox = (($cfg['sslcommerz_mode'] ?? 'sandbox') !== 'live');

        if ($storeId !== '' && $storePass !== '' && $this->verify($valId, $storeId, $storePass, $sandbox)) {
            $this->fulfill($tranId);
        }

        return $this->json(['ok' => true]);
    }

    /** GET /api/payments/sslcommerz/success */
    public function actionSuccess(): Response
    {
        $tranId = (string) Yii::$app->request->get('tran_id', '');
        $this->fulfill($tranId);
        return $this->redirectHome();
    }

    /** GET /api/payments/sslcommerz/fail */
    public function actionFail(): Response
    {
        return $this->redirectHome();
    }

    /** GET /api/payments/sslcommerz/cancel */
    public function actionCancel(): Response
    {
        return $this->redirectHome();
    }

    private function verify(string $valId, string $storeId, string $storePass, bool $sandbox): bool
    {
        $url = ($sandbox
            ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
            : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php');
        try {
            $client = new Client(['timeout' => 15]);
            $resp = $client->get($url, ['query' => [
                'val_id' => $valId, 'store_id' => $storeId, 'store_passwd' => $storePass, 'format' => 'json',
            ]]);
            $data = json_decode((string) $resp->getBody(), true);
            return in_array($data['status'] ?? '', ['VALID', 'VALIDATED'], true);
        } catch (Throwable $e) {
            Yii::warning("SSLCommerz verify failed: {$e->getMessage()}", __METHOD__);
            return false;
        }
    }

    private function fulfill(string $tranId): void
    {
        $intent = Yii::$app->db->createCommand('SELECT * FROM payment_intents WHERE id = :id', [':id' => $tranId])->queryOne();
        if ($intent === false || ($intent['status'] ?? '') === 'fulfilled') {
            return;
        }
        Yii::$app->db->createCommand()->update('payment_intents', ['status' => 'fulfilled'], ['id' => $tranId])->execute();

        $now = $this->now();

        // Course enrollment.
        if (!empty($intent['course_id'])) {
            $exists = Yii::$app->db->createCommand(
                'SELECT id FROM enrollments WHERE user_id = :u AND course_id = :c',
                [':u' => $intent['user_id'], ':c' => $intent['course_id']]
            )->queryOne();
            if ($exists === false) {
                Yii::$app->db->createCommand()->insert('enrollments', [
                    'id' => Uuid::v4(), 'user_id' => $intent['user_id'], 'course_id' => $intent['course_id'],
                    'enrolled_at' => $now, 'payment_status' => 'success', 'amount' => (float) $intent['amount'],
                    'transaction_id' => $tranId, 'payment_method' => 'sslcommerz',
                ])->execute();
            }
        }

        // Subscription activation (Phase 6 tables).
        if (!empty($intent['subscription_plan_id'])) {
            $this->activateSubscription($intent, $tranId);
        }
    }

    private function activateSubscription(array $intent, string $tranId): void
    {
        try {
            $plan = Yii::$app->db->createCommand(
                'SELECT * FROM subscription_plans WHERE id = :id', [':id' => $intent['subscription_plan_id']]
            )->queryOne();
            if ($plan === false) {
                return;
            }
            $days = (int) ($plan['duration_days'] ?? 30);
            $expires = \app\helpers\Time::addDays($this->now(), $days);
            Yii::$app->db->createCommand()->insert('subscriptions', [
                'id' => Uuid::v4(), 'user_id' => $intent['user_id'], 'plan_id' => $plan['id'],
                'plan_name' => $plan['name_bn'] ?? '', 'amount' => (float) $intent['amount'],
                'transaction_id' => $tranId, 'gateway' => 'sslcommerz',
                'started_at' => $this->now(), 'expires_at' => $expires, 'status' => 'active',
            ])->execute();
        } catch (Throwable $e) {
            Yii::warning("Subscription activation skipped: {$e->getMessage()}", __METHOD__);
        }
    }

    private function findPlan(string $id): ?array
    {
        try {
            $row = Yii::$app->db->createCommand('SELECT * FROM subscription_plans WHERE id = :id', [':id' => $id])->queryOne();
            return $row === false ? null : $row;
        } catch (Throwable $e) {
            return null;
        }
    }

    private function redirectHome(): Response
    {
        $siteUrl = rtrim((string) (Yii::$app->params['siteUrl'] ?? 'http://localhost'), '/');
        $resp = Yii::$app->response;
        $resp->format = Response::FORMAT_HTML;
        $resp->data = '<script>window.location.href="' . $siteUrl . '";</script><p>Redirecting…</p>';
        return $resp;
    }
}
