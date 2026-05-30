<?php

namespace App\Services\Sms;

class SmsResult
{
    public function __construct(
        public bool $successful,
        public ?string $providerMessageId = null,
        public ?string $status = null,
        public ?string $error = null,
        public array $raw = [],
    ) {}
}
