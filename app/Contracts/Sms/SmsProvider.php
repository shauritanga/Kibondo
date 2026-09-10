<?php

namespace App\Contracts\Sms;

use App\Sms\SmsBulkMessage;
use App\Sms\SmsBulkResult;
use App\Sms\SmsMessage;
use App\Sms\SmsResult;

interface SmsProvider
{
    public function send(SmsMessage $message): SmsResult;

    /**
     * Send the same body to many recipients in one provider request.
     */
    public function sendMany(SmsBulkMessage $message): SmsBulkResult;
}
