<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

class ProductsController extends CrudController
{
    protected string $table = 'products';
    protected array $fields = ['name_bn', 'name_en', 'description', 'price', 'discount_price', 'stock', 'category', 'image', 'images', 'video_url', 'is_active', 'is_featured'];
    protected array $defaults = [
        'name_bn' => '', 'name_en' => '', 'description' => '', 'price' => 0,
        'discount_price' => null, 'stock' => 0, 'category' => '', 'image' => '',
        'images' => [], 'video_url' => '',
        'is_active' => true, 'is_featured' => false,
    ];
    protected array $jsonFields = ['images'];
    protected array $boolFields = ['is_active', 'is_featured'];
    protected array $floatFields = ['price', 'discount_price'];

    protected function postProcess(array &$data): void
    {
        // Keep the legacy cover-image column populated for older clients and
        // existing shop views, while the gallery remains the source of truth.
        if (!is_array($data['images'] ?? null)) {
            $data['images'] = [];
        }
        $data['images'] = array_values(array_filter($data['images'], static fn ($url) => is_string($url) && trim($url) !== ''));
        if ($data['images'] && trim((string) ($data['image'] ?? '')) === '') {
            $data['image'] = $data['images'][0];
        }
        $data['video_url'] = trim((string) ($data['video_url'] ?? ''));
    }
}
