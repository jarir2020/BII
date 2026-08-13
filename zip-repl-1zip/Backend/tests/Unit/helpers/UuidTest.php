<?php

declare(strict_types=1);

namespace app\tests\Unit\Helpers;

use app\helpers\Uuid;

/**
 * Unit tests for app\helpers\Uuid — RFC 4122 v4 UUID generation.
 * No database needed; pure function tests.
 */
final class UuidTest extends \PHPUnit\Framework\TestCase
{
    public function testV4ReturnsValidUuidString(): void
    {
        $uuid = Uuid::v4();

        $this->assertIsString($uuid);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $uuid,
            'UUID v4 must match RFC 4122 format with version 4 and variant bits'
        );
    }

    public function testV4IsUnique(): void
    {
        $uuids = [];
        for ($i = 0; $i < 100; $i++) {
            $uuids[] = Uuid::v4();
        }

        $this->assertCount(100, array_unique($uuids), '100 generated UUIDs should all be unique');
    }

    public function testV4VersionBitIsSet(): void
    {
        $uuid = Uuid::v4();
        // Version 4 UUID has '4' at position 14 (0-indexed)
        $this->assertSame('4', $uuid[14]);
    }

    public function testV4VariantBitIsSet(): void
    {
        $uuid = Uuid::v4();
        // Variant bits (8, 9, A, or B) at position 19
        $variant = strtolower($uuid[19]);
        $this->assertContains($variant, ['8', '9', 'a', 'b']);
    }

    public function testV4IsHexadecimal(): void
    {
        // Strip hyphens and check all chars are hex
        $hex = str_replace('-', '', Uuid::v4());
        $this->assertMatchesRegularExpression('/^[0-9a-f]{32}$/', $hex);
    }
}
