<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class UnitxtSmsClient implements SmsClient
{
    public function send(string $to, string $message): SmsResult
    {
        $baseUrl = rtrim((string) config('services.unitxt.base_url'), '/');
        $endpoint = (string) config('services.unitxt.endpoint', '/api/v3/sms/send');
        $apiKey = (string) config('services.unitxt.api_key');
        $senderId = (string) config('services.unitxt.sender_id');

        if ($baseUrl === '' || $apiKey === '' || $senderId === '') {
            throw new RuntimeException('Unitxt SMS is not configured.');
        }

        $response = Http::acceptJson()
            ->asJson()
            ->timeout((int) config('services.unitxt.timeout', 10))
            ->retry((int) config('services.unitxt.retries', 1), 250)
            ->withToken($apiKey)
            ->post($baseUrl . '/' . ltrim($endpoint, '/'), [
                'recipient' => ltrim($to, '+'),
                'sender_id' => $senderId,
                'type' => 'plain',
                'message' => $message,
            ]);

        $json = $response->json();
        $raw = is_array($json) ? $json : ['body' => $response->body()];
        $providerStatus = strtolower((string) data_get($raw, 'status', 'sent'));

        if ($response->successful() && ! in_array($providerStatus, ['error', 'failed', 'rejected'], true)) {
            return new SmsResult(
                successful: true,
                providerMessageId: (string) data_get($raw, 'message_id', data_get($raw, 'id')),
                status: (string) data_get($raw, 'status', 'sent'),
                raw: $raw,
            );
        }

        return new SmsResult(
            successful: false,
            status: (string) data_get($raw, 'status', $response->status()),
            error: (string) data_get($raw, 'message', data_get($raw, 'error', 'SMS provider request failed.')),
            raw: $raw,
        );
    }
}
