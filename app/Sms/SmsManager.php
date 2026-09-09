<?php

namespace App\Sms;

use App\Contracts\Sms\SmsProvider;
use App\Models\Setting;
use App\Models\SmsMessageLog;
use App\Sms\Drivers\LogSmsProvider;
use App\Sms\Drivers\NextSmsProvider;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Manager;
use InvalidArgumentException;

class SmsManager extends Manager
{
    public function getDefaultDriver(): string
    {
        return (string) $this->config->get('sms.default', 'log');
    }

    public function driver($driver = null): SmsProvider
    {
        return parent::driver($driver);
    }

    /**
     * Send an SMS via the configured provider and persist a delivery log row.
     * Does not throw on provider failure (mirrors FCM channel behaviour).
     */
    public function send(string $to, string $body, array $meta = [], ?string $from = null): SmsResult
    {
        if (! $this->isEnabled()) {
            Log::info('SMS skipped (disabled)', ['to' => $to, 'meta' => $meta]);

            return SmsResult::fail('SMS is disabled');
        }

        try {
            $normalized = PhoneNumber::normalizeOrFail($to);
        } catch (InvalidArgumentException $e) {
            Log::warning('SMS skipped (invalid phone)', ['to' => $to, 'error' => $e->getMessage()]);

            SmsMessageLog::create([
                'provider' => $this->getDefaultDriver(),
                'to'       => $to,
                'body'     => $body,
                'status'   => 'failed',
                'error'    => $e->getMessage(),
                'context'  => $meta,
            ]);

            return SmsResult::fail($e->getMessage());
        }

        $message = new SmsMessage(
            to: $normalized,
            body: $body,
            from: $from ?? (string) $this->config->get('sms.from'),
            meta: $meta,
        );

        $providerName = $this->getDefaultDriver();
        $log = SmsMessageLog::create([
            'provider' => $providerName,
            'to'       => $normalized,
            'body'     => $body,
            'status'   => 'queued',
            'context'  => $meta,
        ]);

        try {
            $result = $this->driver()->send($message);
        } catch (\Throwable $e) {
            $log->update([
                'status' => 'failed',
                'error'  => $e->getMessage(),
            ]);
            Log::error('SMS provider exception', ['error' => $e->getMessage(), 'to' => $normalized]);

            return SmsResult::fail($e->getMessage());
        }

        $log->update([
            'status'               => $result->success ? 'sent' : 'failed',
            'provider_message_id'  => $result->providerMessageId,
            'error'                => $result->error,
        ]);

        return $result;
    }

    public function isEnabled(): bool
    {
        return Setting::get('sms_enabled', '1') !== '0';
    }

    protected function createLogDriver(): SmsProvider
    {
        return new LogSmsProvider;
    }

    protected function createNextsmsDriver(): SmsProvider
    {
        $config = $this->config->get('sms.drivers.nextsms', []);

        return new NextSmsProvider(
            baseUrl: (string) ($config['base_url'] ?? 'https://api.nextsms.co.tz'),
            senderId: (string) ($config['sender_id'] ?? $this->config->get('sms.from', 'KIBONDO')),
            username: $config['username'] ?? null,
            password: $config['password'] ?? null,
            apiKey: $config['api_key'] ?? null,
            sandbox: (bool) ($config['sandbox'] ?? false),
        );
    }
}
