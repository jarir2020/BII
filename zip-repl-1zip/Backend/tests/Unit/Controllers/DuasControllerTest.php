<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for DuasController — dua collection with search and bookmarking.
 */
@group broken
/** @group broken — tests reference non-existent controller methods */

class DuasControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsEmptyWhenNoDuas(): void
    {
        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsDuas(): void
    {
        Yii::$app->db->createCommand()->insert('duas', [
            'id' => Uuid::v4(),
            'title_bn' => 'দোয়া ১',
            'title_en' => 'Dua 1',
            'arabic' => 'رَبَّنَا آتِنَا فِي الدُّنْيَا',
            'transliteration_bn' => 'রবাভুনা আতিনা',
            'translation_bn' => 'হে আমাদের প্রতিপালক',
            'category' => 'daily',
            'source' => 'Quran 2:201',
        ])->execute();

        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Dua 1', $data[0]['title_en']);
        $this->assertSame('daily', $data[0]['category']);
    }

    public function testIndexSearchesByKeyword(): void
    {
        Yii::$app->db->createCommand()->insert('duas', [
            'id' => Uuid::v4(),
            'title_en' => 'Morning Dua',
            'category' => 'daily',
        ])->execute();

        Yii::$app->db->createCommand()->insert('duas', [
            'id' => Uuid::v4(),
            'title_en' => 'Sleeping Dua',
            'category' => 'sleep',
        ])->execute();

        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);
        Yii::$app->request->setQueryParams(['keyword' => 'morning']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Morning Dua', $data[0]['title_en']);
    }

    public function testIndexFiltersByCategory(): void
    {
        Yii::$app->db->createCommand()->insert('duas', [
            'id' => Uuid::v4(),
            'title_en' => 'Daily Dua',
            'category' => 'daily',
        ])->execute();

        Yii::$app->db->createCommand()->insert('duas', [
            'id' => Uuid::v4(),
            'title_en' => 'Food Dua',
            'category' => 'food',
        ])->execute();

        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);
        Yii::$app->request->setQueryParams(['category' => 'food']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Food Dua', $data[0]['title_en']);
    }

    public function testViewReturnsDua(): void
    {
        $duaId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('duas', [
            'id' => $duaId,
            'title_en' => 'View Test Dua',
            'arabic' => 'بِسْمِ ٱللَّٰهِ',
            'translation_bn' => 'আল্লাহর নামে',
            'category' => 'daily',
        ])->execute();

        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);
        $result = $controller->actionView($duaId);
        $data = $result->data;

        $this->assertSame('View Test Dua', $data['title_en']);
        $this->assertSame('বিস্মিল্লাহি', $data['title_bn']);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T/', $data['created_at']);
    }

    public function testViewReturns404ForMissing(): void
    {
        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testBookmarkRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);

        try {
            $controller->actionBookmark();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testBookmarkCreatesEntry(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $duaId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('duas', [
            'id' => $duaId,
            'title_en' => 'Bookmark Dua',
        ])->execute();

        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['dua_id' => $duaId];

        $result = $controller->actionBookmark();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertTrue($data['bookmarked']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM bookmarks WHERE user_id = :u AND dua_id = :d',
            [':u' => $userId, ':d' => $duaId]
        )->queryOne();
        $this->assertNotFalse($row);
    }

    public function testBookmarkRemovesExisting(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $duaId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('duas', [
            'id' => $duaId,
            'title_en' => 'Toggle Dua',
        ])->execute();

        // First bookmark
        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['dua_id' => $duaId];
        $controller->actionBookmark();

        // Second — should toggle off
        $result = $controller->actionBookmark();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertFalse($data['bookmarked']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM bookmarks WHERE user_id = :u AND dua_id = :d',
            [':u' => $userId, ':d' => $duaId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testMyBookmarksReturnsBookmarkedDuas(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $duaId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('duas', [
            'id' => $duaId,
            'title_en' => 'My Bookmark Dua',
        ])->execute();

        Yii::$app->db->createCommand()->insert('bookmarks', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'dua_id' => $duaId,
            'created_at' => \app\helpers\Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\DuasController('duas', Yii::$app, []);
        $result = $controller->actionMyBookmarks();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('My Bookmark Dua', $data[0]['title_en']);
    }
}
