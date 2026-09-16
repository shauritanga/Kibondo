<?php

namespace App\Services;

use App\Sms\SmsBulkResult;
use App\Sms\SmsManager;
use App\Sms\SmsResult;

class SmsService
{
    public function __construct(private SmsManager $manager) {}

    public function send(string $to, string $body, array $meta = [], ?string $from = null): SmsResult
    {
        return $this->manager->send($to, $body, $meta, $from);
    }

    /**
     * @param  list<string>  $recipients
     */
    public function sendMany(array $recipients, string $body, array $meta = [], ?string $from = null): SmsBulkResult
    {
        return $this->manager->sendMany($recipients, $body, $meta, $from);
    }

    public function driver(?string $name = null)
    {
        return $this->manager->driver($name);
    }

    public function isEnabled(): bool
    {
        return $this->manager->isEnabled();
    }
}
