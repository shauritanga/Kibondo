<?php

namespace App\Services\Sms;

interface SmsClient
{
    public function send(string $to, string $message): SmsResult;
}
