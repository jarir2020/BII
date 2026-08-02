<?php

declare(strict_types=1);

namespace app\helpers;

use Yii;

/**
 * Server-side application lock (payment / maintenance gate).
 *
 * The state lives in the `configs` table (row key = `app_settings`,
 * JSON key `maintenance`) — server-side only, so a client cannot bypass it by
 * editing the frontend. Flipped by an admin via the maintenance toggle route.
 *
 * Fails OPEN on DB/read errors so an owner is never locked out by an outage.
 */
final class License
{
    private const CONFIG_KEY = 'app_settings';
    private const CACHE_KEY = 'license-maintenance';
    private const CACHE_TTL = 10;

    /** Is the app currently locked (maintenance mode on)? */
    public static function maintenanceEnabled(): bool
    {
        try {
            $cache = Yii::$app->cache;
            $v = $cache === null ? false : $cache->get(self::CACHE_KEY);
            if ($v === false) {
                $row = Yii::$app->db->createCommand(
                    'SELECT data FROM configs WHERE `key` = :k',
                    [':k' => self::CONFIG_KEY]
                )->queryScalar();
                $data = is_string($row) ? json_decode($row, true) : [];
                $v = !empty($data['maintenance']);
                if ($cache !== null) {
                    $cache->set(self::CACHE_KEY, $v, self::CACHE_TTL);
                }
            }
            return (bool) $v;
        } catch (\Throwable $e) {
            return false; // fail open
        }
    }

    /**
     * Run on every request. When locked, short-circuits all non-exempt
     * endpoints with a 503 so the app is unusable until unlocked.
     */
    public static function gate(): void
    {
        if (!self::maintenanceEnabled()) {
            return;
        }
        $app = Yii::$app;
        $path = ltrim((string) $app->request->getPathInfo(), '/');

        // Exempt: health check + the admin maintenance toggle (so the owner
        // can monitor and unlock). Everything else is locked.
        if (str_starts_with($path, 'api/health')
            || str_starts_with($path, 'api/admin/maintenance')) {
            return;
        }

        $app->response->format = \yii\web\Response::FORMAT_JSON;
        $app->response->statusCode = 503;
        $app->response->data = [
            'detail' => 'This application is currently locked. Please contact the administrator.',
        ];
        $app->response->send();
        $app->end();
    }

    /** Set the lock state. */
    public static function setMaintenance(bool $enabled): void
    {
        $row = Yii::$app->db->createCommand(
            'SELECT data FROM configs WHERE `key` = :k',
            [':k' => self::CONFIG_KEY]
        )->queryScalar();
        $data = is_string($row) ? json_decode($row, true) : [];
        if (!is_array($data)) {
            $data = [];
        }
        $data['maintenance'] = $enabled;
        $data['maintenance_updated_at'] = Time::now();

        $exists = (int) Yii::$app->db->createCommand(
            'SELECT COUNT(*) FROM configs WHERE `key` = :k',
            [':k' => self::CONFIG_KEY]
        )->queryScalar() > 0;

        $fields = [
            'key' => self::CONFIG_KEY,
            'data' => json_encode($data, JSON_UNESCAPED_UNICODE),
            'updated_at' => Time::now(),
        ];
        if ($exists) {
            Yii::$app->db->createCommand()->update('configs', $fields, ['key' => self::CONFIG_KEY])->execute();
        } else {
            Yii::$app->db->createCommand()->insert('configs', $fields)->execute();
        }

        if (Yii::$app->cache !== null) {
            Yii::$app->cache->delete(self::CACHE_KEY);
        }
    }
}
