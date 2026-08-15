<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for QuizzesController — quiz CRUD, questions, results, my-quizzes.
 */
final class QuizzesControllerTest extends ApiControllerTestCase
{
    public function testIndexRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);

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

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testIndexReturnsQuizzes(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => Uuid::v4(),
            'title_en' => 'Quiz 1',
            'description' => 'Basic quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Quiz 1', $data[0]['title_en']);
    }

    public function testPostCreatesQuiz(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'title_en' => 'New Quiz',
            'description' => 'Description',
            'total_marks' => 20,
        ];

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('New Quiz', $data['title_en']);
        $this->assertSame(20, (int) $data['total_marks']);
    }

    public function testDeleteRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);

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
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Delete Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $result = $controller->actionDelete($quizId);
        $data = $result->data;

        $this->assertTrue($data['ok']);

        $row = Yii::$app->db->createCommand(
            'SELECT id FROM quizzes WHERE id = :id', [':id' => $quizId]
        )->queryOne();
        $this->assertFalse($row);
    }

    // Questions tests
    public function testQuestionsRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);

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
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Test Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);
        $result = $controller->actionQuestions();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testQuestionsReturnsList(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz with questions',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('quiz_questions', [
            'id' => Uuid::v4(),
            'quiz_id' => $quizId,
            'question' => 'What is 2+2?',
            'options' => json_encode(['3', '4', '5', '6']),
            'answer_index' => 1,
            'marks' => 2,
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);
        $result = $controller->actionQuestions();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('What is 2+2?', $data[0]['question']);
        $this->assertCount(4, $data[0]['options']);
    }

    public function testQuestionsPostCreates(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);
        $_POST = [
            'question' => 'Question text',
            'options' => 'opt1,opt2,opt3',
            'answer_index' => 0,
            'marks' => 5,
        ];

        $result = $controller->actionQuestions();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame('Question text', $data['question']);
    }

    public function testQuestionsPostCreatesMultiSelect(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);
        $_POST = [
            'question' => 'Multi select',
            'options' => 'a,b,c,d',
            'answer_index' => 0,
            'answer_index_multi' => [0, 2],
            'is_multi_select' => true,
            'marks' => 5,
        ];

        $result = $controller->actionQuestions();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertTrue($data['is_multi_select']);
    }

    public function testResultRequiresAuth(): void
    {
        $quizId = Uuid::v4();
        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);

        try {
            $controller->actionResult();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testResultReturnsEmptyWhenNoAttempt(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['quiz_id' => Uuid::v4()]);
        $result = $controller->actionResult();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testResultReturnsScore(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('quiz_attempts', [
            'id' => Uuid::v4(),
            'quiz_id' => $quizId,
            'user_id' => $userId,
            'score' => 8,
            'total_marks' => 10,
            'started_at' => Time::now(),
            'completed_at' => Time::now(),
            'answers' => json_encode([1 => 1]),
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);
        $result = $controller->actionResult();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame(8.0, $data[0]['score']);
    }

    public function testMyQuizzesReturnsEmpty(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $result = $controller->actionMyQuizzes();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testMyQuizzesReturnsWithAttempts(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'My Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        Yii::$app->db->createCommand()->insert('quiz_attempts', [
            'id' => Uuid::v4(),
            'quiz_id' => $quizId,
            'user_id' => $userId,
            'score' => 7,
            'total_marks' => 10,
            'started_at' => Time::now(),
            'completed_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $result = $controller->actionMyQuizzes();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('My Quiz', $data[0]['title_en']);
        $this->assertSame(7.0, $data[0]['score']);
    }

    public function testTakeQuizRequiresAuth(): void
    {
        $quizId = Uuid::v4();
        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);

        try {
            $controller->actionTakeQuiz();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testTakeQuizCreatesAttempt(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Take Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $this->setMethod('POST');
        Yii::$app->request->setQueryParams(['quiz_id' => $quizId]);
        $result = $controller->actionTakeQuiz();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertArrayHasKey('attempt_id', $data);
        $this->assertArrayHasKey('quiz_id', $data);
    }

    public function testSubmitAnswerRequiresAuth(): void
    {
        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = ['attempt_id' => 'id', 'question_id' => 'q', 'answer_index' => 0];

        try {
            $controller->actionSubmitAnswer();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testSubmitAnswerStoresAnswer(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        // Create attempt
        $attemptId = Uuid::v4();
        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();
        Yii::$app->db->createCommand()->insert('quiz_attempts', [
            'id' => $attemptId,
            'quiz_id' => $quizId,
            'user_id' => $userId,
            'started_at' => Time::now(),
        ])->execute();

        // Create question
        $questionId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quiz_questions', [
            'id' => $questionId,
            'quiz_id' => $quizId,
            'question' => 'Q1',
            'options' => json_encode(['A', 'B']),
            'answer_index' => 0,
            'marks' => 5,
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'attempt_id' => $attemptId,
            'question_id' => $questionId,
            'answer_index' => 0,
        ];

        $result = $controller->actionSubmitAnswer();
        $data = $result->data;

        $this->assertTrue($data['ok']);

        // Verify answer stored
        $answer = Yii::$app->db->createCommand(
            'SELECT id FROM quiz_answers WHERE attempt_id = :a', [':a' => $attemptId]
        )->queryOne();
        $this->assertNotFalse($answer);
    }

    public function testSubmitAnswerWrongAnswer(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $attemptId = Uuid::v4();
        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();
        Yii::$app->db->createCommand()->insert('quiz_attempts', [
            'id' => $attemptId,
            'quiz_id' => $quizId,
            'user_id' => $userId,
            'started_at' => Time::now(),
        ])->execute();

        $questionId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quiz_questions', [
            'id' => $questionId,
            'quiz_id' => $quizId,
            'question' => 'Q1',
            'options' => json_encode(['A', 'B']),
            'answer_index' => 0, // correct answer is index 0
            'marks' => 5,
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $this->setMethod('POST');
        $_POST = [
            'attempt_id' => $attemptId,
            'question_id' => $questionId,
            'answer_index' => 1, // wrong answer
        ];

        $result = $controller->actionSubmitAnswer();
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertFalse($data['correct']);
    }

    public function testGradeAttemptRequiresAdmin(): void
    {
        $userId = $this->createTestUser('student');
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);

        try {
            $controller->actionGradeAttempt('some-id');
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testGradeAttemptScoresAllAnswers(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $attemptId = Uuid::v4();
        $userId = $this->createTestUser();
        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();
        Yii::$app->db->createCommand()->insert('quiz_attempts', [
            'id' => $attemptId,
            'quiz_id' => $quizId,
            'user_id' => $userId,
            'started_at' => Time::now(),
        ])->execute();

        // Two questions, both answered correctly
        for ($i = 0; $i < 2; $i++) {
            $qid = Uuid::v4();
            Yii::$app->db->createCommand()->insert('quiz_questions', [
                'id' => $qid,
                'quiz_id' => $quizId,
                'question' => "Q{$i}",
                'options' => json_encode(['A', 'B']),
                'answer_index' => 0,
                'marks' => 5,
            ])->execute();
            Yii::$app->db->createCommand()->insert('quiz_answers', [
                'id' => Uuid::v4(),
                'attempt_id' => $attemptId,
                'question_id' => $qid,
                'answer_index' => 0,
            ])->execute();
        }

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $result = $controller->actionGradeAttempt($attemptId);
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame(10.0, $data['score']);
        $this->assertSame('graded', $data['status']);
    }

    public function testGradeAttemptCompletesAttempt(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $attemptId = Uuid::v4();
        $quizId = Uuid::v4();
        Yii::$app->db->createCommand()->insert('quizzes', [
            'id' => $quizId,
            'title_en' => 'Quiz',
            'total_marks' => 10,
            'created_at' => Time::now(),
        ])->execute();
        Yii::$app->db->createCommand()->insert('quiz_attempts', [
            'id' => $attemptId,
            'quiz_id' => $quizId,
            'user_id' => 'user-1',
            'started_at' => Time::now(),
            'status' => 'in_progress',
        ])->execute();

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);
        $result = $controller->actionGradeAttempt($attemptId);
        $data = $result->data;

        $this->assertTrue($data['ok']);
        $this->assertSame('graded', $data['status']);
        $this->assertNotNull($data['completed_at']);
    }

    public function testGradeAttemptNotFound(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\QuizzesController('quizzes', Yii::$app, []);

        try {
            $controller->actionGradeAttempt('non-existent');
            $this->fail('Expected 404');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(404, $e->statusCode);
        }
    }
}
