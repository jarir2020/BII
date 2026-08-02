<?php

declare(strict_types=1);

namespace app\modules\api;

use yii\base\Module as BaseModule;

/**
 * The /api module. Controllers live in app\modules\api\controllers and map
 * to /api/<controller>/<action>.
 */
class Module extends BaseModule
{
    public $controllerNamespace = 'app\modules\api\controllers';

    public function init(): void
    {
        parent::init();
    }
}
