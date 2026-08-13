<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for SubscriptionService — subscription management logic.
 */
final class SubscriptionServiceTest extends TestCase
{
    public function testActivateSubscription(): void
    {
        $service = new \app\components\SubscriptionService();
        $result = $service->activateSubscription('user-1', 'plan-1');

        $this->assertIsArray($result);
        $this->assertArrayHasKey('subscription_id', $result);
    }

    public function testDeactivateSubscription(): void
    {
        $service = new \app\components\SubscriptionService();
        $result = $service->deactivateSubscription('subscription-id');

        $this->assertIsBool($result);
    }

    public function testGetUserSubscription(): void
    {
        $service = new \app\components\SubscriptionService();
        $subscription = $service->getUserSubscription('user-1');

        $this->assertIsArray($subscription);
    }

    public function testGetActiveSubscribers(): void
    {
        $service = new \app\components\SubscriptionService();
        $subscribers = $service->getActiveSubscribers();

        $this->assertIsArray($subscribers);
    }

    public function testCanAccessFeature(): void
    {
        $service = new \app\components\SubscriptionService();
        $canAccess = $service->canAccessFeature('user-1', 'premium-content');

        $this->assertIsBool($canAccess);
    }
}
