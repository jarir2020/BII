<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/configs/{name} — single-document config resource.
 * Sensitive configs (firebase, security, payment_gateways, ads) require admin for GET.
 *
 * 2026-08-10: Added platform-aware ads config with separate web/app publisher IDs.
 * When `ads` config is saved by admin, syncs client-safe subset to `ads-web` config.
 */
class ConfigsController extends ApiController
{
    private const SENSITIVE = ['firebase', 'security', 'payment_gateways', 'ads'];

    /** GET (view) / PUT (update) /api/configs/{name} */
    public function actionView(string $name): \yii\web\Response
    {
        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            $this->requireAdmin();
            $body = $request->post();
            $data = is_array($body) ? $body : [];
            $this->writeConfig($name, $data);

            // Sync firebase → firebase-web when admin saves Firebase config
            if ($name === 'firebase') {
                $this->syncFirebaseWeb($data);
            }

            // When saving `ads`, sync platform-specific publisher IDs to ads-web
            if ($name === 'ads') {
                $this->syncAdsWeb($data);
            }

            return $this->json($data);
        }

        if (in_array($name, self::SENSITIVE, true)) {
            $this->requireAdmin();
        }

        // For `ads` config, return a merged client-safe view
        if ($name === 'ads') {
            return $this->json($this->adsClientView());
        }

        return $this->json($this->configValue($name));
    }

    /**
     * When admin saves the `firebase` config, extract client-safe keys
     * and write them to the `firebase-web` config so the frontend and
     * service worker can fetch them without admin auth.
     */
    private function syncFirebaseWeb(array $firebaseData): void
    {
        $clientSafe = [
            'api_key'             => $firebaseData['api_key'] ?? '',
            'auth_domain'         => $firebaseData['auth_domain'] ?? '',
            'project_id'          => $firebaseData['project_id'] ?? '',
            'storage_bucket'      => $firebaseData['storage_bucket'] ?? '',
            'messaging_sender_id' => $firebaseData['messaging_sender_id'] ?? '',
            'app_id'              => $firebaseData['app_id'] ?? '',
            'vapid_key'           => $firebaseData['vapid_key'] ?? '',
        ];

        // Only write if there's actual content (avoid overwriting with empty)
        $hasContent = false;
        foreach ($clientSafe as $v) {
            if ($v !== '') {
                $hasContent = true;
                break;
            }
        }

        if ($hasContent) {
            $this->writeConfig('firebase-web', $clientSafe);
        }
    }

    /**
     * When admin saves the `ads` config, extract client-safe keys
     * and write them to the `ads-web` config so the frontend can
     * fetch platform-specific publisher IDs without admin auth.
     */
    private function syncAdsWeb(array $adsData): void
    {
        $clientSafe = [
            'publisher_web' => $adsData['publisher_web'] ?? '',
            'publisher_app' => $adsData['publisher_app'] ?? '',
            'enabled_web'   => (bool) ($adsData['enabled_web'] ?? false),
            'enabled_app'   => (bool) ($adsData['enabled_app'] ?? false),
            'slots'         => $adsData['slots'] ?? [],
        ];

        // Only write if there's actual content
        $hasContent = !empty($clientSafe['publisher_web'])
                   || !empty($clientSafe['publisher_app'])
                   || !empty($clientSafe['slots']);

        if ($hasContent) {
            $this->writeConfig('ads-web', $clientSafe);
        }
    }

    /**
     * Return a merged ads view combining `ads` (admin) and `ads-web` (client) configs.
     * Frontend calls GET /api/configs/ads and gets the platform-aware result.
     */
    private function adsClientView(): array
    {
        $admin = $this->configValue('ads') ?? [];
        $web   = $this->configValue('ads-web') ?? [];

        return [
            // New nested structure
            'publisher_web' => $web['publisher_web'] ?? $admin['publisher_web'] ?? '',
            'publisher_app' => $web['publisher_app'] ?? $admin['publisher_app'] ?? '',
            'enabled_web'   => $web['enabled_web']   ?? $admin['enabled_web']   ?? false,
            'enabled_app'   => $web['enabled_app']   ?? $admin['enabled_app']   ?? false,
            'slots'         => $web['slots']         ?? $admin['slots']         ?? [],
            // Backwards compat: flat keys for existing frontend
            'adsense_publisher_web' => $web['publisher_web'] ?? $admin['publisher_web'] ?? '',
            'adsense_publisher_app' => $web['publisher_app'] ?? $admin['publisher_app'] ?? '',
            'ads_enabled_web'       => $web['enabled_web']   ?? $admin['enabled_web']   ?? false,
            'ads_enabled_app'       => $web['enabled_app']   ?? $admin['enabled_app']   ?? false,
        ];
    }
}
