<?php

declare(strict_types=1);

namespace app\tests\Unit\Helpers;

use app\helpers\Time;

/**
 * Unit tests for app\helpers\Time — Python isoformat timestamps.
 * No database needed; pure function tests.
 */
final class TimeTest extends \PHPUnit\Framework\TestCase
{
    public function testNowReturnsValidIsoformat(): void
    {
        $iso = Time::now();

        // Must match: YYYY-MM-DDTHH:MM:SS.ffffff+00:00
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+00:00$/',
            $iso,
            'Time::now() must return Python isoformat with microseconds and +00:00 offset'
        );
    }

    public function testParseHandlesPlusOffset(): void
    {
        $iso = '2026-08-02T05:00:00.123456+00:00';
        $dt = Time::parse($iso);

        $this->assertSame(2026, $dt->format('Y'));
        $this->assertSame('08', $dt->format('m'));
        $this->assertSame('02', $dt->format('d'));
        $this->assertSame('05', $dt->format('H'));
        $this->assertSame('00', $dt->format('i'));
        $this->assertSame('00', $dt->format('s'));
    }

    public function testParseHandlesZSuffix(): void
    {
        $iso = '2026-01-15T12:30:45.000000Z';
        $dt = Time::parse($iso);

        $this->assertSame(2026, $dt->format('Y'));
        $this->assertSame('01', $dt->format('m'));
        $this->assertSame('15', $dt->format('d'));
    }

    public function testAddMinutesForward(): void
    {
        $iso = '2026-08-02T10:00:00.000000+00:00';
        $result = Time::addMinutes($iso, 30);

        $this->assertSame('2026-08-02T10:30:00.000000+00:00', $result);
    }

    public function testAddMinutesBackward(): void
    {
        $iso = '2026-08-02T10:00:00.000000+00:00';
        $result = Time::addMinutes($iso, -45);

        $this->assertSame('2026-08-02T09:15:00.000000+00:00', $result);
    }

    public function testAddDaysForward(): void
    {
        $iso = '2026-08-02T00:00:00.000000+00:00';
        $result = Time::addDays($iso, 5);

        $this->assertSame('2026-08-07T00:00:00.000000+00:00', $result);
    }

    public function testAddDaysBackward(): void
    {
        $iso = '2026-08-02T00:00:00.000000+00:00';
        $result = Time::addDays($iso, -2);

        $this->assertSame('2026-07-31T00:00:00.000000+00:00', $result);
    }

    public function testFromDateTimeFormatsAsIsoformat(): void
    {
        $dt = new \DateTimeImmutable('2026-03-15T08:30:45.123456', new \DateTimeZone('Asia/Dhaka'));
        $iso = Time::fromDateTime($dt);

        // Must be UTC with microseconds and +00:00
        $this->assertSame('2026-03-15T02:30:45.123456+00:00', $iso);
    }

    public function testComparableStripsMicrosecondsAndOffset(): void
    {
        $iso = '2026-08-02T10:30:00.123456+00:00';
        $comp = Time::comparable($iso);

        $this->assertSame('2026-08-02T10:30:00', $comp);
    }

    public function testComparableHandlesZSuffix(): void
    {
        $iso = '2026-01-01T00:00:00.000000Z';
        $comp = Time::comparable($iso);

        $this->assertSame('2026-01-01T00:00:00', $comp);
    }

    public function testComparablePreservesSeconds(): void
    {
        $iso = '2026-12-31T23:59:59.999999+00:00';
        $comp = Time::comparable($iso);

        $this->assertSame('2026-12-31T23:59:59', $comp);
    }
}
