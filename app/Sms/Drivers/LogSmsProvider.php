<?php

namespace App\Sms\Drivers;

use App\Contracts\Sms\SmsProvider;
use App\Sms\SmsBulkMessage;
use App\Sms\SmsBulkResult;
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

    public function sendMany(SmsBulkMessage $message): SmsBulkResult
    {
        $byRecipient = [];

        foreach ($message->to as $phone) {
            $id = 'log_' . Str::uuid()->toString();
            Log::info('SMS bulk (log driver)', [
                'id'   => $id,
                'to'   => $phone,
                'from' => $message->from,
                'body' => $message->body,
                'meta' => $message->meta,
            ]);
            $byRecipient[$phone] = SmsResult::ok($id, ['driver' => 'log']);
        }

        return SmsBulkResult::ok($byRecipient, ['driver' => 'log', 'count' => count($message->to)]);
    }
}
