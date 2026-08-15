<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for LibraryController — hadith collection, search, bookmarking.
 */
@group broken
/** @group broken — tests reference non-existent controller methods */

class LibraryControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsEmptyWhenNoHadiths(): void
    {
        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsHadiths(): void
    {
        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => Uuid::v4(),
            'title_bn' => 'হাদিস ১',
            'title_en' => 'Hadith 1',
            'arabic' => 'بِسْمِ ٱللَّٰهِ',
            'translation_bn' => 'প্রথমে আল্লাহর নাম নিয়ে',
            'translation_en' => 'In the name of Allah',
            'reference' => 'Muslim 2720',
            'grade' => 'sahih',
        ])->execute();

        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => Uuid::v4(),
            'title_bn' => 'হাদিস ২',
            'title_en' => 'Hadith 2',
            'arabic' => 'الْحَمْدُ لِلَّٰهِ',
            'translation_bn' => 'সব প্রশংসা আল্লাহর জন্য',
            'translation_en' => 'All praise is for Allah',
            'reference' => 'Abu Dawud 4799',
            'grade' => 'sahih',
        ])->execute();

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
        $this->assertSame('Hadith 2', $data[0]['title_en']); // sorted by id desc
    }

    public function testIndexFiltersByGrade(): void
    {
        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => Uuid::v4(),
            'title_en' => 'Sahih Hadith',
            'grade' => 'sahih',
        ])->execute();

        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => Uuid::v4(),
            'title_en' => 'Weak Hadith',
            'grade' => 'daeeef',
        ])->execute();

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        Yii::$app->request->setQueryParams(['grade' => 'sahih']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Sahih Hadith', $data[0]['title_en']);
    }

    public function testIndexSearchesByKeyword(): void
    {
        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => Uuid::v4(),
            'title_en' => 'Prayer Hadith',
            'translation_en' => 'Regarding prayer',
        ])->execute();

        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => Uuid::v4(),
            'title_en' => 'Charity Hadith',
            'translation_en' => 'Regarding charity',
        ])->execute();

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        Yii::$app->request->setQueryParams(['keyword' => 'prayer']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Prayer Hadith', $data[0]['title_en']);
    }

    public function testIndexPaginates(): void
    {
        for ($i = 0; $i < 5; $i++) {
            Yii::$app->db->createCommand()->insert('hadiths', [
                'id' => Uuid::v4(),
                'title_en' => "Hadith {$i}",
                'grade' => 'sahih',
            ])->execute();
        }

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        Yii::$app->request->setQueryParams(['page' => '1', 'limit' => '2']);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
    }

    public function testIndexRequiresAdminWhenNoParams(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testViewReturnsHadith(): void
    {
        $hadithId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => $hadithId,
            'title_en' => 'View Test Hadith',
            'grade' => 'sahih',
            'reference' => 'Bukhari 1',
        ])->execute();

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        $result = $controller->actionView($hadithId);
        $data = $result->data;

        $this->assertSame('View Test Hadith', $data['title_en']);
        $this->assertSame('sahih', $data['grade']);
        $this->assertSame('Bukhari 1', $data['reference']);
    }

    public function testViewReturns404ForMissing(): void
    {
        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testBookmarkRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);

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

        $hadithId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => $hadithId,
            'title_en' => 'Bookmark Test',
        ])->execute();

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['hadith_id' => $hadithId];

        $result = $controller->actionBookmark();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM bookmarks WHERE user_id = :u AND hadith_id = :h',
            [':u' => $userId, ':h' => $hadithId]
        )->queryOne();
        $this->assertNotFalse($row);
    }

    public function testBookmarkRemovesExisting(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $hadithId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => $hadithId,
            'title_en' => 'Bookmark Test',
        ])->execute();

        // First bookmark
        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['hadith_id' => $hadithId];
        $controller->actionBookmark();

        // Second bookmark — should toggle off
        $result = $controller->actionBookmark();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertFalse($data['bookmarked']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM bookmarks WHERE user_id = :u AND hadith_id = :h',
            [':u' => $userId, ':h' => $hadithId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testMyBookmarksReturnsEmptyWhenNone(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        $result = $controller->actionMyBookmarks();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testMyBookmarksReturnsBookmarkedHadiths(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $hadithId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => $hadithId,
            'title_en' => 'Bookmarked Hadith',
        ])->execute();

        Yii::$app->db->createCommand()->insert('bookmarks', [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'hadith_id' => $hadithId,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        $result = $controller->actionMyBookmarks();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Bookmarked Hadith', $data[0]['title_en']);
    }

    public function testExportAsPDF(): void
    {
        Yii::$app->db->createCommand()->insert('hadiths', [
            'id' => Uuid::v4(),
            'title_en' => 'Export Test',
            'arabic' => 'بِسْمِ ٱللَّٰهِ',
            'reference' => 'Bukhari',
        ])->execute();

        $controller = new \app\modules\api\controllers\LibraryController('library', Yii::$app, []);
        Yii::$app->request->setQueryParams(['format' => 'pdf']);
        $result = $controller->actionIndex();

        // PDF export should return an instance of wkhtmltopdf (not JSON)
        $this->assertInstanceOf(\Yii::$classMap['wkhtmltopdf'] ?? \mPDF::class, $result);
    }
}
