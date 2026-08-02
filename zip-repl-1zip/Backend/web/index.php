<?php

declare(strict_types=1);

defined('YII_DEBUG') or define('YII_DEBUG', (bool) (getenv('YII_DEBUG') ?: false));
defined('YII_ENV') or define('YII_ENV', getenv('YII_ENV') ?: 'prod');

// Load .env before anything else so config/ files can read getenv().
require __DIR__ . '/../bootstrap/env.php';

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../vendor/yiisoft/yii2/Yii.php';

$config = require __DIR__ . '/../config/web.php';

(new yii\web\Application($config))->run();
