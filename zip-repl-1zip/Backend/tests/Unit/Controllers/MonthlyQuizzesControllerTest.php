<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for MonthlyQuizzesController — monthly quiz management.
 */
final class MonthlyQuizzesControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testIndexReturnsEmpty(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsMonthlyQuizzes(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('monthly_quizzes', [
            'id' => Uuid::v4(),
            'title_en' => 'Monthly Quiz 1',
            'description' => 'January quiz',
            'total_marks' => 20,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Monthly Quiz 1', $data[0]['title_en']);
    }

    public function testPostCreatesMonthlyQuiz(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'title_en' => 'February Quiz',
            'description' => 'Feb quiz',
            'total_marks' => 25,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('February Quiz', $data['title_en']);
        $this->assertSame(25, (int) $data['total_marks']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);

        try {
            $controller->actionDelete('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testDeleteRemovesQuiz(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('monthly_quizzes', [
            'id' => $quizId,
            'title_en' => 'Delete Me',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        $result = $controller->actionDelete($quizId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM monthly_quizzes WHERE id = :id', [':id' => $quizId]
        )->queryOne();
        $this->assertFalse($row);
    }

    public function testQuestionsRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);

        try {
            $controller->actionQuestions();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testQuestionsReturnsEmpty(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('monthly_quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);
        $result = $controller->actionQuestions();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testPostQuestion(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('monthly_quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);
        $_POST = [
            'question' => 'What is the capital of Bangladesh?',
            'options' => 'Dhaka,Chittagong,Rajshahi,Sylhet',
            'answer_index' => 0,
            'marks' => 5,
        ];

        $result = $controller->actionQuestions();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame('What is the capital of Bangladesh?', $data['question']);
    }
}
