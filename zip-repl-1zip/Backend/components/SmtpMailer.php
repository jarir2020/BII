<?php

declare(strict_types=1);

namespace app\components;

use RuntimeException;

/**
 * Minimal dependency-free SMTP sender with STARTTLS + AUTH LOGIN.
 * Mirrors FastAPI's smtplib usage (host/port/user/pass/from from the
 * `settings` table, id='main').
 */
class SmtpMailer
{
    /**
     * @param array $s SMTP settings (host, port, user, pass, from)
     * @throws RuntimeException on any failure (incl. unconfigured settings)
     */
    public static function send(array $s, string $to, string $subject, string $html): void
    {
        $host = trim((string) ($s['smtp_host'] ?? ''));
        $port = (int) ($s['smtp_port'] ?? 587);
        $user = trim((string) ($s['smtp_user'] ?? ''));
        $pass = (string) ($s['smtp_pass'] ?? '');
        $from = trim((string) ($s['smtp_from'] ?? $user));

        if ($host === '' || $user === '' || $pass === '') {
            throw new RuntimeException('SMTP not configured');
        }

        $errno = 0;
        $errstr = '';
        $conn = @stream_socket_client(
            "tcp://{$host}:{$port}",
            $errno,
            $errstr,
            10,
            STREAM_CLIENT_CONNECT
        );
        if ($conn === false) {
            throw new RuntimeException("SMTP connect failed: {$errstr} ({$errno})");
        }

        try {
            self::expect($conn, '220');

            self::command($conn, "EHLO " . (gethostname() ?: 'localhost'));
            // skip multiline greeting (codes like 250-...)

            // STARTTLS when supported (always attempt)
            self::command($conn, 'STARTTLS');
            stream_set_timeout($conn, 10);
            if (!stream_socket_enable_crypto($conn, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('SMTP STARTTLS negotiation failed');
            }

            self::command($conn, "EHLO " . (gethostname() ?: 'localhost'));

            // AUTH LOGIN
            self::command($conn, 'AUTH LOGIN', '334');
            self::command($conn, base64_encode($user), '334');
            self::command($conn, base64_encode($pass), '235');

            self::command($conn, "MAIL FROM:<{$from}>", '250');
            self::command($conn, "RCPT TO:<{$to}>", '250');

            self::command($conn, 'DATA', '354');
            $message = "Subject: {$subject}\r\n"
                . "From: {$from}\r\n"
                . "To: {$to}\r\n"
                . "MIME-Version: 1.0\r\n"
                . "Content-Type: text/html; charset=UTF-8\r\n"
                . "\r\n"
                . $html . "\r\n.\r\n";
            fwrite($conn, $message);
            self::expect($conn, '250');

            self::command($conn, 'QUIT');
        } finally {
            fclose($conn);
        }
    }

    private static function command($conn, string $cmd, string $expect = '250'): string
    {
        fwrite($conn, $cmd . "\r\n");
        return self::expect($conn, $expect);
    }

    private static function expect($conn, string $code): string
    {
        $line = '';
        while (true) {
            $response = fgets($conn, 512);
            if ($response === false) {
                throw new RuntimeException("SMTP connection closed (expected {$code})");
            }
            $line .= $response;
            // 250- continuation vs 250 final: continuation has '-' at position 3
            if (strlen($response) >= 4 && $response[3] !== '-') {
                break;
            }
        }
        $actual = substr($line, 0, 3);
        if ($actual !== $code) {
            throw new RuntimeException("SMTP unexpected response {$actual} (expected {$code}): {$line}");
        }
        return $line;
    }
}
