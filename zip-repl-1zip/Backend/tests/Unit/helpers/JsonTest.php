<?php

declare(strict_types=1);

namespace app\tests\Unit\Helpers;

use app\helpers\Json;

/**
 * Unit tests for app\helpers\Json — row encoding/decoding helpers.
 * No database needed; pure function tests.
 */
final class JsonTest extends \PHPUnit\Framework\TestCase
{
    public function testRowDecodesJsonColumns(): void
    {
        $row = [
            'id' => '1',
            'title' => 'Test',
            'metadata' => '{"key":"value","count":42}',
            'tags' => '["a","b"]',
            'active' => '1',
            'score' => '9.5',
        ];

        $result = Json::row($row, ['metadata', 'tags'], ['active'], ['score']);

        $this->assertSame(['key' => 'value', 'count' => 42], $result['metadata']);
        $this->assertSame(['a', 'b'], $result['tags']);
        $this->assertTrue($result['active']);
        $this->assertSame(9.5, $result['score']);
        $this->assertSame('Test', $result['title']);
    }

    public function testRowHandlesNullJsonColumns(): void
    {
        $row = [
            'id' => '2',
            'metadata' => null,
            'tags' => null,
        ];

        $result = Json::row($row, ['metadata', 'tags']);

        $this->assertNull($result['metadata']);
        $this->assertNull($result['tags']);
    }

    public function testRowIgnoresMissingColumns(): void
    {
        $row = ['id' => '3', 'name' => 'Foo'];

        $result = Json::row($row, ['nonexistent'], ['also_missing']);

        $this->assertSame('Foo', $result['name']);
        $this->assertArrayNotHasKey('nonexistent', $result);
    }

    public function testEncodeRowEncodesJsonColumns(): void
    {
        $data = [
            'id' => '4',
            'settings' => ['theme' => 'dark', 'lang' => 'bn'],
            'tags' => ['bonus', 'featured'],
            'nullable' => null,
        ];

        $result = Json::encodeRow($data, ['settings', 'tags', 'nullable']);

        $this->assertSame('{"theme":"dark","lang":"bn"}', $result['settings']);
        $this->assertSame('["bonus","featured"]', $result['tags']);
        $this->assertNull($result['nullable']);
        $this->assertSame('4', $result['id']);
    }

    public function testEncodeRowPreservesNonJsonFields(): void
    {
        $data = [
            'id' => '5',
            'title' => 'ইসলাম',
            'price' => 500,
        ];

        $result = Json::encodeRow($data, []);

        $this->assertSame('ইসলাম', $result['title']);
        $this->assertSame(500, $result['price']);
    }
}
