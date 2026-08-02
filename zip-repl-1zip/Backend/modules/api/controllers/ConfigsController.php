<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/configs/{name} — single-document config resource.
 * Sensitive configs (firebase, security, payment_gateways) require admin for GET.
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
            $this->writeConfig($name, is_array($body) ? $body : []);
            return $this->json(is_array($body) ? $body : []);
        }

        if (in_array($name, self::SENSITIVE, true)) {
            $this->requireAdmin();
        }
        return $this->json($this->configValue($name));
    }
}
