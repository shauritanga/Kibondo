<?php

namespace App\Sms;

class SmsBulkMessage
{
    /**
     * @param  list<string>  $to  Normalized phone numbers (255…)
     */
    public function __construct(
        public readonly array $to,
        public readonly string $body,
        public readonly ?string $from = null,
        public readonly array $meta = [],
    ) {}
}
