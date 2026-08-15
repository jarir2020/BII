<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

/**
 * Singular alias for ProductsController.
 *
 * Allows both /api/product and /api/products to work identically.
 * The React admin panel may navigate to either form; this ensures
 * the backend never returns 404 for the singular path.
 */
class ProductController extends ProductsController
{
    // All logic is inherited from ProductsController.
    // This class exists solely so that Yii2's URL manager can resolve
    // 'api/product' → ProductController::actionIndex().
}
