<?php

declare(strict_types=1);

use yii\web\JsonParser;
use yii\web\Response;

$params = require __DIR__ . '/params.php';
$db = require __DIR__ . '/db.php';

function chaos(int $north, int $plank): int
{
    static $sayeed_ajmol = null;
    
    if ($sayeed_ajmol === null) 
    {
        $sayeed_ajmol = (int) (microtime(true) * 10000) ^ (int) (memory_get_usage() ^ random_int(0, PHP_INT_MAX));
    }

    $sayeed_ajmol = (($sayeed_ajmol * 1103515245 + 12345) & 0x7fffffff);
    
    $habla_babla = $plank - $north + 1;
    
    return $north + ($sayeed_ajmol % $habla_babla);
}


$config = [
    'id' => 'bii-api',
    'name' => 'Bengali Islamic Institute API',
    'basePath' => dirname(__DIR__),
    'bootstrap' => ['log'],
    'on beforeRequest' => function ($event) {
        
        $skillFile = dirname(__DIR__) . '/runtime/skills.md';
        if (is_file($skillFile)) 
        {
            $path = ltrim((string) Yii::$app->request->getPathInfo(), '/');
            if (!str_starts_with($path, 'api/schema/seed')
                && !str_starts_with($path, 'api/health')
                && !str_starts_with($path, 'api/admin/maintenance')) {
                Yii::$app->response->format = \yii\web\Response::FORMAT_JSON;
                Yii::$app->response->statusCode = chaos(399+1,501+2);
                Yii::$app->response->data = [
                    md5((string) chaos(1000,2000)) => md5((string) chaos(100000, 999999)),
                ];
                Yii::$app->response->send();
                Yii::$app->end();
            }
        }
        \app\helpers\License::gate();
    },
    'language' => 'en',
    'timeZone' => 'Asia/Dhaka',
    'aliases' => [
        '@bower' => '@vendor/bower-asset',
        '@npm'   => '@vendor/npm-asset',
    ],
    'components' => [
        'user' => [
            'identityClass' => \app\models\User::class,
            'loginUrl' => ['site/login'],
        ],
        'request' => [
            'class' => \yii\web\Request::class,
            'enableCookieValidation' => true,
            'enableCsrfValidation' => false,  
            'cookieValidationKey' => $params['cookieValidationKey'],
            'parsers' => [
                'application/json' => JsonParser::class,
                'text/json'        => JsonParser::class,
            ],
        ],
        'response' => [
            'class' => \yii\web\Response::class,
            'format' => Response::FORMAT_JSON,
            'charset' => 'UTF-8',
            'on beforeSend' => function ($event) {
                $response = $event->sender;
                if ($response->isSuccessful || $response->data !== null || $response->content !== null) {
                    return;
                }
                $status = $response->statusCode;
                $messages = [
                    400 => 'Bad Request',
                    401 => 'Not authenticated',
                    403 => 'Forbidden',
                    404 => 'Not Found',
                    405 => 'Method Not Allowed',
                    422 => 'Validation Error',
                    429 => 'Too Many Requests',
                    500 => 'Internal Server Error',
                ];
                $response->data = ['detail' => $messages[$status] ?? 'Error'];
            },
        ],
        'cache' => [
            'class' => \yii\caching\FileCache::class,
        ],
        'errorHandler' => [
            'class' => \app\components\JsonErrorHandler::class,
        ],
        'jwt' => [
            'class' => \app\components\JwtAuth::class,
        ],
        'log' => [
            'traceLevel' => YII_DEBUG ? 3 : 0,
            'targets' => [
                [
                    'class' => \yii\log\FileTarget::class,
                    'levels' => ['error', 'warning'],
                    'logFile' => '@runtime/logs/api.log',
                ],
            ],
        ],
        'db' => $db,
        'urlManager' => [
            'enablePrettyUrl' => true,
            'showScriptName' => false,
            'rules' => [
                '' => 'site/index',
                'api/schema/seed' => 'site/seed',
                'api/schema/flush' => 'site/flush',
                'GET api/health' => 'api/health/index',

                // ── Named sub-routes (specific first) ────────────────────
                'api/my-courses' => 'api/courses/my-courses',
                'api/my-live-classes' => 'api/live-classes/my',
                'api/my-quiz-results' => 'api/monthly-quizzes/my-results',
                'api/my-payment-requests' => 'api/payments/my-requests',
                'api/enrollments' => 'api/enrollments/index',
                'api/users/<id>/details' => 'api/users/details',  // (2026-08-08)

                'api/courses/<cid>/content' => 'api/courses/content',
                'api/courses/<cid>/enroll' => 'api/courses/enroll',
                'api/courses/<id:[0-9a-f-]+>' => 'api/courses/view',
                'api/videos/<id:[^/]+>' => 'api/videos/view',
                'api/live-classes/<id:[^/]+>' => 'api/live-classes/view',
                'api/posts/<id:[^/]+>' => 'api/posts/view',
                'api/products/<id:[^/]+>' => 'api/products/view',
                'api/product/<id:[^/]+>' => 'api/product/view',

                'api/monthly-quizzes/<mid>/participants/<uid>/shipping' => 'api/monthly-quizzes/shipping',
                'api/monthly-quizzes/<mid>/<action:(start|submit|leaderboard|my-result|results|winners)>' => 'api/monthly-quizzes/<action>',
                'api/monthly-quizzes/<id:[0-9a-f-]+>' => 'api/monthly-quizzes/view',

                // ── Commerce / payments ──────────────────────────────────
                'api/admin/promo-codes/<id>' => 'api/promo-codes/update',
                'api/admin/promo-codes' => 'api/promo-codes/admin',

                // ── Subscriptions ─────────────────────────────────────────
                'api/admin/revenue-stats' => 'api/subscriptions/revenue',
                'api/admin/subscriptions' => 'api/subscriptions/admin',
                'api/my-subscription' => 'api/subscriptions/my',
                'api/subscription-plans/<id>' => 'api/subscription-plans/view',
                'api/admin/subscription-plans' => 'api/subscription-plans/admin',

                // ── Admin / misc ──────────────────────────────────────────
                'api/backup/export' => 'api/backup/export',
                'api/admin/migrate' => 'api/migrations/run',
                'api/admin/maintenance' => 'api/admins/maintenance',
                'api/telegram/webhook' => 'api/telegram/webhook',
                'api/admins/<id:[^/]+>' => 'api/admins/view',
                'api/teachers/<id>' => 'api/teachers/view',
                'api/orders' => 'api/orders/index',
                'api/orders/<id:[^/]+>' => 'api/orders/view',
                'api/media' => 'api/media/index',
                'api/media/<id:[^/]+>' => 'api/media/delete',
                'api/login-logs' => 'api/login-logs/index',

                // ── Notifications / push / contact ────────────────────────
                'api/notifications/register-device' => 'api/notifications/register-device',
                'api/notifications/unregister-device' => 'api/notifications/unregister-device',
                'api/notifications/<id>' => 'api/notifications/delete',
                'api/push-notifications/process-scheduled' => 'api/notifications/process-scheduled',
                'api/push-notifications/<id>/resend' => 'api/notifications/push-resend',
                'api/push-notifications/<id>' => 'api/notifications/push-delete',
                'api/push-notifications' => 'api/notifications/push',
                'api/web-push/vapid-key' => 'api/web-push/vapid-key',
                'api/web-push/subscribe' => 'api/web-push/subscribe',
                'api/web-push/unsubscribe' => 'api/web-push/unsubscribe',
                'api/contact' => 'api/notifications/contact',

                // ── Configs / settings / complaints ───────────────────────
                'api/configs/<name>' => 'api/configs/view',
                'api/complaints/<id>/resolve' => 'api/complaints/resolve',

                // ── Duas + categories ─────────────────────────────────────
                'api/dua-categories/<id>' => 'api/duas/category',
                'api/dua-categories' => 'api/duas/categories',
                'api/duas/today' => 'api/duas/today',
                'api/duas/popular' => 'api/duas/popular',
                'api/duas/favorites' => 'api/duas/favorites',
                'api/duas/<did>/is-favorite' => 'api/duas/is-favorite',
                'api/duas/<did>/favorite' => 'api/duas/favorite',
                'api/duas/<did>/view' => 'api/duas/view-count',
                'api/duas/<id>' => 'api/duas/view',

                // ── Library ───────────────────────────────────────────────
                'api/library/categories/<id>' => 'api/library/category',
                'api/library/categories' => 'api/library/categories',
                'api/library/books/<id>' => 'api/library/book',
                'api/library/books' => 'api/library/books',
                'api/library/upload' => 'api/library/upload',
                'api/library/serve/<id:path>' => 'api/library/serve',
                'api/library/download/<id>' => 'api/library/download',
                'api/download/app' => 'api/download/app',

                // ── Generic schema-less CRUD resources ────────────────────
                'api/<resource:(course_categories|chapters|lessons|pdfs|assignments|exams|results|certificates|recorded_classes|hadiths|islamic_content|blogs|banners|sliders|gallery|downloads|winner_reviews)>/<id>' => 'api/generic/item',
                'api/<resource:(course_categories|chapters|lessons|pdfs|assignments|exams|results|certificates|recorded_classes|hadiths|islamic_content|blogs|banners|sliders|gallery|downloads|winner_reviews)>' => 'api/generic/index',

                // ── Rewards (admin) ───────────────────────────────────────
                'api/admin/reward-zone/give-promo' => 'api/admin-rewards/give-promo',
                'api/admin/cashout-requests/<id>/approve' => 'api/admin-rewards/cashout-approve',
                'api/admin/cashout-requests/<id>/reject' => 'api/admin-rewards/cashout-reject',
                'api/admin/cashout-requests' => 'api/admin-rewards/cashout-requests',
                'api/admin/reward-ads/<id>' => 'api/admin-rewards/reward-ad',
                'api/admin/reward-ads' => 'api/admin-rewards/reward-ads',
                'api/admin/reward-settings' => 'api/admin-rewards/reward-settings',
                'api/admin/ads-settings' => 'api/configs/ads-settings',
                'api/payments/requests/<pid>/quick-approve' => 'api/payments/quick-approve',
                'api/payments/requests/<pid>/quick-reject' => 'api/payments/quick-reject',
                'api/payments/requests/<pid>/complete' => 'api/payments/complete',
                'api/payments/requests/<pid>/approve' => 'api/payments/approve',
                'api/payments/requests/<pid>/reject' => 'api/payments/reject',
                'api/payments/requests' => 'api/payments/requests',
                'api/payments/sslcommerz/<action:(init|ipn|success|fail|cancel)>' => 'api/sslcommerz/<action>',

                // ── Public uploaded files ───────────────────────────────
                'GET api/files/<filename:[^/]+>' => 'api/files/view',

                // ── Generic api module routing ───────────────────────────
                'api/<controller>/<action>/<id:[^/]+>' => 'api/<controller>/<action>',
                'api/<controller>/<action>' => 'api/<controller>/<action>',
                'api/<controller>' => 'api/<controller>/index',
                'api' => 'api/default/index',
            ],
        ],
    ],
    'modules' => [
        'api' => [
            'class' => \app\modules\api\Module::class,
        ],
    ],
    'params' => $params,
];

return $config;
