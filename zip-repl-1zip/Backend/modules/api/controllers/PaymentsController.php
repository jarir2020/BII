<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Telegram;
use app\helpers\CourseNotifications;
use app\helpers\Time;
use app\helpers\Uuid;
use Yii;
use yii\web\Response;

/**
 * /api/payments/* — payment requests + approval flow (FastAPI parity).
 */
class PaymentsController extends ApiController
{
    /** POST /api/payments/submit */
    public function actionSubmit(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();

        $this->checkPaymentRate($user['id']);

        $tid = trim((string) ($body['transaction_id'] ?? ''));
        if (strlen($tid) < 6) {
            $this->badRequest('ট্রানজেকশন আইডি কমপক্ষে ৬ অক্ষরের হতে হবে');
        }
        if (!preg_match('/^[A-Za-z0-9\-_\.\s]+$/', $tid)) {
            $this->badRequest('ট্রানজেকশন আইডিতে শুধুমাত্র অক্ষর, সংখ্যা ও ড্যাশ ব্যবহার করুন');
        }

        $course = Yii::$app->db->createCommand('SELECT * FROM courses WHERE id = :id', [':id' => (string) ($body['course_id'] ?? '')])->queryOne();
        if ($course === false) {
            $this->notFound('কোর্স পাওয়া যায়নি');
        }
        if (Yii::$app->db->createCommand('SELECT id FROM enrollments WHERE user_id = :u AND course_id = :c', [':u' => $user['id'], ':c' => $course['id']])->queryOne() !== false) {
            $this->badRequest('আপনি ইতিমধ্যে এই কোর্সে ভর্তি আছেন');
        }
        if (Yii::$app->db->createCommand('SELECT id FROM payment_requests WHERE user_id = :u AND course_id = :c AND status IN ("pending","approved")', [':u' => $user['id'], ':c' => $course['id']])->queryOne() !== false) {
            $this->badRequest('এই কোর্সের জন্য আপনার একটি রিকোয়েস্ট ইতিমধ্যে জমা আছে');
        }
        if (Yii::$app->db->createCommand('SELECT id FROM payment_requests WHERE transaction_id = :t AND status <> "rejected"', [':t' => $tid])->queryOne() !== false) {
            $this->badRequest('এই ট্রানজেকশন আইডি আগে ব্যবহৃত হয়েছে');
        }

        $method = (string) ($body['payment_method'] ?? '');
        if (!in_array($method, ['bkash', 'nagad', 'rocket', 'sslcommerz', 'cash'], true)) {
            $this->badRequest('অবৈধ পেমেন্ট পদ্ধতি');
        }

        $payReq = [
            'id' => Uuid::v4(),
            'user_id' => $user['id'],
            'user_name' => $user['name'] ?? '',
            'user_email' => $user['email'] ?? '',
            'user_phone' => $user['phone'] ?? '',
            'course_id' => $course['id'],
            'course_title' => $course['title_bn'] ?: $course['title_en'],
            'transaction_id' => $tid,
            'payment_method' => $method,
            'amount' => (float) $course['price'],
            'note' => (string) ($body['note'] ?? ''),
            'status' => 'pending',
            'submitted_ip' => Yii::$app->request->userIP ?? '',
            'submitted_at' => $this->now(),
            'processed_at' => null,
            'processed_by' => '',
        ];
        Yii::$app->db->createCommand()->insert('payment_requests', $payReq)->execute();

        CourseNotifications::purchaseSubmitted($payReq);

        // Notify admins on Telegram when TELEGRAM_BOT_TOKEN + CHAT_ID are set.
        Telegram::notifyPaymentRequest($payReq);

        return $this->json(['ok' => true, 'id' => $payReq['id']]);
    }

