<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

class ProductsController extends CrudController
{
    protected string $table = 'products';
    protected array $fields = ['name_bn', 'name_en', 'description', 'price', 'discount_price', 'stock', 'category', 'image', 'is_active', 'is_featured'];
    protected array $defaults = [
        'name_bn' => '', 'name_en' => '', 'description' => '', 'price' => 0,
        'discount_price' => null, 'stock' => 0, 'category' => '', 'image' => '',
        'is_active' => true, 'is_featured' => false,
    ];
    protected array $boolFields = ['is_active', 'is_featured'];
    protected array $floatFields = ['price', 'discount_price'];
}
