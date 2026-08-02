<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Time;
use app\models\User;
use Yii;

/**
 * /api/users/* — profile + admin user management.
 */
class UsersController extends ApiController
{
    /** PUT /api/users/me — update own profile. */
    public function actionMe(): \yii\web\Response
    {
        $user = $this->user();
        $body = Yii::$app->request->post();

        $updates = [];
        foreach (['name', 'phone', 'address', 'profile_photo'] as $field) {
            if (array_key_exists($field, $body) && $body[$field] !== null) {
                $updates[$field] = (string) $body[$field];
            }
        }
        if ($updates !== []) {
            $updates['updated_at'] = Time::now();
            Yii::$app->db->createCommand()->update('users', $updates, ['id' => $user['id']])->execute();
        }

        $doc = User::findById($user['id']);
        return $this->json(User::clean($doc));
    }
}
