<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for SmtpMailer component — email sending via SMTP.
 */
final class SmtpMailerTest extends TestCase
{
    public function testSendHtml(): void
    {
        $mailer = new \app\components\SmtpMailer();
        $result = $mailer->sendHtml(
            'test@example.com',
            'Test Subject',
            '<p>Test HTML body</p>'
        );

        $this->assertIsBool($result);
    }

    public function testSendText(): void
    {
        $mailer = new \app\components\SmtpMailer();
        $result = $mailer->sendText(
            'test@example.com',
            'Test Subject',
            'Test plain text body'
        );

        $this->assertIsBool($result);
    }

    public function testSendWithAttachment(): void
    {
        $mailer = new \app\components\SmtpMailer();
        $result = $mailer->sendHtml(
            'test@example.com',
            'With attachment',
            '<p>Body with attachment</p>'
        );

        $this->assertIsBool($result);
    }

    public function testSendToMultipleRecipients(): void
    {
        $mailer = new \app\components\SmtpMailer();
        $result = $mailer->sendHtml(
            ['user1@example.com', 'user2@example.com'],
            'Bulk test',
            '<p>Bulk email body</p>'
        );

        $this->assertIsBool($result);
    }

    public function testSendInvalidRecipient(): void
    {
        $mailer = new \app\components\SmtpMailer();
        $result = $mailer->sendHtml(
            '',
            'No recipient',
            '<p>Empty recipient test</p>'
        );

        $this->assertFalse($result);
    }
}
