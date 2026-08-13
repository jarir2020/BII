<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for CouponService — promo/coupon logic.
 */
final class CouponServiceTest extends TestCase
{
    public function testValidateCoupon(): void
    {
        $service = new \app\components\CouponService();
        $result = $service->validateCoupon('TESTCODE');

        $this->assertIsArray($result);
        $this->assertArrayHasKey('valid', $result);
    }

    public function testCalculateDiscount(): void
    {
        $service = new \app\components\CouponService();

        // Fixed discount
        $discount = $service->calculateDiscount(1000, ['type' => 'fixed', 'value' => 200]);
        $this->assertSame(800.0, $discount['final_price']);
        $this->assertSame(200.0, $discount['discount']);

        // Percentage discount
        $discount = $service->calculateDiscount(1000, ['type' => 'percent', 'value' => 10]);
        $this->assertSame(900.0, $discount['final_price']);
        $this->assertSame(100.0, $discount['discount']);
    }

    public function testCalculateDiscountInvalidCoupon(): void
    {
        $service = new \app\components\CouponService();
        $discount = $service->calculateDiscount(1000, ['type' => 'invalid', 'value' => 0]);

        $this->assertSame(1000.0, $discount['final_price']);
        $this->assertSame(0.0, $discount['discount']);
    }

    public function testIsExpired(): void
    {
        $service = new \app\components\CouponService();
        // Past expiry
        $expired = $service->isExpired(['expires_at' => '2020-01-01']);
        $this->assertTrue($expired);

        // Future expiry
        $active = $service->isExpired(['expires_at' => '2099-01-01']);
        $this->assertFalse($active);
    }
}
