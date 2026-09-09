<?php

namespace App\Sms;

class SmsResult
{
    public function __construct(
        public readonly bool $success,
        public readonly ?string $providerMessageId = null,
        public readonly ?string $error = null,
        public readonly mixed $raw = null,
    ) {}

    public static function ok(?string $providerMessageId = null, mixed $raw = null): self
    {
        return new self(success: true, providerMessageId: $providerMessageId, raw: $raw);
    }

    public static function fail(string $error, mixed $raw = null): self
    {
        return new self(success: false, error: $error, raw: $raw);
    }
}
