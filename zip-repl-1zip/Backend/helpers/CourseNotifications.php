<?php

declare(strict_types=1);

namespace app\helpers;

use app\components\FcmService;
use Throwable;
use Yii;

/**
 * In-app notifications for course purchase and completion events.
 *
 * This writes the existing notifications feed and sends the same event to
 * registered mobile devices through FCM. Notification failures are
 * intentionally non-fatal so they cannot interrupt payment fulfillment.
 */
final class CourseNotifications
{
    public static function purchaseSubmitted(array $payment): void
    {
        $student = self::value($payment, 'user_name', 'Student');
        $course = self::courseTitle($payment);
        $amount = self::amount($payment);
        $transaction = self::value($payment, 'transaction_id', '');
        $image = self::courseImage($payment);

        self::notifyAdmins(
            'নতুন কোর্স কেনার রিকোয়েস্ট',
            'New course purchase request',
            'শিক্ষার্থী "' . $student . '" "' . $course . '" কোর্স কেনার জন্য পেমেন্ট রিকোয়েস্ট পাঠিয়েছেন। পরিমাণ: ৳' . $amount . ($transaction !== '' ? ', ট্রানজেকশন আইডি: ' . $transaction : ''),
            'Student "' . $student . '" submitted a payment request for the course "' . $course . '". Amount: ৳' . $amount . ($transaction !== '' ? ', transaction ID: ' . $transaction : ''),
            $image,
            '/admin/payments'
        );
    }

    public static function purchaseApproved(array $payment): void
    {
        $course = self::courseTitle($payment);
        $amount = self::amount($payment);
        $image = self::courseImage($payment);

        self::notifyUser(
            (string) ($payment['user_id'] ?? ''),
            'পেমেন্ট অনুমোদিত — কোর্সে ভর্তি সম্পন্ন!',
            'Payment approved — enrollment complete',
            'আপনার ৳' . $amount . ' পেমেন্ট যাচাই হয়েছে। "' . $course . '" কোর্সে আপনাকে ভর্তি করা হয়েছে। এখনই শুরু করুন!',
            'Your payment of ৳' . $amount . ' has been verified. You are enrolled in "' . $course . '". Start learning now!',
            $image,
            '/my-courses'
        );
    }

    public static function courseCompleted(array $payment): void
    {
        $student = self::value($payment, 'user_name', 'Student');
        $course = self::courseTitle($payment);
        $image = self::courseImage($payment);

        self::notifyUser(
            (string) ($payment['user_id'] ?? ''),
            'কোর্স সম্পন্ন হয়েছে',
            'Course completed',
            'আপনার "' . $course . '" কোর্সটি সম্পন্ন হয়েছে। এই কোর্সের লাইভ ক্লাস আর দেখানো হবে না। ফ্রি লাইভ ক্লাসগুলো আপনি দেখতে পারবেন।',
            'Your "' . $course . '" course has been completed. Live classes for this course will no longer be shown, but free live classes remain available to you.',
            $image,
            '/my-courses'
        );

        self::notifyAdmins(
            'কোর্স সম্পন্ন করা হয়েছে',
            'Course marked complete',
            'শিক্ষার্থী "' . $student . '"-এর "' . $course . '" কোর্সটি অ্যাডমিন সম্পন্ন করেছেন।',
            'The course "' . $course . '" for student "' . $student . '" was marked complete by an admin.',
            $image,
            '/admin/payments'
        );
    }

    private static function notifyAdmins(string $titleBn, string $titleEn, string $bodyBn, string $bodyEn, string $imageUrl = '', string $clickAction = '/notifications'): void
    {
        try {
            $adminIds = Yii::$app->db->createCommand(
                'SELECT id FROM users WHERE role IN ("admin", "super_admin")'
            )->queryColumn();
            foreach ($adminIds as $adminId) {
                self::insert((string) $adminId, $titleBn, $titleEn, $bodyBn, $bodyEn, $imageUrl, $clickAction);
            }
        } catch (Throwable $e) {
            Yii::warning('Admin course notification skipped: ' . $e->getMessage(), __METHOD__);
        }
    }

    private static function notifyUser(string $userId, string $titleBn, string $titleEn, string $bodyBn, string $bodyEn, string $imageUrl = '', string $clickAction = '/notifications'): void
    {
        if ($userId === '') {
            return;
        }
        self::insert($userId, $titleBn, $titleEn, $bodyBn, $bodyEn, $imageUrl, $clickAction);
    }

    private static function insert(string $userId, string $titleBn, string $titleEn, string $bodyBn, string $bodyEn, string $imageUrl = '', string $clickAction = '/notifications'): void
    {
        try {
            NotificationStore::insert([
                'id' => Uuid::v4(),
                'user_id' => $userId,
                'title_bn' => $titleBn,
                'title_en' => $titleEn,
                'body_bn' => $bodyBn,
                'body_en' => $bodyEn,
                'image_url' => $imageUrl,
                'read' => 0,
                'created_at' => Time::now(),
            ]);
        } catch (Throwable $e) {
            Yii::warning('Course notification skipped: ' . $e->getMessage(), __METHOD__);
        }

        // Push delivery is best-effort. Missing Firebase configuration,
        // permissions, or device tokens must not break the course workflow.
        try {
            FcmService::sendToTarget([
                'title_bn' => $titleBn,
                'title_en' => $titleEn,
                'body_bn' => $bodyBn,
                'body_en' => $bodyEn,
                'image_url' => $imageUrl,
                'click_action' => $clickAction,
            ], 'user:' . $userId);
        } catch (Throwable $e) {
            Yii::warning('Course mobile push skipped: ' . $e->getMessage(), __METHOD__);
        }
    }

    private static function courseTitle(array $payment): string
    {
        return self::value($payment, 'course_title', self::value($payment, 'product_name', 'Course'));
    }

    private static function courseImage(array $payment): string
    {
        $image = self::value($payment, 'course_image', self::value($payment, 'image_url', ''));
        if ($image !== '' || empty($payment['course_id'])) {
            return $image;
        }

        try {
            $image = Yii::$app->db->createCommand(
                'SELECT cover_image FROM courses WHERE id = :id', [':id' => $payment['course_id']]
            )->queryScalar();
            return trim((string) $image);
        } catch (Throwable $e) {
            return '';
        }
    }

    private static function amount(array $payment): string
    {
        return (string) ($payment['amount'] ?? '0');
    }

    private static function value(array $payment, string $key, string $fallback): string
    {
        $value = trim((string) ($payment[$key] ?? ''));
        return $value !== '' ? $value : $fallback;
    }
}
