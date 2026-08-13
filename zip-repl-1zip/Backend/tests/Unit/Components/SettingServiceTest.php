<?php

declare(strict_types=1);

namespace app\tests\Unit\Components;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for SettingService — settings management logic.
 */
final class SettingServiceTest extends TestCase
{
    public function testGetSetting(): void
    {
        $service = new \app\components\SettingService();
        $value = $service->get('site_name');

        $this->assertIsString($value);
    }

    public function testGetSettingDefault(): void
    {
        $service = new \app\components\SettingService();
        $value = $service->get('nonexistent_key', 'default_value');

        $this->assertSame('default_value', $value);
    }

    public function testSetSetting(): void
    {
        $service = new \app\components\SettingService();
        $result = $service->set('test_key', 'test_value');

        $this->assertTrue($result);
    }

    public function testGetAll(): void
    {
        $service = new \app\components\SettingService();
        $settings = $service->getAll();

        $this->assertIsArray($settings);
    }

    public function testResetToDefaults(): void
    {
        $service = new \app\components\SettingService();
        $result = $service->resetToDefaults();

        $this->assertTrue($result);
    }
}
