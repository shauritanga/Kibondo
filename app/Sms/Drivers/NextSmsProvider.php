<?php

namespace App\Sms\Drivers;

use App\Contracts\Sms\SmsProvider;
use App\Sms\SmsMessage;
use App\Sms\SmsResult;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NextSmsProvider implements SmsProvider
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $senderId,
        private readonly ?string $username = null,
        private readonly ?string $password = null,
        private readonly ?string $apiKey = null,
        private readonly bool $sandbox = false,
    ) {}

    public function send(SmsMessage $message): SmsResult
    {
        $from = $message->from ?: $this->senderId;
        $url = rtrim($this->baseUrl, '/') . '/api/sms/v2/text/single';

        $payload = [
            'from' => $from,
            'to'   => $message->to,
            'text' => $message->body,
        ];

        try {
            $request = Http::acceptJson()
                ->asJson()
                ->timeout(30);

            if ($this->apiKey) {
                $request = $request->withHeaders([
                    'Authorization' => 'Basic ' . $this->apiKey,
                ]);
            } else {
                $request = $request->withBasicAuth(
                    (string) $this->username,
                    (string) $this->password
                );
            }

            if ($this->sandbox) {
                // NextSMS test mode is typically indicated via credentials / sandbox account;
                // keep flag available for future endpoint switches.
                $request = $request->withHeaders(['X-Sandbox' => 'true']);
            }

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
                ?? ('HTTP ' . $response->status());

            Log::warning('NextSMS send failed', [
                'status' => $response->status(),
                'body'   => $json,
                'to'     => $message->to,
            ]);

            return SmsResult::fail((string) $error, $json);
        } catch (\Throwable $e) {
            Log::error('NextSMS exception', ['error' => $e->getMessage(), 'to' => $message->to]);

            return SmsResult::fail($e->getMessage());
        }
    }
}
