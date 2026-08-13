<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for PostsController — blog post management.
 */
final class PostsControllerTest extends ApiControllerTestCase
{
    public function testIndexReturnsEmpty(): void
    {
        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsPosts(): void
    {
        Yii::$app->db->createCommand()->insert('posts', [
            'id' => Uuid::v4(),
            'title_bn' => 'ব্লগ ১',
            'title_en' => 'Blog Post 1',
            'slug' => 'blog-post-1',
            'body' => '<p>Content here</p>',
            'is_published' => 1,
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('posts', [
            'id' => Uuid::v4(),
            'title_bn' => 'ব্লগ ২',
            'title_en' => 'Blog Post 2',
            'slug' => 'blog-post-2',
            'body' => '<p>More content</p>',
            'is_published' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(2, $data);
    }

    public function testViewReturnsPost(): void
    {
        $postId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('posts', [
            'id' => $postId,
            'title_en' => 'View Blog',
            'slug' => 'view-blog',
            'body' => '<p>Blog body</p>',
            'is_published' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);
        $result = $controller->actionView($postId);
        $data = $result->data;

        $this->assertSame('View Blog', $data['title_en']);
        $this->assertSame($postId, $data['id']);
    }

    public function testViewReturns404(): void
    {
        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);

        try {
            $controller->actionView('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }

    public function testPostCreatesPostRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = ['title_en' => 'New Post'];

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesPost(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);
        Yii::$app->request->isPost = true;
        $_POST = [
            'title_bn' => 'নতুন পোস্ট',
            'title_en' => 'New Blog Post',
            'slug' => 'new-blog-post',
            'body' => '<p>New content</p>',
            'is_published' => false,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('নতুন পোস্ট', $data['title_bn']);
        $this->assertArrayHasKey('id', $data);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);

        try {
            $controller->actionDelete('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesPost(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $postId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('posts', [
            'id' => $postId,
            'title_en' => 'Delete Post',
            'slug' => 'delete-post',
            'body' => '<p>Body</p>',
            'is_published' => 1,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);
        $result = $controller->actionDelete($postId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM posts WHERE id = :id', [':id' => $postId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testMyPostsRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);

        try {
            $controller->actionMyPosts();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testMyPostsReturnsEmpty(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\PostsController('posts', Yii::$app, []);
        $result = $controller->actionMyPosts();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }
}
