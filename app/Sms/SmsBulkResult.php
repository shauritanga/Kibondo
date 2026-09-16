<?php

namespace App\Sms;

class SmsBulkResult
{
    /**
     * @param  array<string, SmsResult>  $byRecipient  Keyed by normalized phone
     */
    public function __construct(
        public readonly bool $success,
        public readonly array $byRecipient = [],
        public readonly ?string $error = null,
        public readonly mixed $raw = null,
    ) {}

    public static function ok(array $byRecipient, mixed $raw = null): self
    {
        return new self(success: true, byRecipient: $byRecipient, raw: $raw);
    }

    public static function fail(string $error, array $byRecipient = [], mixed $raw = null): self
    {
        return new self(success: false, byRecipient: $byRecipient, error: $error, raw: $raw);
    }

    public function sentCount(): int
    {
        return count(array_filter($this->byRecipient, fn (SmsResult $r) => $r->success));
    }

    public function failedCount(): int
    {
        return count(array_filter($this->byRecipient, fn (SmsResult $r) => ! $r->success));
    }
}
