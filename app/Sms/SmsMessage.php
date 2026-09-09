<?php

namespace App\Sms;

class SmsMessage
{
    public function __construct(
        public readonly string $to,
        public readonly string $body,
        public readonly ?string $from = null,
        public readonly array $meta = [],
    ) {}
}
