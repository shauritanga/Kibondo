<?php

namespace App\Sms\Drivers;

use App\Contracts\Sms\SmsProvider;
use App\Sms\SmsMessage;
use App\Sms\SmsResult;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LogSmsProvider implements SmsProvider
{
    public function send(SmsMessage $message): SmsResult
    {
        $id = 'log_' . Str::uuid()->toString();

        Log::info('SMS (log driver)', [
            'id'   => $id,
            'to'   => $message->to,
            'from' => $message->from,
            'body' => $message->body,
            'meta' => $message->meta,
        ]);

        return SmsResult::ok($id, ['driver' => 'log']);
    }
}
