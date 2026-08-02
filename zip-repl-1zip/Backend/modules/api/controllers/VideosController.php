<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

class VideosController extends CrudController
{
    protected string $table = 'videos';
    protected array $fields = ['title_bn', 'title_en', 'description', 'video_url', 'thumbnail', 'course_id'];
    protected array $defaults = [
        'title_bn' => '', 'title_en' => '', 'description' => '',
        'video_url' => '', 'thumbnail' => '', 'course_id' => '',
    ];
}
