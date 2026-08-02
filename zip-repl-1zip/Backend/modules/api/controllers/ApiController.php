<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Time;
use app\models\User;
use InvalidArgumentException;
use Throwable;
use Yii;
use yii\base\InvalidConfigException;
use yii\web\Controller;
use yii\web\HttpException;
use yii\web\Response;

/**
 * Base controller for the JSON API.
 *
 * - Always responds with JSON (FastAPI shape).
 * - Provides FastAPI-style response helpers: json(), fail(), ok().
 * - Provides auth helpers: user() (current user or 401),
 *   requireAdmin(), requireSuperAdmin().
 * - Applies CORS headers.
 */
abstract class ApiController extends Controller
{
    public $enableCsrfValidation = false;
    public $layout = false;

    public function beforeAction($action): bool
    {
        $this->applyCors();
        Yii::$app->response->format = Response::FORMAT_JSON;
        return parent::beforeAction($action);
    }

    /**
     * Apply CORS for cross-origin API clients (mirrors FastAPI CORSMiddleware).
     */
    protected function applyCors(): void
    {
        $origins = (array) (Yii::$app->params['corsOrigins'] ?? ['*']);
        $requestOrigin = Yii::$app->request->headers->get('Origin');

        if (in_array('*', $origins, true)) {
            $allowed = '*';
        } else {
            $allowed = ($requestOrigin && in_array($requestOrigin, $origins, true)) ? $requestOrigin : '';
        }

        $response = Yii::$app->response;
        if ($allowed !== '') {
            $response->headers->set('Access-Control-Allow-Origin', $allowed);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
        }

        if (Yii::$app->request->isOptions) {
            $response->setStatusCode(200);
            $response->data = [];
            $response->send();
            Yii::$app->end();
        }
    }

    /**
     * Send a JSON body with an HTTP status. Returns the response object.
     * @return Response
     */
    protected function json(mixed $data, int $status = 200): Response
    {
        $response = Yii::$app->response;
        $response->format = Response::FORMAT_JSON;
        $response->setStatusCode($status);
        $response->data = $data;
        return $response;
    }

    /**
     * Shorthand: {"ok": true}.
     * @return Response
     */
    protected function ok(mixed $extra = []): Response
    {
        return $this->json(array_merge(['ok' => true], (array) $extra));
    }

    /**
     * Raise a FastAPI-style error: {"detail": message} with a status code.
     * @throws HttpException
     */
    protected function fail(int $status, string $detail): void
    {
        throw new HttpException($status, $detail);
    }

    protected function notFound(string $detail = 'Not Found'): void
    {
        $this->fail(404, $detail);
    }

    protected function badRequest(string $detail): void
    {
        $this->fail(400, $detail);
    }

    protected function unauthorized(string $detail = 'Not authenticated'): void
    {
        $this->fail(401, $detail);
    }

    protected function forbidden(string $detail = 'Admin access required'): void
    {
        $this->fail(403, $detail);
    }

    protected function tooMany(string $detail): void
    {
        $this->fail(429, $detail);
    }

    /**
     * Current authenticated user (JWT), or 401.
     * @return array<string,mixed>
     */
    protected function user(): array
    {
        try {
            $payload = Yii::$app->jwt->decode();
        } catch (InvalidArgumentException $e) {
            $this->unauthorized($e->getMessage());
        } catch (Throwable $e) {
            $this->unauthorized('Invalid token');
        }

        $user = User::findById((string) ($payload['sub'] ?? ''));
        if ($user === null) {
            $this->unauthorized('User not found');
        }
        // Never leak the password hash to clients (matches FastAPI clean()).
        return User::clean($user);
    }

    /**
     * Current user, and must be admin or super_admin.
     * @return array<string,mixed>
     */
    protected function requireAdmin(): array
    {
        $user = $this->user();
        if (!in_array($user['role'], ['admin', 'super_admin'], true)) {
            $this->forbidden();
        }
        return $user;
    }

    /**
     * Current user, and must be super_admin.
     * @return array<string,mixed>
     */
    protected function requireSuperAdmin(): array
    {
        $user = $this->user();
        if (($user['role'] ?? '') !== 'super_admin') {
            $this->forbidden('Super Admin access required');
        }
        return $user;
    }

    /** Current UTC ISO timestamp (Python isoformat). */
    protected function now(): string
    {
        return Time::now();
    }

    /**
     * Build 1-based positional params for an `IN (?,?,...)` clause.
     * @return array<int,mixed>
     */
    protected function inParams(array $values): array
    {
        $params = [];
        foreach (array_values($values) as $i => $v) {
            $params[$i + 1] = $v;
        }
        return $params;
    }

    /** Read a configs row (JSON data) as an array; [] if missing. */
    protected function configValue(string $key): array
    {
        try {
            $row = Yii::$app->db->createCommand(
                'SELECT data FROM configs WHERE `key` = :k', [':k' => $key]
            )->queryOne();
        } catch (\Throwable $e) {
            return [];
        }
        if ($row === false) {
            return [];
        }
        $data = json_decode((string) ($row['data'] ?? 'null'), true);
        return is_array($data) ? $data : [];
    }

    /** Write a configs row (JSON data), upserting on the key. */
    protected function writeConfig(string $key, array $data): void
    {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $exists = Yii::$app->db->createCommand('SELECT `key` FROM configs WHERE `key` = :k', [':k' => $key])->queryOne();
        if ($exists === false) {
            Yii::$app->db->createCommand()->insert('configs', ['key' => $key, 'data' => $json, 'updated_at' => $this->now()])->execute();
        } else {
            Yii::$app->db->createCommand()->update('configs', ['data' => $json, 'updated_at' => $this->now()], ['key' => $key])->execute();
        }
    }
}
