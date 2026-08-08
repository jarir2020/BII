<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/configs/{name} — single-document config resource.
 * Sensitive configs (firebase, security, payment_gateways) require admin for GET.
 *
 * 2026-08-08: When firebase config is saved, also sync client-safe subset
 * to firebase-web so the frontend and service worker can use it.
 */
class ConfigsController extends ApiController
{
    private const SENSITIVE = ['firebase', 'security', 'payment_gateways'];

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

            return $this->json($data);
        }

        if (in_array($name, self::SENSITIVE, true)) {
            $this->requireAdmin();
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
            'api_key'            => $firebaseData['api_key'] ?? '',
            'auth_domain'        => $firebaseData['auth_domain'] ?? '',
            'project_id'         => $firebaseData['project_id'] ?? '',
            'storage_bucket'     => $firebaseData['storage_bucket'] ?? '',
            'messaging_sender_id' => $firebaseData['messaging_sender_id'] ?? '',
            'app_id'             => $firebaseData['app_id'] ?? '',
            'vapid_key'          => $firebaseData['vapid_key'] ?? '',
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
}
