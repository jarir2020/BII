<?php

declare(strict_types=1);

namespace app\components;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use InvalidArgumentException;
use Throwable;
use Yii;
use yii\base\Component;

/**
 * JWT helper mirroring the FastAPI auth contract exactly:
 *
 *  - Token read from the `access_token` cookie (httponly, SameSite=None)
 *    OR the `Authorization: Bearer <token>` header.
 *  - HS256 signed with params['jwtSecret'].
 *  - Claim `sub` holds the user id (string).
 */
class JwtAuth extends Component
{
    /** @return string */
    public function secret(): string
    {
        return (string) Yii::$app->params['jwtSecret'];
    }

    public function algo(): string
    {
        return (string) (Yii::$app->params['jwtAlgo'] ?? 'HS256');
    }

    /**
     * Issue a new signed token. Matches FastAPI's create_access_token claims:
     * sub, email, role, exp (7 days), type=access.
     * @return string
     */
    public function issue(string $userId, string $email = '', string $role = ''): string
    {
        $ttl = (int) (Yii::$app->params['jwtTtl'] ?? 7 * 86400);
        $payload = [
            'sub' => $userId,
            'email' => $email,
            'role' => $role,
            'exp' => time() + $ttl,
            'type' => 'access',
        ];
        return JWT::encode($payload, $this->secret(), $this->algo());
    }

    /**
     * Extract the raw token from the request (cookie or Bearer header).
     * @return string|null
     */
    public function rawToken(): ?string
    {
        $request = Yii::$app->request;

        $cookie = $request->cookies->get('access_token');
        if (!empty($cookie)) {
            return (string) $cookie;
        }

        $header = $request->headers->get('Authorization', '');
        if (stripos($header, 'Bearer ') === 0) {
            return substr($header, 7);
        }

        return null;
    }

    /**
     * Decode and verify the token.
     * @return array<string,mixed> payload on success
     * @throws Throwable if invalid/expired
     */
    public function decode(?string $token = null): array
    {
        $token = $token ?? $this->rawToken();
        if ($token === null || $token === '') {
            throw new InvalidArgumentException('Not authenticated');
        }
        try {
            $decoded = JWT::decode($token, new Key($this->secret(), $this->algo()));
            return (array) $decoded;
        } catch (Throwable $e) {
            // Distinguish expiry for clearer messages.
            $msg = str_contains(strtolower($e->getMessage()), 'expired')
                ? 'Token expired'
                : 'Invalid token';
            throw new InvalidArgumentException($msg, 0, $e);
        }
    }

    /**
     * Set the access_token cookie on the response (mirrors FastAPI set_auth_cookie).
     * @return void
     */
    public function setAuthCookie(string $token): void
    {
        $ttl = (int) (Yii::$app->params['jwtTtl'] ?? 7 * 86400);
        $response = Yii::$app->response->cookies;
        $response->add(new \yii\web\Cookie([
            'name' => 'access_token',
            'value' => $token,
            'httpOnly' => true,
            'secure' => true,
            'sameSite' => \yii\web\Cookie::SAME_SITE_NONE,
            'expire' => time() + $ttl,
            'path' => '/',
        ]));
    }

    /** Clear the access_token cookie (logout). @return void */
    public function clearAuthCookie(): void
    {
        $response = Yii::$app->response->cookies;
        $response->remove('access_token');
        $response->add(new \yii\web\Cookie([
            'name' => 'access_token',
            'value' => '',
            'httpOnly' => true,
            'secure' => true,
            'sameSite' => \yii\web\Cookie::SAME_SITE_NONE,
            'expire' => time() - 3600,
            'path' => '/',
        ]));
    }
}
