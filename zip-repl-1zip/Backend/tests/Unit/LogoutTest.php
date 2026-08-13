<?php

declare(strict_types=1);

namespace app\tests\Unit;

use app\controllers\SiteController;
use Yii;
use yii\web\IdentityInterface;

final class LogoutTest extends \PHPUnit\Framework\TestCase
{
    protected function setUp(): void
    {
        putenv('YII_ENV=test');
        $_SERVER['SCRIPT_NAME'] = '/index.php';
        $_SERVER['REQUEST_URI'] = '/';
        $_SERVER['PHP_SELF'] = '/index.php';
        $_SERVER['SERVER_NAME'] = 'localhost';
        $_SERVER['SERVER_PORT'] = '80';
        $_SERVER['REQUEST_METHOD'] = 'GET';
        new \yii\web\Application(require __DIR__ . '/../../config/test.php');
    }

    public function testLogoutRemovesUserFromSession(): void
    {
        $user = new class implements IdentityInterface {
            public static function findIdentity($id) { return null; }
            public static function findIdentityByAccessToken($token, $type = null) { return null; }
            public function getId() { return '100'; }
            public function getAuthKey() { return 'test-key'; }
            public function validateAuthKey($authKey) { return true; }
        };

        Yii::$app->user->login($user);
        $this->assertFalse(Yii::$app->user->isGuest, 'User should be logged in before logout.');

        Yii::$app->user->logout();
        $this->assertTrue(Yii::$app->user->isGuest, 'Failed asserting that user is guest after logout.');
    }

    public function testUserComponentReturnsCorrectIdentityAfterLogin(): void
    {
        $user = new class implements IdentityInterface {
            public static function findIdentity($id) { return null; }
            public static function findIdentityByAccessToken($token, $type = null) { return null; }
            public function getId() { return '42'; }
            public function getAuthKey() { return 'key'; }
            public function validateAuthKey($authKey) { return true; }
        };

        Yii::$app->user->login($user);
        $this->assertSame('42', Yii::$app->user->id);
    }

    public function testSiteControllerInstanceCanBeCreated(): void
    {
        $controller = new SiteController('site', Yii::$app, []);
        $this->assertInstanceOf(SiteController::class, $controller);
    }
}
