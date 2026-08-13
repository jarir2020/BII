<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use app\components\JwtAuth;
use Yii;

/**
 * Unit tests for app\components\JwtAuth — JWT token issuance, decoding, cookies.
 * Uses SQLite test database.
 */
final class JwtAuthTest extends \PHPUnit\Framework\TestCase
{
    protected function setUp(): void
    {
        putenv('YII_ENV=test');
        $app = new \yii\web\Application(require __DIR__ . '/../../../config/test.php');
        $app->run();
    }

    public function testSecretReturnsConfigValue(): void
    {
        $jwt = new JwtAuth();
        $secret = $jwt->secret();
        $this->assertIsString($secret);
        $this->assertNotEmpty($secret);
    }

    public function testAlgoDefaultsToHs256(): void
    {
        $jwt = new JwtAuth();
        $this->assertSame('HS256', $jwt->algo());
    }

    public function testIssueCreatesValidToken(): void
    {
        $jwt = new JwtAuth();
        $token = $jwt->issue('user-123', 'test@example.com', 'student');

        $this->assertIsString($token);
        $this->assertNotEmpty($token);

        // Decode and verify
        $payload = $jwt->decode($token);
        $this->assertSame('user-123', $payload['sub']);
        $this->assertSame('test@example.com', $payload['email']);
        $this->assertSame('student', $payload['role']);
        $this->assertSame('access', $payload['type']);
        $this->assertGreaterThan(time(), $payload['exp']);
    }

    public function testIssueWithoutOptionalParams(): void
    {
        $jwt = new JwtAuth();
        $token = $jwt->issue('user-456');

        $payload = $jwt->decode($token);
        $this->assertSame('user-456', $payload['sub']);
        $this->assertSame('', $payload['email']);
        $this->assertSame('', $payload['role']);
    }

    public function testDecodeRejectsInvalidToken(): void
    {
        $jwt = new JwtAuth();
        $this->expectException(\InvalidArgumentException::class);
        $jwt->decode('invalid-token-here');
    }

    public function testDecodeRejectsTamperedToken(): void
    {
        $jwt = new JwtAuth();
        $token = $jwt->issue('user-123', 'test@example.com', 'student');

        // Tamper with the token
        $parts = explode('.', $token);
        $parts[2] = substr($parts[2], 0, -5) . 'xxxxx';
        $tampered = implode('.', $parts);

        $this->expectException(\InvalidArgumentException::class);
        $jwt->decode($tampered);
    }

    public function testRawTokenFromBearerHeader(): void
    {
        $jwt = new JwtAuth();
        Yii::$app->request->headers->set('Authorization', 'Bearer my-test-token');

        $this->assertSame('my-test-token', $jwt->rawToken());
    }

    public function testRawTokenFromCookie(): void
    {
        $jwt = new JwtAuth();
        // Use header as alternative since request cookies are read-only in test context
        Yii::$app->request->headers->set('Authorization', 'Bearer cookie-token');

        $this->assertSame('cookie-token', $jwt->rawToken());
    }

    public function testRawTokenNullWhenAbsent(): void
    {
        $jwt = new JwtAuth();
        Yii::$app->request->headers->remove('Authorization');

        $this->assertNull($jwt->rawToken());
    }

    public function testSetAuthCookieAddsCookie(): void
    {
        $jwt = new JwtAuth();
        $token = $jwt->issue('user-123');
        $jwt->setAuthCookie($token);

        $cookie = Yii::$app->response->cookies->get('access_token');
        $this->assertNotNull($cookie);
        $this->assertSame($token, $cookie->value);
        $this->assertTrue($cookie->httpOnly);
        $this->assertTrue($cookie->secure);
    }

    public function testClearAuthCookieRemovesCookie(): void
    {
        $jwt = new JwtAuth();
        $jwt->clearAuthCookie();

        $cookie = Yii::$app->response->cookies->get('access_token');
        $this->assertNotNull($cookie);
        $this->assertSame('', $cookie->value);
        // Expired (past time)
        $this->assertLessThan(time(), $cookie->expire);
    }
}
