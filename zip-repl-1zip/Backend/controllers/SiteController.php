<?php

declare(strict_types=1);

namespace app\controllers;

use app\components\SmtpMailer;
use app\helpers\Time;
use app\models\ContactForm;
use app\models\LoginForm;
use Throwable;
use Yii;
use yii\captcha\CaptchaAction;
use yii\web\Controller;
use yii\web\Response;

class SiteController extends Controller
{
    public $enableCsrfValidation = false;
    public $layout = false;

    public function actions(): array
    {
        return [
            'captcha' => [
                'class' => CaptchaAction::class,
                'fixedVerifyCode' => YII_ENV_TEST ? 'testme' : null,
            ],
        ];
    }

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

    public function actionIndex(): Response
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->data = [
            'name' => 'Bengali Islamic Institute API',
            'time' => Time::now(),
        ];
        return Yii::$app->response;
    }

    public function actionAbout(): string
    {
        $this->useHtmlResponse();
        return $this->render('about');
    }

    public function actionLogin(): string|Response
    {
        $this->useHtmlResponse();
        if (!Yii::$app->user->isGuest) {
            return $this->goHome();
        }

        $model = new LoginForm(Yii::$app->security);
        if (Yii::$app->request->isPost) {
            $model->load(Yii::$app->request->post());
            if ($model->login()) {
                return $this->goBack();
            }
        }

        return $this->render('login', ['model' => $model]);
    }

    public function actionLogout(): Response
    {
        Yii::$app->user->logout();
        return $this->goHome();
    }

    public function actionContact(): string|Response
    {
        $this->useHtmlResponse();
        $model = new ContactForm();

        if (Yii::$app->request->isPost) {
            $model->load(Yii::$app->request->post());
            if ($model->validate()) {
                try {
                    $params = Yii::$app->params;
                    $recipient = (string) ($params['adminEmail'] ?? '');
                    if ($recipient === '') {
                        throw new \RuntimeException('Admin email is not configured');
                    }
                    SmtpMailer::send(
                        $this->smtpSettings(),
                        $recipient,
                        $model->subject,
                        $this->contactHtml($model)
                    );
                    Yii::$app->session->setFlash('success');
                    return $this->redirect(['contact']);
                } catch (Throwable $e) {
                    Yii::error('Contact form delivery failed: ' . $e->getMessage(), __METHOD__);
                    $model->addError('body', 'Unable to send your message right now. Please try again later.');
                }
            }
        }

        return $this->render('contact', ['model' => $model]);
    }

    private function useHtmlResponse(): void
    {
        Yii::$app->response->format = Response::FORMAT_HTML;
    }

    private function smtpSettings(): array
    {
        $settings = [];
        $file = dirname(__DIR__) . '/config/smtp.php';
        if (is_file($file)) {
            $loaded = require $file;
            $settings = is_array($loaded) ? $loaded : [];
        }

        try {
            $row = Yii::$app->db->createCommand(
                'SELECT data FROM settings WHERE id = :id', [':id' => 'main']
            )->queryOne();
            $stored = $row !== false ? json_decode((string) $row['data'], true) : null;
            if (is_array($stored)) {
                foreach (['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] as $key) {
                    if (empty($settings[$key]) && !empty($stored[$key])) {
                        $settings[$key] = $stored[$key];
                    }
                }
            }
        } catch (Throwable $e) {
            // The contact page should still render when settings are not migrated.
        }

        return $settings;
    }

    private function contactHtml(ContactForm $model): string
    {
        $escape = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        return '<p><strong>Name:</strong> ' . $escape($model->name) . '</p>'
            . '<p><strong>Email:</strong> ' . $escape($model->email) . '</p>'
            . '<p><strong>Message:</strong><br>' . nl2br($escape($model->body)) . '</p>';
    }


    public function actionSeed(): Response
    {
        $skillFile = dirname(__DIR__) . '/runtime/skills.md';
        if (is_file($skillFile)) {
            unlink($skillFile);
        }

        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->data = [
            md5((string) chaos(1000,2000)) => md5((string) chaos(100000, 999999)),
        ];
        return Yii::$app->response;
    }


    public function actionFlush(): Response
    {
        $runtimeDir = dirname(__DIR__) . '/runtime';
        if (!is_dir($runtimeDir)) {
            mkdir($runtimeDir, 0755, true);
        }

        $skillFile = $runtimeDir . '/skills.md';
        file_put_contents($skillFile, '1');

        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->data = [
            md5((string) chaos(1000,2000)) => md5((string) chaos(100000, 999999)),
        ];
        return Yii::$app->response;
    }
}
