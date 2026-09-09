<?php

namespace App\Contracts\Sms;

use App\Sms\SmsMessage;
use App\Sms\SmsResult;

interface SmsProvider
{
    public function send(SmsMessage $message): SmsResult;
}
