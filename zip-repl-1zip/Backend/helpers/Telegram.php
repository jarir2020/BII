<?php

declare(strict_types=1);

namespace app\helpers;

use Yii;

/**
 * Telegram payment-notification + approve/reject bot (FastAPI parity).
 *
 * Reads TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID from the environment (.env).
 * - notifyPaymentRequest(): sends a "new payment request" alert with
 *   Approve/Reject inline buttons to the admin chat.
 * - api(): generic Bot API call (used by the webhook to answer callbacks).
 * - webhookSecret(): derived secret token used to verify webhook requests.
 *
 * All calls fail silently so the payment flow never breaks on notification errors.
 */
final class Telegram
{
    private const API = 'https://api.telegram.org/bot';

    private static function token(): string
    {
        return (string) (getenv('TELEGRAM_BOT_TOKEN') ?: '');
    }

    private static function chatId(): string
    {
        return (string) (getenv('TELEGRAM_CHAT_ID') ?: '');
    }

    /** Derive a Telegram-safe secret_token from the bot token (32 hex chars). */
    public static function webhookSecret(): string
    {
        return substr(hash('sha256', self::token() ?: 'fallback'), 0, 32);
    }

    /** Call the Telegram Bot API. Returns the parsed JSON response array ([] on failure). */
    public static function api(string $method, array $payload): array
    {
        $token = self::token();
        if ($token === '') {
            return [];
        }
        try {
            $ch = curl_init(self::API . $token . '/' . $method);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_TIMEOUT => 15,
            ]);
            $resp = curl_exec($ch);
            curl_close($ch);
            $data = json_decode((string) $resp, true);
            return is_array($data) ? $data : [];
        } catch (\Throwable $e) {
            Yii::warning('Telegram API error: ' . $e->getMessage(), __METHOD__);
            return [];
        }
    }

    private static function esc(string $v): string
    {
        return strtr($v, ['&' => '&amp;', '<' => '&lt;', '>' => '&gt;']);
    }

    /** Send a new-payment-request alert (HTML) with Approve/Reject buttons. */
    public static function notifyPaymentRequest(array $r): bool
    {
        $chatId = self::chatId();
        if (self::token() === '' || $chatId === '') {
            return false; // disabled
        }
        $text = implode("\n", [
            "🆕 <b>নতুন পেমেন্ট রিকোয়েস্ট!</b>",
            "",
            "👤 <b>শিক্ষার্থী:</b> " . self::esc((string) ($r['user_name'] ?? '')),
            "📱 <b>মোবাইল:</b> " . self::esc((string) ($r['user_phone'] ?? '—')),
            "📧 <b>ইমেইল:</b> " . self::esc((string) ($r['user_email'] ?? '')),
            "📚 <b>কোর্স:</b> " . self::esc((string) ($r['course_title'] ?? '')),
            "💰 <b>পরিমাণ:</b> ৳" . self::esc((string) ($r['amount'] ?? 0)),
            "🏦 <b>মাধ্যম:</b> " . self::esc(strtoupper((string) ($r['payment_method'] ?? ''))),
            "🔖 <b>ট্রানজেকশন ID:</b> <code>" . self::esc((string) ($r['transaction_id'] ?? '')) . "</code>",
            "🕐 <b>সময়:</b> " . self::esc(substr((string) ($r['submitted_at'] ?? ''), 0, 19)),
        ]);
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
            'reply_markup' => [
                'inline_keyboard' => [[
                    ['text' => '✅ অনুমোদন করুন', 'callback_data' => "approve:{$r['id']}"],
                    ['text' => '❌ বাতিল করুন', 'callback_data' => "reject:{$r['id']}"],
                ]],
            ],
        ];
        $resp = self::api('sendMessage', $payload);
        return isset($resp['ok']) && $resp['ok'] === true;
    }

    /** Send a shop order alert to the admin Telegram chat. */
    public static function notifyShopOrder(array $order): bool
    {
        $chatId = self::chatId();
        if (self::token() === '' || $chatId === '') {
            return false;
        }

        // Build item list
        $lines = [];
        foreach ($order['items'] ?? [] as $item) {
            $lines[] = "  • " . self::esc((string) ($item['product_name'] ?? ''))
                     . " ×" . self::esc((string) ($item['qty'] ?? 1))
                     . " — ৳" . self::esc((string) ($item['subtotal'] ?? 0));
        }
        $itemBlock = $lines !== '' ? implode("\n", $lines) : '  (কোনো আইটেম নেই)';

        $text = implode("\n", [
            "🛒 <b>নতুন অনলাইন অর্ডার!</b>",
            "",
            "👤 <b>ক্রেতা:</b> " . self::esc((string) ($order['user_name'] ?? '')),
            "📱 <b>মোবাইল:</b> " . self::esc((string) ($order['user_phone'] ?? '—')),
            "📧 <b>ইমেইল:</b> " . self::esc((string) ($order['user_email'] ?? '')),
            "",
            "📦 <b>আইটেম:</b>",
            $itemBlock,
            "",
            "💰 <b>মোট:</b> ৳" . self::esc((string) ($order['total'] ?? 0)),
            "💰 <b>পেমেন্ট:</b> " . self::esc(strtoupper((string) ($order['payment_method'] ?? ''))),
        ]);

        // Optional fields — only show if present
        if (!empty($order['payment_number'])) {
            $text .= "\n📱 <b>পেমেন্ট নম্বর:</b> " . self::esc((string) $order['payment_number']);
        }
        if (!empty($order['transaction_id'])) {
            $text .= "\n🔖 <b>ট্রানজেকশন ID:</b> <code>" . self::esc((string) $order['transaction_id']) . "</code>";
        }
        if (!empty($order['order_number'])) {
            $text .= "\n📋 <b>অর্ডার নম্বর:</b> " . self::esc((string) $order['order_number']);
        }

        $text .= implode("\n", [
            "",
            "🏠 <b>ডেলিভারি:</b> " . self::esc((string) ($order['delivery_address'] ?? '—')),
            "🕐 <b>সময়:</b> " . self::esc(substr((string) ($order['created_at'] ?? ''), 0, 19)),
        ]);

        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
            'reply_markup' => [
                'inline_keyboard' => [[
                    ['text' => '✅ অর্ডার অনুমোদন', 'callback_data' => "approve_order:{$order['id']}"],
                    ['text' => '❌ অর্ডার বাতিল', 'callback_data' => "reject_order:{$order['id']}"],
                ]],
            ],
        ];

        $resp = self::api('sendMessage', $payload);
        return isset($resp['ok']) && $resp['ok'] === true;
    }
}
