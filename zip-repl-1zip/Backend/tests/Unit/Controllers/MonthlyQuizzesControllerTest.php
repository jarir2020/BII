<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * Unit tests for MonthlyQuizzesController — monthly quiz management.
 */
class MonthlyQuizzesControllerTest extends ApiControllerTestCase
{
    public function testGetListRequiresLogin(): void
    {
        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);

        try {
            $controller->actionIndex();
            $this->fail('Expected 401');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(401, $e->statusCode);
        }
    }

    public function testGetListReturnsEmpty(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    public function testGetListReturnsQuizzes(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        Yii::$app->db->createCommand()->insert('monthly_quizzes', [
            'id' => Uuid::v4(),
            'title_bn' => 'মাসিক কুইজ ১',
            'title_en' => 'Monthly Quiz 1',
            'exam_date' => '2026-01-15',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'duration_minutes' => 60,
            'pass_marks' => 20,
            'created_at' => Time::now(),
        ])->execute();

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertCount(1, $data);
        $this->assertSame('Monthly Quiz 1', $data[0]['title_en']);
    }

    public function testPostRequiresAdmin(): void
    {
        $userId = $this->createTestUser();
        $this->authenticateAs($userId);

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'title_en' => 'February Quiz',
            'exam_date' => '2026-02-15',
        ]);

        try {
            $controller->actionIndex();
            $this->fail('Expected 403');
        } catch (\yii\web\HttpException $e) {
            $this->assertSame(403, $e->statusCode);
        }
    }

    public function testPostCreatesQuiz(): void
    {
        $adminId = $this->createAdminUser();
        $this->authenticateAs($adminId, 'admin');

        $controller = new \app\modules\api\controllers\MonthlyQuizzesController('monthly-quizzes', Yii::$app, []);
        $this->setMethod('POST');
        $this->setBody([
            'title_bn' => 'ফেব্রুয়ারি কুইজ',
            'title_en' => 'February Quiz',
            'exam_date' => '2026-02-15',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'duration_minutes' => 60,
            'pass_marks' => 15,
        ]);

        $result = $controller->actionIndex();
        $data = $result->data;

        $this->assertSame('February Quiz', $data['title_en']);
        $this->assertSame('2026-02-15', $data['exam_date']);
    }
}
