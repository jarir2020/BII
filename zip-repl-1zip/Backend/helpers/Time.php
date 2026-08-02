<?php

declare(strict_types=1);

namespace app\helpers;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Timestamps are stored and returned exactly as Python's
 * datetime.now(timezone.utc).isoformat(), e.g.
 *   "2026-08-02T05:00:00.123456+00:00"
 * so responses match the FastAPI backend byte-for-byte.
 */
class Time
{
    /**
     * Current UTC time as a Python isoformat() string (microseconds + offset).
     */
    public static function now(): string
    {
        $parts = explode(' ', microtime()); // "0.123456 1785700000"
        $sec = (int) $parts[1];
        $us = (int) round(((float) $parts[0]) * 1_000_000);
        return sprintf('%s.%06d+00:00', gmdate('Y-m-d\TH:i:s', $sec), $us);
    }

    /**
     * Parse a Python ISO string (with Z or +00:00) into a DateTimeImmutable.
     */
    public static function parse(string $iso): DateTimeImmutable
    {
        return new DateTimeImmutable($iso);
    }

    /**
     * Add minutes to an ISO string, return a new ISO string.
     */
    public static function addMinutes(string $iso, float $minutes): string
    {
        $dt = self::parse($iso)->modify(($minutes >= 0 ? '+' : '-') . abs($minutes) . ' minutes');
        return self::fromDateTime($dt);
    }

    /** Add days to an ISO string, return a new ISO string. */
    public static function addDays(string $iso, float $days): string
    {
        $dt = self::parse($iso)->modify(($days >= 0 ? '+' : '-') . abs($days) . ' days');
        return self::fromDateTime($dt);
    }

    /**
     * Format a DateTimeImmutable as a Python isoformat() string in UTC.
     */
    public static function fromDateTime(DateTimeImmutable $dt): string
    {
        $dt = $dt->setTimezone(new DateTimeZone('UTC'));
        return sprintf('%s.%06d+00:00', $dt->format('Y-m-d\TH:i:s'), (int) $dt->format('u'));
    }

    /**
     * Convert an ISO string (string or int unix timestamp) to a Comparable string
     * safe for lexicographic / SQL comparison (strip microseconds + offset).
     */
    public static function comparable(string $iso): string
    {
        return (string) preg_replace('/\.\d{6}(\+00:00|Z)$/', '', $iso);
    }
}
