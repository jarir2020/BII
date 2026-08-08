<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Json;
use app\helpers\Time;
use app\helpers\Uuid;
use Yii;

/**
 * /api/monthly-quizzes/* — monthly quiz lifecycle (sessions, scoring, ranks).
 * Mirrors FastAPI's logic exactly, including timer grace and rank rules.
 */
class MonthlyQuizzesController extends ApiController
{
    private const JSON_FIELDS = ['rules', 'questions', 'winners'];
    private const BOOL_FIELDS = ['is_active'];

    private function defaults(): array
    {
        return [
            'title_bn' => '', 'title_en' => '', 'exam_date' => '', 'start_time' => '', 'end_time' => '',
            'duration_minutes' => 30, 'pass_marks' => 0, 'rules' => [],
            'prize_title' => '', 'prize_description' => '', 'prize_image' => '',
            'is_active' => true, 'questions' => [], 'winners' => [],
        ];
    }

    public function actionIndex(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            $this->requireAdmin();
            $data = $this->buildDoc(Yii::$app->request->post());
            $data['id'] = Uuid::v4();
            $data['created_at'] = $this->now();
            $row = Json::encodeRow($data, self::JSON_FIELDS);
            Yii::$app->db->createCommand()->insert('monthly_quizzes', $row)->execute();
            return $this->json($this->toDoc($row));
        }
        // Requires login.
        $this->user();
        $rows = Yii::$app->db->createCommand('SELECT * FROM monthly_quizzes ORDER BY exam_date DESC LIMIT 100')->queryAll();
        return $this->json(array_map(fn ($r) => $this->toDoc($r), $rows));
    }

    public function actionView(string $id): \yii\web\Response
    {
        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            return $this->updateQuiz($id);
        }
        if ($request->isDelete) {
            $this->requireAdmin();
            Yii::$app->db->createCommand()->delete('monthly_quizzes', ['id' => $id])->execute();
            return $this->json(['ok' => true]);
        }
        // Requires login; hide correct answers.
        $this->user();
        $row = $this->findQuiz($id);
        if ($row === null) {
            $this->notFound('কুইজ পাওয়া যায়নি');
        }
        $doc = $this->toDoc($row);
        $safe = $doc;
        unset($safe['questions']);
        $questions = $doc['questions'] ?? [];
        $safe['questions'] = array_map(function ($qu) {
            $out = $qu;
            unset($out['correct_index']);
            return $out;
        }, is_array($questions) ? $questions : []);
        return $this->json($safe);
    }

    /** POST /monthly-quizzes/{mid}/start */
    public function actionStart(): \yii\web\Response
    {
        $user = $this->user();
        $mid = (string) Yii::$app->request->get('mid', '');
        $quiz = $this->findQuiz($mid);
        if ($quiz === null) {
            $this->notFound('কুইজ পাওয়া যায়নি');
        }
        if ($this->submissionExists($mid, $user['id'])) {
            $this->badRequest('আপনি ইতিমধ্যে এই কুইজে অংশ নিয়েছেন');
        }

        $session = Yii::$app->db->createCommand(
            'SELECT * FROM quiz_sessions WHERE quiz_id = :q AND user_id = :u',
            [':q' => $mid, ':u' => $user['id']]
        )->queryOne();

        if ($session === false) {
            $startedAt = $this->now();
            Yii::$app->db->createCommand()->insert('quiz_sessions', [
                'id' => Uuid::v4(), 'quiz_id' => $mid, 'user_id' => $user['id'], 'started_at' => $startedAt,
            ])->execute();
        } else {
            $startedAt = $session['started_at'];
        }

        $duration = (int) ($quiz['duration_minutes'] ?: 30);
        $deadline = Time::addMinutes($startedAt, $duration);
        return $this->json([
            'started_at' => $startedAt,
            'deadline' => $deadline,
            'duration_minutes' => $duration,
        ]);
    }

    /** POST /monthly-quizzes/{mid}/submit */
    public function actionSubmit(): \yii\web\Response
    {
        $user = $this->user();
        $mid = (string) Yii::$app->request->get('mid', '');
        $body = Yii::$app->request->post();
        $answers = (array) ($body['answers'] ?? []);

        $quiz = $this->findQuiz($mid);
        if ($quiz === null) {
            $this->notFound('কুইজ পাওয়া যায়নি');
        }
        if ($this->submissionExists($mid, $user['id'])) {
            $this->badRequest('আপনি ইতিমধ্যে এই কুইজে অংশ নিয়েছেন');
        }

        $session = Yii::$app->db->createCommand(
            'SELECT * FROM quiz_sessions WHERE quiz_id = :q AND user_id = :u',
            [':q' => $mid, ':u' => $user['id']]
        )->queryOne();

        $timeTaken = 0;
        if ($session !== false) {
            $startedDt = Time::parse((string) $session['started_at']);
            $nowDt = Time::parse($this->now());
            $timeTaken = max(0, (int) ($nowDt->getTimestamp() - $startedDt->getTimestamp()));
            $duration = (int) ($quiz['duration_minutes'] ?: 30);
            if ($timeTaken > ($duration * 60) + 120) {
                $this->badRequest('সময় শেষ হয়ে গেছে');
            }
        }

        $questions = json_decode((string) ($quiz['questions'] ?? 'null'), true) ?: [];
        $score = 0;
        $total = 0;
        $detail = [];
        foreach ($questions as $i => $q) {
            $given = array_key_exists($i, $answers) ? $answers[$i] : null;
            $correct = $q['correct_index'] ?? null;
            $marks = (int) ($q['marks'] ?? 1);
            $total += $marks;
            $isCorrect = $given !== null && $given === $correct;
            if ($isCorrect) {
                $score += $marks;
            }
            $detail[] = [
                'q' => $q['q'] ?? '',
                'options' => $q['options'] ?? [],
                'given' => $given,
                'correct' => $correct,
                'marks' => $marks,
                'is_correct' => $isCorrect,
            ];
        }

        $passMarks = (int) ($quiz['pass_marks'] ?? 0);
        $sub = [
            'id' => Uuid::v4(),
            'quiz_id' => $mid,
            'user_id' => $user['id'],
            'user_name' => $user['name'] ?? '',
            'user_email' => $user['email'] ?? '',
            'user_phone' => $user['phone'] ?? '',
            'user_address' => $user['address'] ?? '',
            'student_id' => $user['student_id'] ?? '',
            'score' => $score,
            'total_marks' => $total,
            'passed' => $score >= $passMarks ? 1 : 0,
            'detail' => json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'time_taken_seconds' => $timeTaken,
            'submitted_at' => $this->now(),
        ];
        Yii::$app->db->createCommand()->insert('monthly_quiz_submissions', $sub)->execute();

        $sub['rank'] = $this->rankOf($mid, $score, $timeTaken);

        Yii::$app->db->createCommand()->delete('quiz_sessions', ['quiz_id' => $mid, 'user_id' => $user['id']])->execute();

        $sub['detail'] = json_decode($sub['detail'], true);
        $sub['passed'] = (bool) $sub['passed'];
        return $this->json($sub);
    }

    /** GET /monthly-quizzes/{mid}/leaderboard */
    public function actionLeaderboard(): \yii\web\Response
    {
        $this->user();
        $mid = (string) Yii::$app->request->get('mid', '');
        $rows = Yii::$app->db->createCommand(
            'SELECT id, user_id, user_name, user_email, user_phone, user_address, student_id, score, total_marks, passed, time_taken_seconds, submitted_at '
            . 'FROM monthly_quiz_submissions WHERE quiz_id = :q '
            . 'ORDER BY score DESC, time_taken_seconds ASC, submitted_at ASC',
            [':q' => $mid]
        )->queryAll();
        $out = [];
        foreach ($rows as $i => $r) {
            $r['rank'] = $i + 1;
            $r['passed'] = (bool) $r['passed'];
            $out[] = $r;
        }
        return $this->json($out);
    }

    /** GET /monthly-quizzes/{mid}/my-result */
    public function actionMyResult(): \yii\web\Response
    {
        $user = $this->user();
        $mid = (string) Yii::$app->request->get('mid', '');
        $row = Yii::$app->db->createCommand(
            'SELECT * FROM monthly_quiz_submissions WHERE quiz_id = :q AND user_id = :u',
            [':q' => $mid, ':u' => $user['id']]
        )->queryOne();
        if ($row === false) {
            $this->notFound('ফলাফল পাওয়া যায়নি');
        }
        $row = Json::row($row, ['detail'], ['passed']);
        $row['rank'] = $this->rankOf($mid, (int) $row['score'], (int) $row['time_taken_seconds']);
        $row['total_participants'] = (int) Yii::$app->db->createCommand(
            'SELECT COUNT(*) FROM monthly_quiz_submissions WHERE quiz_id = :q', [':q' => $mid]
        )->queryScalar();
        return $this->json($row);
    }

    /** GET /monthly-quizzes/{mid}/results — admin */
    public function actionResults(): \yii\web\Response
    {
        $this->requireAdmin();
        $mid = (string) Yii::$app->request->get('mid', '');
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM monthly_quiz_submissions WHERE quiz_id = :q ORDER BY score DESC, time_taken_seconds ASC',
            [':q' => $mid]
        )->queryAll();
        $out = [];
        foreach ($rows as $i => $r) {
            $r = Json::row($r, ['detail'], ['passed']);
            $r['rank'] = $i + 1;
            $out[] = $r;
        }
        return $this->json($out);
    }

    /** PUT /monthly-quizzes/{mid}/winners — admin */
    public function actionWinners(): \yii\web\Response
    {
        $this->requireAdmin();
        $mid = (string) Yii::$app->request->get('mid', '');
        $body = Yii::$app->request->post();
        $winners = $body['winners'] ?? [];
        Yii::$app->db->createCommand()->update('monthly_quizzes', [
            'winners' => json_encode($winners, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ], ['id' => $mid])->execute();
        $row = $this->findQuiz($mid);
        return $this->json($this->toDoc($row));
    }

    /** PATCH /monthly-quizzes/{mid}/participants/{uid}/shipping — admin */
    public function actionShipping(): \yii\web\Response
    {
        $this->requireAdmin();
        $mid = (string) Yii::$app->request->get('mid', '');
        $uid = (string) Yii::$app->request->get('uid', '');
        $body = Yii::$app->request->post();

        $quiz = $this->findQuiz($mid);
        if ($quiz === null) {
            $this->notFound('কুইজ পাওয়া যায়নি');
        }
        $winners = json_decode((string) ($quiz['winners'] ?? 'null'), true) ?: [];
        foreach ($winners as &$w) {
            if (($w['user_id'] ?? '') === $uid) {
                $w['shipping_status'] = $body['shipping_status'] ?? '';
                $w['tracking_number'] = (string) ($body['tracking_number'] ?? '');
            }
        }
        unset($w);
        Yii::$app->db->createCommand()->update('monthly_quizzes', [
            'winners' => json_encode($winners, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ], ['id' => $mid])->execute();

        return $this->json(['ok' => true]);
    }

    /** GET /api/my-quiz-results */
    public function actionMyResults(): \yii\web\Response
    {
        $user = $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT * FROM monthly_quiz_submissions WHERE user_id = :u ORDER BY submitted_at DESC',
            [':u' => $user['id']]
        )->queryAll();
        return $this->json(array_map(fn ($r) => Json::row($r, ['detail'], ['passed']), $rows));
    }

    private function updateQuiz(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        if ($this->findQuiz($id) === null) {
            $this->notFound('কুইজ পাওয়া যায়নি');
        }
        $data = $this->buildDoc(Yii::$app->request->post());
        $data['updated_at'] = $this->now();
        Yii::$app->db->createCommand()->update('monthly_quizzes', Json::encodeRow($data, self::JSON_FIELDS), ['id' => $id])->execute();
        return $this->json($this->toDoc($this->findQuiz($id)));
    }

    private function buildDoc(array $body): array
    {
        $data = $this->defaults();
        foreach ($this->defaults() as $k => $v) {
            if (array_key_exists($k, $body)) {
                $data[$k] = $body[$k];
            }
        }
        return $data;
    }

    private function findQuiz(string $id): ?array
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM monthly_quizzes WHERE id = :id', [':id' => $id])->queryOne();
        return $row === false ? null : $row;
    }

    private function submissionExists(string $quizId, string $userId): bool
    {
        return Yii::$app->db->createCommand(
            'SELECT id FROM monthly_quiz_submissions WHERE quiz_id = :q AND user_id = :u',
            [':q' => $quizId, ':u' => $userId]
        )->queryOne() !== false;
    }

    /** Count submissions ranked better: higher score, or equal score but faster. */
    private function rankOf(string $quizId, int $score, int $timeTaken): int
    {
        $sql = 'SELECT COUNT(*) FROM monthly_quiz_submissions '
            . 'WHERE quiz_id = :q AND (score > :s OR (score = :s AND time_taken_seconds < :t))';
        $better = (int) Yii::$app->db->createCommand($sql, [':q' => $quizId, ':s' => $score, ':t' => $timeTaken])->queryScalar();
        return $better + 1;
    }

    private function toDoc(array $row): array
    {
        return Json::row($row, self::JSON_FIELDS, self::BOOL_FIELDS);
    }
}
