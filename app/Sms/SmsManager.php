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

    /**
     * Send the same body to many recipients, chunked for the provider.
     * Persists one sms_messages row per phone. Does not throw on provider failure.
     *
     * @param  list<string>  $recipients
     */
    public function sendMany(array $recipients, string $body, array $meta = [], ?string $from = null): SmsBulkResult
    {
        if (! $this->isEnabled()) {
            Log::info('SMS bulk skipped (disabled)', ['count' => count($recipients), 'meta' => $meta]);

            return SmsBulkResult::fail('SMS is disabled');
        }

        $normalized = [];
        $invalid = [];

        foreach ($recipients as $phone) {
            $n = PhoneNumber::normalize(is_string($phone) ? $phone : null);
            if ($n === null) {
                $invalid[(string) $phone] = SmsResult::fail('Invalid phone number');
                SmsMessageLog::create([
                    'provider' => $this->getDefaultDriver(),
                    'to'       => (string) $phone,
                    'body'     => $body,
                    'status'   => 'failed',
                    'error'    => 'Invalid phone number',
                    'context'  => $meta,
                ]);
            } else {
                $normalized[$n] = $n;
            }
        }

        $phones = array_values($normalized);
        if ($phones === []) {
            return SmsBulkResult::fail('No valid recipients', $invalid);
        }

        $chunkSize = max(1, (int) $this->config->get('sms.bulk_chunk_size', 100));
        $byRecipient = $invalid;
        $providerName = $this->getDefaultDriver();
        $fromResolved = $from ?? (string) $this->config->get('sms.from');
        $anyProviderFailure = false;
        $lastError = null;
        $rawChunks = [];

        foreach (array_chunk($phones, $chunkSize) as $chunkIndex => $chunk) {
            $logs = [];
            foreach ($chunk as $phone) {
                $logs[$phone] = SmsMessageLog::create([
                    'provider' => $providerName,
                    'to'       => $phone,
                    'body'     => $body,
                    'status'   => 'queued',
                    'context'  => array_merge($meta, ['bulk_chunk' => $chunkIndex]),
                ]);
            }

            try {
                $result = $this->driver()->sendMany(new SmsBulkMessage(
                    to: $chunk,
                    body: $body,
                    from: $fromResolved,
                    meta: array_merge($meta, [
                        'reference' => ($meta['reference'] ?? null) ?: ('bulk_' . ($meta['campaign_id'] ?? 'sms') . '_' . $chunkIndex),
                    ]),
                ));
            } catch (\Throwable $e) {
                $anyProviderFailure = true;
                $lastError = $e->getMessage();
                Log::error('SMS bulk provider exception', ['error' => $e->getMessage(), 'chunk' => $chunkIndex]);

                foreach ($chunk as $phone) {
                    $fail = SmsResult::fail($e->getMessage());
                    $byRecipient[$phone] = $fail;
                    $logs[$phone]->update([
                        'status' => 'failed',
                        'error'  => $e->getMessage(),
                    ]);
                }

                continue;
            }

            $rawChunks[] = $result->raw;
            if (! $result->success) {
                $anyProviderFailure = true;
                $lastError = $result->error;
            }

            foreach ($chunk as $phone) {
                $per = $result->byRecipient[$phone] ?? SmsResult::fail($result->error ?? 'Unknown bulk result');
                $byRecipient[$phone] = $per;
                $logs[$phone]->update([
                    'status'              => $per->success ? 'sent' : 'failed',
                    'provider_message_id' => $per->providerMessageId,
                    'error'               => $per->error,
                ]);
            }
        }

        if ($anyProviderFailure && $byRecipient === $invalid) {
            return SmsBulkResult::fail($lastError ?? 'Bulk SMS failed', $byRecipient, $rawChunks);
        }

        return new SmsBulkResult(
            success: ! $anyProviderFailure,
            byRecipient: $byRecipient,
            error: $anyProviderFailure ? $lastError : null,
            raw: $rawChunks,
        );
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
            baseUrl: (string) ($config['base_url'] ?? 'https://messaging-service.co.tz'),
            senderId: (string) ($config['sender_id'] ?? $this->config->get('sms.from', 'KIBONDO')),
            username: $config['username'] ?? null,
            password: $config['password'] ?? null,
            apiKey: $config['api_key'] ?? null,
            bearerToken: $config['bearer_token'] ?? null,
            sandbox: (bool) ($config['sandbox'] ?? false),
        );
    }
}
