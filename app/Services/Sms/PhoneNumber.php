<?php

namespace App\Services\Sms;

class PhoneNumber
{
    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $phone = trim($value);
        if ($phone === '') {
            return null;
        }

        $phone = preg_replace('/[^\d+]/', '', $phone) ?? '';

        if (str_starts_with($phone, '+')) {
            return $phone;
        }

        if (str_starts_with($phone, '255')) {
            return '+' . $phone;
        }

        if (str_starts_with($phone, '0')) {
            return '+255' . substr($phone, 1);
        }

        if (preg_match('/^[67]\d{8}$/', $phone)) {
            return '+255' . $phone;
        }

        return $phone !== '' ? '+' . $phone : null;
    }
}
