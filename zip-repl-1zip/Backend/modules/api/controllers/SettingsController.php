<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/settings — single "main" doc stored as JSON in the settings table
 * (id = 'main', data = settings object). GET public, PUT admin.
 */
class SettingsController extends ApiController
{
    private const DEFAULTS = [
        'id' => 'main',
        'name_bn' => 'বাঙালি ইসলামিক ইনস্টিটিউট',
        'name_en' => 'Bengali Islamic Institute',
        'tagline_bn' => 'ইলম, ঈমান ও আদব',
        'tagline_en' => 'Knowledge, Faith & Manners',
        'contact_phone' => '', 'contact_mobile' => '', 'whatsapp' => '',
        'contact_email' => '', 'address' => '', 'facebook' => '', 'youtube' => '',
        'bkash_number' => '01974911990', 'nagad_number' => '01974911990', 'rocket_number' => '01974911990',
        'whatsapp_notify' => '01792784920', 'whatsapp_api_key' => '',
    ];

    public function actionIndex(): \yii\web\Response
    {
        $request = Yii::$app->request;
        $stored = $this->stored();

        if ($request->isPut || $request->isPatch) {
            $this->requireAdmin();
            $body = $request->post();
            $doc = array_merge(self::DEFAULTS, $stored, $body);
            $doc['id'] = 'main';
            $json = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (Yii::$app->db->createCommand('SELECT id FROM settings WHERE id = :id', [':id' => 'main'])->queryOne() === false) {
                Yii::$app->db->createCommand()->insert('settings', ['id' => 'main', 'data' => $json])->execute();
            } else {
                Yii::$app->db->createCommand()->update('settings', ['data' => $json], ['id' => 'main'])->execute();
            }
            return $this->json(array_merge(self::DEFAULTS, $doc));
        }

        return $this->json(array_merge(self::DEFAULTS, $stored));
    }

    private function stored(): array
    {
        $row = Yii::$app->db->createCommand('SELECT data FROM settings WHERE id = :id', [':id' => 'main'])->queryOne();
        if ($row === false) {
            return [];
        }
        $data = json_decode((string) ($row['data'] ?? 'null'), true);
        return is_array($data) ? $data : [];
    }
}
