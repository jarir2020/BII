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

        // ── Debug trace: record every SMTP step + the server reply, so a failure
        //    can report the exact step delivery got stuck at. ───────────────────
        $steps = [];   // e.g. ["connect => tcp://smtp.gmail.com:587", "starttls => 220 2.0.0 Ready to start TLS", ...]
        $last = '';    // label of the step that most recently ran

        try {
            if ($host === '' || $user === '' || $pass === '') {
                throw new RuntimeException('SMTP not configured (host/user/pass missing)');
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
                throw new RuntimeException("connect failed: {$errstr} ({$errno})");
            }
            $steps[] = "connect => tcp://{$host}:{$port}";

            $steps[] = 'greeting => ' . trim(self::expect($conn, '220'));
            $last = 'greeting';

            $steps[] = 'ehlo => ' . trim(self::command($conn, 'EHLO ' . (gethostname() ?: 'localhost')));
            $last = 'ehlo';

            // STARTTLS — note: SMTP servers reply 220 (NOT 250) to STARTTLS (RFC 3207).
            $steps[] = 'starttls => ' . trim(self::command($conn, 'STARTTLS', '220'));
            $last = 'starttls';

            stream_set_timeout($conn, 10);
            if (!stream_socket_enable_crypto($conn, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('STARTTLS negotiation failed');
            }
            $steps[] = 'tls => enabled';
            $last = 'tls';

            $steps[] = 'ehlo-tls => ' . trim(self::command($conn, 'EHLO ' . (gethostname() ?: 'localhost')));
            $last = 'ehlo-tls';

            $steps[] = 'auth-login => ' . trim(self::command($conn, 'AUTH LOGIN', '334'));
            $last = 'auth-login';

            $steps[] = 'auth-user => ' . trim(self::command($conn, base64_encode($user), '334'));
            $last = 'auth-user';

            $steps[] = 'auth-pass => ' . trim(self::command($conn, base64_encode($pass), '235'));
            $last = 'auth-pass';

            $steps[] = 'mail-from => ' . trim(self::command($conn, "MAIL FROM:<{$from}>", '250'));
            $last = 'mail-from';

            $steps[] = 'rcpt-to => ' . trim(self::command($conn, "RCPT TO:<{$to}>", '250'));
            $last = 'rcpt-to';

            $steps[] = 'data => ' . trim(self::command($conn, 'DATA', '354'));
            $last = 'data';

            $message = "Subject: {$subject}\r\n"
                . "From: {$from}\r\n"
                . "To: {$to}\r\n"
                . "MIME-Version: 1.0\r\n"
                . "Content-Type: text/html; charset=UTF-8\r\n"
                . "\r\n"
                . $html . "\r\n.\r\n";
            fwrite($conn, $message);
            $steps[] = 'send-data => ' . trim(self::expect($conn, '250'));
            $last = 'send-data';

            // QUIT — servers reply 221 when closing the connection (RFC 5321).
            $steps[] = 'quit => ' . trim(self::command($conn, 'QUIT', '221'));
            $last = 'quit';
        } catch (Throwable $e) {
            $trace = implode(' | ', $steps);
            throw new RuntimeException(
                'SMTP stuck at step [' . $last . '] -> ' . $e->getMessage() . ' || steps: ' . $trace,
                0,
                $e
            );
        } finally {
            if (isset($conn) && is_resource($conn)) {
                @fclose($conn);
            }
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
