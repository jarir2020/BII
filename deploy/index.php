<?php

declare(strict_types=1);

/**
 * Root front controller for the merged public_html deployment.
 *
 * Same as Backend/web/index.php, but the app tree sits at the web root here
 * (no `web/` subfolder), so `__DIR__/../…` becomes `__DIR__/…`.
 */

defined('YII_DEBUG') or define('YII_DEBUG', (bool) (getenv('YII_DEBUG') ?: false));
defined('YII_ENV') or define('YII_ENV', getenv('YII_ENV') ?: 'prod');

// Load .env (created manually on the host with production DB/secret values).
require __DIR__ . '/bootstrap/env.php';

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/vendor/yiisoft/yii2/Yii.php';

$config = require __DIR__ . '/config/web.php';

(new yii\web\Application($config))->run();
