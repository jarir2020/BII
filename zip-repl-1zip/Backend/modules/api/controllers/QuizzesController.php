<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

class QuizzesController extends CrudController
{
    protected string $table = 'quizzes';
    protected array $fields = ['title_bn', 'title_en', 'description', 'month', 'questions', 'starts_at', 'ends_at'];
    protected array $defaults = [
        'title_bn' => '', 'title_en' => '', 'description' => '',
        'month' => '', 'questions' => null, 'starts_at' => '', 'ends_at' => '',
    ];
    protected array $jsonFields = ['questions'];
}
