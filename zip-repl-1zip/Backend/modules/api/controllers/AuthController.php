<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\components\SmtpMailer;
use app\helpers\Time;
use app\helpers\Uuid;
use app\models\User;
use RuntimeException;
use Throwable;
use Yii;

/**
 * /api/auth/* and /api/users/me — mirrors FastAPI's auth endpoints.
 */
class AuthController extends ApiController
{
    public function actionRegister(): \yii\web\Response
    {
        $body = Yii::$app->request->post();
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $name = trim((string) ($body['name'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->badRequest('Valid email is required');
        }
        if (strlen($password) < 6) {
            $this->badRequest('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
        }
        if ($name === '') {
            $this->badRequest('Name is required');
        }

        if (User::findByEmail($email) !== null) {
            $this->badRequest('এই ইমেইল ইতিমধ্যে নিবন্ধিত');
        }

        $user = [
            'id' => User::newId(),
            'name' => $name,
            'email' => $email,
            'password_hash' => User::hashPassword($password),
            'role' => 'student',
            'student_id' => User::nextStudentId(),
            'phone' => (string) ($body['phone'] ?? ''),
            'address' => (string) ($body['address'] ?? ''),
            'profile_photo' => '',
            'created_at' => Time::now(),
            'updated_at' => null,
        ];

        Yii::$app->db->createCommand()->insert('users', $user)->execute();

        $token = Yii::$app->jwt->issue($user['id'], $user['email'], $user['role']);
        Yii::$app->jwt->setAuthCookie($token);

        return $this->json([
            'user' => User::clean($user),
            'token' => $token,
        ], 200);
    }

    public function actionLogin(): \yii\web\Response
    {
        $body = Yii::$app->request->post();
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');

        // Brute-force lockout: 5 failed attempts within 15 minutes → 429.
        $windowStart = Time::addMinutes(Time::now(), -15);
        $recentFails = (int) Yii::$app->db->createCommand(
            'SELECT COUNT(*) FROM login_logs WHERE email = :email AND success = 0 AND created_at >= :ws',
            [':email' => $email, ':ws' => $windowStart]
        )->queryScalar();
        if ($recentFails >= 5) {
            $this->tooMany('অনেকবার ভুল পাসওয়ার্ড দেওয়া হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।');
        }

        $user = User::findByEmail($email);
        $ok = $user !== null && User::verifyPassword($password, $user['password_hash'] ?? '');

        // Log every attempt.
        Yii::$app->db->createCommand()->insert('login_logs', [
            'id' => Uuid::v4(),
            'user_id' => $user['id'] ?? null,
            'email' => $email,
            'name' => $user['name'] ?? '',
            'student_id' => $user['student_id'] ?? '',
            'role' => $user['role'] ?? '',
            'ip' => Yii::$app->request->userIP ?? '',
            'user_agent' => mb_substr((string) Yii::$app->request->userAgent, 0, 255),
            'success' => $ok ? 1 : 0,
            'created_at' => Time::now(),
        ])->execute();

        if (!$ok) {
            $this->unauthorized('ইমেইল বা পাসওয়ার্ড ভুল');
        }

        $token = Yii::$app->jwt->issue($user['id'], $user['email'], $user['role']);
        Yii::$app->jwt->setAuthCookie($token);

        return $this->json([
            'user' => User::clean($user),
            'token' => $token,
        ], 200);
    }

    public function actionLogout(): \yii\web\Response
    {
        Yii::$app->jwt->clearAuthCookie();
        return $this->json(['ok' => true]);
    }

    public function actionForgotPassword(): \yii\web\Response
    {
        $body = Yii::$app->request->post();
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $user = User::findByEmail($email);

        $always = ['ok' => true, 'message' => 'যদি এই ইমেইল নিবন্ধিত থাকে, OTP পাঠানো হবে।'];

        if ($user === null) {
            return $this->json($always);
        }

        $otp = (string) random_int(100000, 999999);
        $expires = Time::addMinutes(Time::now(), 15);

        Yii::$app->db->createCommand()->insert('password_resets', [
            'id' => Uuid::v4(),
            'email' => $email,
            'otp' => $otp,
            'expires_at' => $expires,
            'used' => 0,
            'created_at' => Time::now(),
        ])->execute();

        try {
            $this->sendOtpEmail($email, $otp, $user['name'] ?? '');
        } catch (Throwable $ex) {
            Yii::warning("OTP email failed: {$ex->getMessage()}", __METHOD__);
        }

        return $this->json($always);
    }

    public function actionResetPassword(): \yii\web\Response
    {
        $body = Yii::$app->request->post();
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $otp = (string) ($body['otp'] ?? '');
        $newPassword = (string) ($body['new_password'] ?? '');

        $now = Time::now();
        $record = Yii::$app->db->createCommand(
            'SELECT * FROM password_resets WHERE email = :e AND otp = :o AND used = 0 AND expires_at >= :now ORDER BY created_at DESC LIMIT 1',
            [':e' => $email, ':o' => $otp, ':now' => $now]
        )->queryOne();

        if ($record === false) {
            $this->badRequest('OTP ভুল অথবা মেয়াদ শেষ হয়ে গেছে।');
        }
        if (strlen($newPassword) < 6) {
            $this->badRequest('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
        }

        Yii::$app->db->createCommand()->update('users', [
            'password_hash' => User::hashPassword($newPassword),
        ], ['email' => $email])->execute();

        Yii::$app->db->createCommand()->update('password_resets', [
            'used' => 1,
        ], ['id' => $record['id']])->execute();

        return $this->json(['ok' => true, 'message' => 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।']);
    }

    /** GET /api/auth/me */
    public function actionMe(): \yii\web\Response
    {
        return $this->json($this->user());
    }

    public function actionChangePassword(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();
        $current = (string) ($body['current_password'] ?? '');
        $newPassword = (string) ($body['new_password'] ?? '');

        $full = User::findById($user['id']);
        if ($full === null || !User::verifyPassword($current, $full['password_hash'] ?? '')) {
            $this->badRequest('বর্তমান পাসওয়ার্ড ভুল');
        }

        Yii::$app->db->createCommand()->update('users', [
            'password_hash' => User::hashPassword($newPassword),
        ], ['id' => $user['id']])->execute();

        return $this->json(['ok' => true]);
    }

    /** Send the OTP email. Hardcoded SMTP config (config/smtp.php) is authoritative;
     *  the DB `settings` row is only used to fill keys missing from that file. */
    private function sendOtpEmail(string $to, string $otp, string $name): void
    {
        $s = require __DIR__ . '/../../../config/smtp.php';
        if (!is_array($s)) {
            $s = [];
        }

        // Fall back to the DB settings only where a hardcoded key is empty.
        $row = Yii::$app->db->createCommand('SELECT data FROM settings WHERE id = :id', [':id' => 'main'])->queryOne();
        $data = $row !== false ? json_decode($row['data'], true) : null;
        if (is_array($data)) {
            foreach (['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] as $key) {
                if (empty($s[$key]) && !empty($data[$key])) {
                    $s[$key] = $data[$key];
                }
            }
        }

        $html = $this->otpHtml($otp, $name);
        SmtpMailer::send($s, $to, 'পাসওয়ার্ড রিসেট OTP — বাঙালি ইসলামিক ইনস্টিটিউট', $html);
    }

    /** Replicates FastAPI's OTP email HTML. */
    private function otpHtml(string $otp, string $name): string
    {
        return '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #ddd;border-radius:12px;overflow:hidden">'
            . '<div style="background:#0A422B;padding:24px;text-align:center">'
            . '<h2 style="color:#fff;margin:0;font-size:20px">বাঙালি ইসলামিক ইনস্টিটিউট</h2>'
            . '<p style="color:#D4AF37;margin:4px 0 0;font-size:13px">পাসওয়ার্ড রিসেট</p></div>'
            . '<div style="padding:28px 24px">'
            . '<p style="margin:0 0 12px">আস-সালামু আলাইকুম <strong>' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
            . '<p style="margin:0 0 20px;color:#555">আপনার পাসওয়ার্ড রিসেট করতে নিচের OTP কোডটি ব্যবহার করুন।</p>'
            . '<div style="background:#f5f5f5;border-radius:10px;text-align:center;padding:20px">'
            . '<div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#0A422B">' . htmlspecialchars($otp) . '</div>'
            . '<p style="margin:8px 0 0;color:#888;font-size:12px">এই কোডটি ১৫ মিনিট পর্যন্ত কার্যকর</p></div>'
            . '<p style="margin:20px 0 0;color:#888;font-size:12px">আপনি যদি পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন।</p></div></div>';
    }
}
