<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Telegram;
use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * POST /api/telegram/webhook — Telegram inline-button callbacks.
 *
 * Validated by the X-Telegram-Bot-Api-Secret-Token header (derived from the bot
 * token), NOT by user JWT. Lets an admin approve/reject a payment request
 * straight from Telegram, mirroring the FastAPI implementation.
 */
class TelegramController extends ApiController
{
    public function actionWebhook(): array
    {
        // Verify the request really comes from Telegram.
        $secret = (string) Yii::$app->request->headers->get('X-Telegram-Bot-Api-Secret-Token', '');
        if ($secret === '' || $secret !== Telegram::webhookSecret()) {
            return ['ok' => false];
        }

        $raw = (string) Yii::$app->request->getRawBody();
        $body = json_decode($raw, true);
        if (!is_array($body)) {
            return ['ok' => true];
        }

        // Plain message (e.g. /start or any text) → reply with the chat ID so the
        // admin can discover TELEGRAM_CHAT_ID. This is the onboarding helper.
        $msg = $body['message'] ?? null;
        if (is_array($msg)) {
            $chatId = $msg['chat']['id'] ?? null;
            $first = (string) ($msg['from']['first_name'] ?? $msg['chat']['first_name'] ?? '');
            if ($chatId !== null) {
                Telegram::api('sendMessage', [
                    'chat_id' => $chatId,
                    'text' => "👋 আসসালামু আলাইকুম, {$first}!\n\nআপনার Telegram Chat ID:\n<code>{$chatId}</code>\n\nএটি অ্যাডমিনকে জানিয়ে দিন — এটি TELEGRAM_CHAT_ID হিসেবে ব্যবহার হবে।",
                    'parse_mode' => 'HTML',
                ]);
            }
            return ['ok' => true];
        }

        // We only handle callback_query (button presses) after plain messages.
        $cb = $body['callback_query'] ?? null;
        if (!is_array($cb)) {
            return ['ok' => true];
        }

        $callbackId = (string) ($cb['id'] ?? '');
        $data = (string) ($cb['data'] ?? '');
        $tgMsg = is_array($cb['message'] ?? null) ? $cb['message'] : [];
        $tgChatId = $tgMsg['chat']['id'] ?? null;
        $tgMsgId = $tgMsg['message_id'] ?? null;
        $tgUser = is_array($cb['from'] ?? null) ? $cb['from'] : [];
        $by = $tgUser['username'] ?? ($tgUser['first_name'] ?? 'Telegram');

        if (strpos($data, ':') === false) {
            Telegram::api('answerCallbackQuery', ['callback_query_id' => $callbackId]);
            return ['ok' => true];
        }

        [$action, $pid] = explode(':', $data, 2);

        // ── Shop order approve / reject ──
        if ($action === 'approve_order' || $action === 'reject_order') {
            $order = Yii::$app->db->createCommand(
                'SELECT * FROM shop_orders WHERE id = :id', [':id' => $pid]
            )->queryOne();
            if ($order === false) {
                Telegram::api('answerCallbackQuery', ['callback_query_id' => $callbackId, 'text' => '❌ অর্ডার পাওয়া যায়নি', 'show_alert' => true]);
                return ['ok' => true];
            }
            if ($order['status'] !== 'pending') {
                Telegram::api('answerCallbackQuery', ['callback_query_id' => $callbackId, 'text' => "ℹ️ ইতিমধ্যে {$order['status']}", 'show_alert' => true]);
                return ['ok' => true];
            }
            $newStatus = $action === 'approve_order' ? 'confirmed' : 'cancelled';
            $emoji = $action === 'approve_order' ? '✅' : '❌';
            Yii::$app->db->createCommand()->update('shop_orders', [
                'status' => $newStatus, 'updated_at' => Time::utc(),
            ], ['id' => $pid])->execute();
            Telegram::api('answerCallbackQuery', [
                'callback_query_id' => $callbackId,
                'text' => $emoji . ' ' . ($newStatus === 'confirmed' ? 'অর্ডার অনুমোদন হয়েছে!' : 'অর্ডার বাতিল হয়েছে'),
            ]);
            // Edit the original message to show the decision
            $newText = implode("\n", [
                $emoji . ' <b>' . ($newStatus === 'confirmed' ? 'অর্ডার অনুমোদিত!' : 'অর্ডার বাতিল!') . '</b>',
                "",
                "👤 <b>ক্রেতা:</b> " . $this->h($order['user_name'] ?? ''),
                "📱 <b>মোবাইল:</b> " . $this->h($order['user_phone'] ?? '—'),
                "💰 <b>মোট:</b> ৳" . $this->h((string) ($order['total'] ?? 0)),
            ]);

            if (!empty($order['transaction_id'])) {
                $newText .= "\n🔖 <b>ট্রানজেকশন ID:</b> <code>" . $this->h($order['transaction_id']) . "</code>";
            }

            $newText .= implode("\n", [
                "🏠 <b>ডেলিভারি:</b> " . $this->h($order['delivery_address'] ?? '—'),
                "",
                "{$emoji} @{$by} কর্তৃক " . ($newStatus === 'confirmed' ? 'অনুমোদিত' : 'বাতিল') . ' — ' . Time::utc(),
            ]);
            Telegram::api('editMessageText', [
                'chat_id' => $tgChatId, 'message_id' => $tgMsgId,
                'text' => $newText, 'parse_mode' => 'HTML',
            ]);
            return ['ok' => true];
        }

        // ── Course payment approve / reject ──
        $req = Yii::$app->db->createCommand(
            'SELECT * FROM payment_requests WHERE id = :id', [':id' => $pid]
        )->queryOne();
        if ($req === false) {
            Telegram::api('answerCallbackQuery', [
                'callback_query_id' => $callbackId,
                'text' => '❌ রিকোয়েস্ট পাওয়া যায়নি',
                'show_alert' => true,
            ]);
            return ['ok' => true];
        }
        if ($req['status'] !== 'pending') {
            $label = $req['status'] === 'approved' ? 'অনুমোদিত' : 'বাতিল';
            Telegram::api('answerCallbackQuery', [
                'callback_query_id' => $callbackId,
                'text' => "ℹ️ ইতিমধ্যে {$label} হয়েছে",
                'show_alert' => true,
            ]);
            return ['ok' => true];
        }

        $now = Time::now();
        $newText = '';

        if ($action === 'approve') {
            $this->enroll($req);
            Yii::$app->db->createCommand()->update('payment_requests', [
                'status' => 'approved',
                'processed_at' => $now,
                'processed_by' => "@{$by} (Telegram)",
            ], ['id' => $pid])->execute();
            Telegram::api('answerCallbackQuery', [
                'callback_query_id' => $callbackId,
                'text' => '✅ অনুমোদন হয়েছে!',
            ]);
            $newText = implode("\n", [
                "✅ <b>অনুমোদিত হয়েছে!</b>",
                "",
                "👤 <b>শিক্ষার্থী:</b> " . $this->h($req['user_name'] ?? ''),
                "📱 <b>মোবাইল:</b> " . $this->h($req['user_phone'] ?? '—'),
                "📧 <b>ইমেইল:</b> " . $this->h($req['user_email'] ?? ''),
                "📚 <b>কোর্স:</b> " . $this->h($req['course_title'] ?? ''),
                "💰 <b>পরিমাণ:</b> ৳" . $this->h((string) ($req['amount'] ?? 0)),
                "🔖 <b>ট্রানজেকশন ID:</b> <code>" . $this->h((string) ($req['transaction_id'] ?? '')) . "</code>",
                "",
                "✅ @{$by} কর্তৃক অনুমোদিত — শিক্ষার্থী কোর্সে যুক্ত হয়েছে।",
            ]);
        } elseif ($action === 'reject') {
            Yii::$app->db->createCommand()->update('payment_requests', [
                'status' => 'rejected',
                'processed_at' => $now,
                'processed_by' => "@{$by} (Telegram)",
            ], ['id' => $pid])->execute();
            Telegram::api('answerCallbackQuery', [
                'callback_query_id' => $callbackId,
                'text' => '❌ বাতিল করা হয়েছে',
            ]);
            $newText = implode("\n", [
                "❌ <b>বাতিল করা হয়েছে</b>",
                "",
                "👤 <b>শিক্ষার্থী:</b> " . $this->h($req['user_name'] ?? ''),
                "📚 <b>কোর্স:</b> " . $this->h($req['course_title'] ?? ''),
                "🔖 <b>ট্রানজেকশন ID:</b> <code>" . $this->h((string) ($req['transaction_id'] ?? '')) . "</code>",
                "",
                "❌ @{$by} কর্তৃক বাতিল করা হয়েছে।",
            ]);
        } else {
            return ['ok' => true];
        }

        // Replace the original alert's buttons with a done message.
        if ($tgChatId !== null && $tgMsgId !== null && $newText !== '') {
            Telegram::api('editMessageText', [
                'chat_id' => $tgChatId,
                'message_id' => $tgMsgId,
                'text' => $newText,
                'parse_mode' => 'HTML',
            ]);
        }

        return ['ok' => true];
    }

    private function h(string $v): string
    {
        return strtr($v, ['&' => '&amp;', '<' => '&lt;', '>' => '&gt;']);
    }

    /** Insert an enrollment for the student (idempotent), matching PaymentsController. */
    private function enroll(array $req): void
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
                'enrolled_at' => Time::now(),
                'payment_status' => 'success',
                'amount' => (float) $req['amount'],
                'transaction_id' => $req['transaction_id'],
                'payment_method' => $req['payment_method'],
            ])->execute();
        }
    }
}
