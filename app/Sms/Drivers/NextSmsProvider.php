<?php

namespace App\Sms\Drivers;

use App\Contracts\Sms\SmsProvider;
use App\Sms\SmsMessage;
use App\Sms\SmsResult;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NextSmsProvider implements SmsProvider
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $senderId,
        private readonly ?string $username = null,
        private readonly ?string $password = null,
        private readonly ?string $apiKey = null,
        private readonly ?string $bearerToken = null,
        private readonly bool $sandbox = false,
    ) {}

    public function send(SmsMessage $message): SmsResult
    {
        $from = $message->from ?: $this->senderId;
        $path = $this->sandbox
            ? '/api/sms/v2/test/text/single'
            : '/api/sms/v2/text/single';
        $url = rtrim($this->baseUrl, '/') . $path;

        $payload = [
            'from' => $from,
            'to'   => $message->to,
            'text' => $message->body,
        ];

        if (! empty($message->meta['reference'])) {
            $payload['reference'] = (string) $message->meta['reference'];
        }

        try {
            $request = Http::acceptJson()
                ->asJson()
                ->timeout(30)
                ->withHeaders($this->authHeaders());

            $response = $request->post($url, $payload);
            $json = $response->json();

            if ($response->successful()) {
                $messageId = data_get($json, 'messages.0.messageId')
                    ?? data_get($json, 'messageId')
                    ?? data_get($json, 'messages.0.message_id');

                return SmsResult::ok(
                    $messageId !== null ? (string) $messageId : null,
                    $json
                );
            }

            $error = data_get($json, 'message')
                ?? data_get($json, 'error')
                ?? data_get($json, 'messages.0.status.description')
                ?? ('HTTP ' . $response->status());

            Log::warning('NextSMS send failed', [
                'status' => $response->status(),
                'url'    => $url,
                'body'   => $json ?? $response->body(),
                'to'     => $message->to,
            ]);

            return SmsResult::fail((string) $error, $json);
        } catch (\Throwable $e) {
            Log::error('NextSMS exception', [
                'error' => $e->getMessage(),
                'url'   => $url,
                'to'    => $message->to,
            ]);

            return SmsResult::fail($e->getMessage());
        }
    }

    /**
     * Prefer Bearer token (Messaging Service API V2 recommended).
     * Fall back to Basic with pre-encoded key, then username:password.
     *
     * @return array<string, string>
     */
    private function authHeaders(): array
    {
        if ($this->bearerToken) {
            $token = $this->stripScheme($this->bearerToken, 'Bearer');

            return ['Authorization' => 'Bearer ' . $token];
        }

        if ($this->apiKey) {
            $key = $this->stripScheme($this->apiKey, 'Basic');

            // Accept either raw base64 or already "username:password"
            if (str_contains($key, ':') && ! $this->looksLikeBase64($key)) {
                $key = base64_encode($key);
            }

            return ['Authorization' => 'Basic ' . $key];
        }

        if ($this->username && $this->password) {
            return [
                'Authorization' => 'Basic ' . base64_encode($this->username . ':' . $this->password),
            ];
        }

        return [];
    }

    private function stripScheme(string $value, string $scheme): string
    {
        $prefix = $scheme . ' ';

        return Str::startsWith($value, $prefix)
            ? substr($value, strlen($prefix))
            : $value;
    }

    private function looksLikeBase64(string $value): bool
    {
        return (bool) preg_match('/^[A-Za-z0-9+\/=]+$/', $value);
    }
}
