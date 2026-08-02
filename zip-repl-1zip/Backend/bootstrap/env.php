<?php

declare(strict_types=1);

/**
 * Minimal .env loader (no external dependency).
 *
 * Reads a KEY=VALUE file (project root .env, or runtime/.env) and populates
 * getenv()/$_ENV for keys that aren't already set (existing env wins).
 * Supports # comments, blank lines, and optional "export " prefix.
 */

function bii_load_env(string $dir): void
{
    foreach (['.env', 'runtime/.env'] as $relative) {
        $file = rtrim($dir, '/') . '/' . $relative;
        if (!is_file($file)) {
            continue;
        }
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            continue;
        }
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
                continue;
            }
            $line = preg_replace('/^export\s+/', '', $line) ?? $line;
            [$key, $value] = array_map('trim', explode('=', $line, 2));
            if ($key === '' || getenv($key) !== false) {
                continue;
            }
            // Strip surrounding quotes
            if (strlen($value) >= 2) {
                $first = $value[0];
                $last = $value[strlen($value) - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
        }
    }
}

bii_load_env(dirname(__DIR__)); // project root (yii-backend)