    /** GET /api/payments/requests — admin */
    public function actionRequests(): \yii\web\Response
    {
        $this->requireAdmin();
        $rows = Yii::$app->db->createCommand(
            'SELECT p.*, e.payment_status AS enrollment_status
             FROM payment_requests p
             LEFT JOIN enrollments e ON e.user_id = p.user_id AND e.course_id = p.course_id
             ORDER BY p.submitted_at DESC LIMIT 200'
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->reqDoc($r), $rows));
    }

    /** PUT /api/payments/requests/{pid}/complete — end a student's course access to paid live classes. */
    public function actionComplete(): \yii\web\Response
    {
        $this->requireAdmin();
        $pid = (string) Yii::$app->request->get('pid', '');
        $req = $this->findRequest($pid);
        if ($req === null) {
            $this->notFound('পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি');
        }
        if ($req['status'] !== 'approved') {
            $this->badRequest('অনুমোদিত পেমেন্টের কোর্সই সম্পন্ন করা যাবে');
        }

        $enrollment = Yii::$app->db->createCommand(
            'SELECT id, payment_status FROM enrollments WHERE user_id = :u AND course_id = :c ORDER BY enrolled_at DESC LIMIT 1',
            [':u' => $req['user_id'], ':c' => $req['course_id']]
        )->queryOne();
        if ($enrollment === false) {
            $this->notFound('এই শিক্ষার্থীর এনরোলমেন্ট পাওয়া যায়নি');
        }
        if ($enrollment['payment_status'] === 'course_completed') {
            return $this->json(['ok' => true, 'already_completed' => true, 'enrollment_status' => 'course_completed']);
        }

        Yii::$app->db->createCommand()->update('enrollments', [
            'payment_status' => 'course_completed',
        ], ['id' => $enrollment['id']])->execute();

        CourseNotifications::courseCompleted($req);

        return $this->json([
            'ok' => true,
            'already_completed' => false,
            'enrollment_status' => 'course_completed',
        ]);
    }

    /** PUT /api/payments/requests/{pid}/approve */
    public function actionApprove(): \yii\web\Response
    {
        $admin = $this->requireAdmin();
        $pid = (string) Yii::$app->request->get('pid', '');
        $req = $this->findRequest($pid);
        if ($req === null) {
            $this->notFound('রিকোয়েস্ট পাওয়া যায়নি');
        }
        if ($req['status'] !== 'pending') {
            $this->badRequest('এই রিকোয়েস্ট ইতিমধ্যে প্রসেস হয়েছে');
        }

        $this->doEnroll($req);

        Yii::$app->db->createCommand()->update('payment_requests', [
            'status' => 'approved',
            'processed_at' => $this->now(),
            'processed_by' => $admin['email'],
        ], ['id' => $pid])->execute();

        CourseNotifications::purchaseApproved($req);

        return $this->json(['ok' => true]);
    }

    /** PUT /api/payments/requests/{pid}/reject */
    public function actionReject(): \yii\web\Response
    {
        $admin = $this->requireAdmin();
        $pid = (string) Yii::$app->request->get('pid', '');
        $req = $this->findRequest($pid);
        if ($req === null) {
            $this->notFound('রিকোয়েস্ট পাওয়া যায়নি');
        }
        if ($req['status'] !== 'pending') {
            $this->badRequest('এই রিকোয়েস্ট ইতিমধ্যে প্রসেস হয়েছে');
        }

        Yii::$app->db->createCommand()->update('payment_requests', [
            'status' => 'rejected',
            'processed_at' => $this->now(),
            'processed_by' => $admin['email'],
        ], ['id' => $pid])->execute();

        return $this->json(['ok' => true]);
    }

    /** GET /api/payments/requests/{pid}/quick-approve — public, HMAC link (HTML). */
    public function actionQuickApprove(): Response
    {
        $pid = (string) Yii::$app->request->get('pid', '');
        $token = (string) Yii::$app->request->get('token', '');
        if (!hash_equals($this->quickToken($pid), $token)) {
            return $this->html('<h2>❌ Invalid or expired link.</h2>', 403);
        }
        $req = $this->findRequest($pid);
        if ($req === null) {
            return $this->html('<h2>❌ Payment request not found.</h2>', 404);
        }
        if ($req['status'] !== 'pending') {
            return $this->html('<h2>✅ This request is already processed.</h2>');
        }
        $this->doEnroll($req);
        Yii::$app->db->createCommand()->update('payment_requests', ['status' => 'approved'], ['id' => $pid])->execute();
        CourseNotifications::purchaseApproved($req);
        return $this->html('<h2>✅ Payment approved — student enrolled.</h2>');
    }

    /** GET /api/payments/requests/{pid}/quick-reject — public, HMAC link (HTML). */
    public function actionQuickReject(): Response
    {
        $pid = (string) Yii::$app->request->get('pid', '');
        $token = (string) Yii::$app->request->get('token', '');
        if (!hash_equals($this->quickToken($pid), $token)) {
            return $this->html('<h2>❌ Invalid or expired link.</h2>', 403);
        }
        $req = $this->findRequest($pid);
        if ($req === null) {
            return $this->html('<h2>❌ Payment request not found.</h2>', 404);
        }
        if ($req['status'] !== 'pending') {
            return $this->html('<h2>✅ This request is already processed.</h2>');
        }
        Yii::$app->db->createCommand()->update('payment_requests', ['status' => 'rejected'], ['id' => $pid])->execute();
        return $this->html('<h2>✅ Request rejected.</h2>');
    }

    /** GET /api/my-payment-requests */
    public function actionMyRequests(): \yii\web\Response
    {
        $user = $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM payment_requests WHERE user_id = :u ORDER BY submitted_at DESC', [':u' => $user['id']]
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->reqDoc($r), $rows));
    }

    /** GET /api/payments/my-intents */
    public function actionMyIntents(): \yii\web\Response
    {
        $user = $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM payment_intents WHERE user_id = :u ORDER BY created_at DESC', [':u' => $user['id']]
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->intentDoc($r), $rows));
    }

    private function doEnroll(array $req): void
    {
        $exists = Yii::$app->db->createCommand(
            'SELECT id FROM enrollments WHERE user_id = :u AND course_id = :c',
            [':u' => $req['user_id'], ':c' => $req['course_id']]
        )->queryOne();
        if ($exists === false) {
            Yii::$app->db->createCommand()->insert('enrollments', [
                'id' => Uuid::v4(),
                'user_id' => $req['user_id'],
                'course_id' => $req['course_id'],
                'enrolled_at' => $this->now(),
                'payment_status' => 'success',
                'amount' => (float) $req['amount'],
                'transaction_id' => $req['transaction_id'],
                'payment_method' => $req['payment_method'],
            ])->execute();
        }
    }

    private function checkPaymentRate(string $userId): void
    {
        $key = 'payrate_' . $userId;
        $cache = Yii::$app->cache;
        $history = (array) ($cache->get($key) ?: []);
        $now = time();
        $history = array_values(array_filter($history, fn ($t) => ($now - (int) $t) < 3600));
        if (count($history) >= 5) {
            $this->tooMany('অনেক বেশি পেমেন্ট রিকোয়েস্ট করা হয়েছে। ১ ঘণ্টা পরে আবার চেষ্টা করুন।');
        }
        $history[] = $now;
        $cache->set($key, $history, 3600);
    }

    private function quickToken(string $paymentId): string
    {
        $secret = (string) (Yii::$app->params['jwtSecret'] ?? 'fallback-secret');
        return substr(hash_hmac('sha256', $paymentId, $secret), 0, 40);
    }

    private function findRequest(string $id): ?array
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM payment_requests WHERE id = :id', [':id' => $id])->queryOne();
        return $row === false ? null : $row;
    }

    private function reqDoc(array $row): array
    {
        $row['amount'] = (float) $row['amount'];
        return $row;
    }

    private function intentDoc(array $row): array
    {
        $row['amount'] = (float) $row['amount'];
        return $row;
    }

    private function html(string $html, int $status = 200): Response
    {
        $response = Yii::$app->response;
        $response->format = Response::FORMAT_HTML;
        $response->setStatusCode($status);
        $response->data = $html;
        return $response;
    }
}
