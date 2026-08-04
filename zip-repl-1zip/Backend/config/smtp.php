<?php

declare(strict_types=1);

/**
 * Hardcoded SMTP (Gmail) credentials.
 *
 * These live in code — NOT the DB `settings` row — so password-reset email
 * delivery keeps working even if the client clears/resets the SMTP settings in
 * the admin panel (which has happened before). `AuthController::sendOtpEmail`
 * treats this file as authoritative and only falls back to the DB for any key
 * missing here.
 *
 * The app password belongs to saidurmollah100@gmail.com (Gmail SMTP). Update
 * here (base64-encoded) if the client rotates it.
 */
return [
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => 587,
    'smtp_user' => 'saidurmollah100@gmail.com',
    'smtp_pass' => base64_decode('dHZxZSBiZHd2IGRqcHIgaXdvdQ=='),
    'smtp_from' => 'saidurmollah100@gmail.com',
];
