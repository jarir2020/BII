<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for QuizService — quiz business logic.
 */
final class QuizServiceTest extends TestCase
{
    public function testCalculateScore(): void
    {
        $service = new \app\components\QuizService();

        $answers = [
            'q1' => ['option_a'],
            'q2' => ['option_b', 'option_d'],
            'q3' => ['option_c'],
        ];

        $correctAnswers = [
            'q1' => ['option_a'],
            'q2' => ['option_b'],  // partial match
            'q3' => ['option_c'],
        ];

        $score = $service->calculateScore($answers, $correctAnswers);
        $this->assertIsInt($score);
        $this->assertTrue($score >= 0);
    }

    public function testCalculateScoreAllWrong(): void
    {
        $service = new \app\components\QuizService();

        $answers = [
            'q1' => ['option_b'],
            'q2' => ['option_a'],
        ];

        $correctAnswers = [
            'q1' => ['option_a'],
            'q2' => ['option_b'],
        ];

        $score = $service->calculateScore($answers, $correctAnswers);
        $this->assertSame(0, $score);
    }

    public function testCalculateScoreAllCorrect(): void
    {
        $service = new \app\components\QuizService();

        $answers = [
            'q1' => ['option_a'],
            'q2' => ['option_b'],
        ];

        $correctAnswers = [
            'q1' => ['option_a'],
            'q2' => ['option_b'],
        ];

        $score = $service->calculateScore($answers, $correctAnswers);
        $this->assertSame(2, $score);
    }
}
