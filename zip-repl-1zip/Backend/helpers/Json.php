<?php

declare(strict_types=1);

namespace app\helpers;

/**
 * Helpers to convert MySQL rows <-> FastAPI-style documents:
 * decode JSON columns, cast boolean/integer/float columns to JSON-native types.
 */
class Json
{
    /**
     * Convert a MySQL row (assoc array) to a response document.
     * @param array $json  columns to json_decode
     * @param array $bool  columns to cast to boolean
     * @param array $float columns to cast to float
     */
    public static function row(array $row, array $json = [], array $bool = [], array $float = []): array
    {
        foreach ($json as $c) {
            if (array_key_exists($c, $row)) {
                $row[$c] = $row[$c] === null ? null : json_decode((string) $row[$c], true);
            }
        }
        foreach ($bool as $c) {
            if (array_key_exists($c, $row)) {
                $row[$c] = (bool) $row[$c];
            }
        }
        foreach ($float as $c) {
            if (array_key_exists($c, $row)) {
                $row[$c] = (float) $row[$c];
            }
        }
        return $row;
    }

    /** Encode JSON columns before writing to the DB (side-effect-free). */
    public static function encodeRow(array $data, array $json = []): array
    {
        foreach ($json as $c) {
            if (array_key_exists($c, $data)) {
                $v = $data[$c];
                $data[$c] = $v === null ? null
                    : json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }
        return $data;
    }
}
