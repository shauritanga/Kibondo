<?php

namespace App\Support;

use InvalidArgumentException;

class PhoneNumber
{
    /**
     * Normalize a Tanzanian phone number to 255XXXXXXXXX (no +).
     *
     * Accepts: 07XXXXXXXX, 7XXXXXXXX, +2557XXXXXXXX, 2557XXXXXXXX, spaces/dashes.
     */
    public static function normalize(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '255') && strlen($digits) === 12) {
            return $digits;
        }

        if (str_starts_with($digits, '0') && strlen($digits) === 10) {
            return '255' . substr($digits, 1);
        }

        if (strlen($digits) === 9 && str_starts_with($digits, '7')) {
            return '255' . $digits;
        }

        return null;
    }

    /**
     * @throws InvalidArgumentException
     */
    public static function normalizeOrFail(string $phone): string
    {
        $normalized = self::normalize($phone);

        if ($normalized === null) {
            throw new InvalidArgumentException("Invalid phone number: {$phone}");
        }

        return $normalized;
    }

    public static function isValid(?string $phone): bool
    {
        return self::normalize($phone) !== null;
    }
}
