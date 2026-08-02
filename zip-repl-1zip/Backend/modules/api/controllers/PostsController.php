<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

class PostsController extends CrudController
{
    protected string $table = 'posts';
    protected array $fields = ['title_bn', 'title_en', 'body_bn', 'body_en', 'cover_image', 'course_id', 'cta_label_bn'];
    protected array $defaults = [
        'title_bn' => '', 'title_en' => '', 'body_bn' => '', 'body_en' => '',
        'cover_image' => '', 'course_id' => '', 'cta_label_bn' => 'বিস্তারিত দেখুন',
    ];
}
