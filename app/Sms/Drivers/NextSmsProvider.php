<?php

namespace App\Sms\Drivers;

use App\Contracts\Sms\SmsProvider;
use App\Sms\SmsBulkMessage;
use App\Sms\SmsBulkResult;
use App\Sms\SmsMessage;
use App\Sms\SmsResult;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NextSmsProvider implements SmsProvider
{
    /** Status groupIds that mean the message was rejected/failed at submit time. */
    private const FAIL_GROUPS = [19, 22]; // REJECTED, FAILED

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
        $bulk = $this->sendMany(new SmsBulkMessage(
            to: [$message->to],
            body: $message->body,
            from: $message->from,
            meta: $message->meta,
        ));

        $per = $bulk->byRecipient[$message->to] ?? null;

        if ($per) {
            return $per;
        }

        return $bulk->success
            ? SmsResult::ok(null, $bulk->raw)
            : SmsResult::fail($bulk->error ?? 'SMS send failed', $bulk->raw);
    }

    public function sendMany(SmsBulkMessage $message): SmsBulkResult
    {
        if ($message->to === []) {
            return SmsBulkResult::fail('No recipients');
        }

        $from = $message->from ?: $this->senderId;
        $path = $this->sandbox
            ? '/api/sms/v2/test/text/single'
            : '/api/sms/v2/text/single';
        $url = rtrim($this->baseUrl, '/') . $path;

        $to = count($message->to) === 1 ? $message->to[0] : array_values($message->to);

        $payload = [
            'from' => $from,
            'to'   => $to,
            'text' => $message->body,
        ];

        if (! empty($message->meta['reference'])) {
            $payload['reference'] = (string) $message->meta['reference'];
        }

        try {
            $response = Http::acceptJson()
                ->asJson()
                ->timeout(60)
                ->withHeaders($this->authHeaders())
                ->post($url, $payload);

            $json = $response->json();

            if (! $response->successful()) {
                $error = data_get($json, 'message')
                    ?? data_get($json, 'error')
                    ?? ('HTTP ' . $response->status());

                Log::warning('NextSMS bulk send failed', [
                    'status' => $response->status(),
                    'url'    => $url,
                    'count'  => count($message->to),
                    'body'   => $json ?? $response->body(),
                ]);

                return SmsBulkResult::fail(
                    (string) $error,
                    $this->failAll($message->to, (string) $error, $json),
                    $json
                );
            }

            return SmsBulkResult::ok(
                $this->mapRecipientResults($message->to, is_array($json) ? $json : []),
                $json
            );
        } catch (\Throwable $e) {
            Log::error('NextSMS bulk exception', [
                'error' => $e->getMessage(),
                'url'   => $url,
                'count' => count($message->to),
            ]);

            return SmsBulkResult::fail(
                $e->getMessage(),
                $this->failAll($message->to, $e->getMessage()),
            );
        }
    }

    /**
     * @param  list<string>  $phones
     * @return array<string, SmsResult>
     */
    private function mapRecipientResults(array $phones, array $json): array
    {
        $messages = data_get($json, 'messages', []);
        $byPhone = [];

        if (is_array($messages)) {
            foreach ($messages as $index => $row) {
                if (! is_array($row)) {
                    continue;
                }

                $to = isset($row['to']) ? (string) $row['to'] : ($phones[$index] ?? null);
                if (! $to && count($phones) === 1 && count($messages) === 1) {
                    $to = $phones[0];
                }
                if (! $to) {
                    continue;
                }

                $groupId = (int) data_get($row, 'status.groupId', 0);
                $messageId = data_get($row, 'messageId');
                $desc = data_get($row, 'status.description')
                    ?? data_get($row, 'status.name');

                if (in_array($groupId, self::FAIL_GROUPS, true)) {
                    $byPhone[$to] = SmsResult::fail((string) ($desc ?: 'Rejected'), $row);
                } else {
                    $byPhone[$to] = SmsResult::ok(
                        $messageId !== null ? (string) $messageId : null,
                        $row
                    );
                }
            }
        }

        foreach ($phones as $phone) {
            if (! isset($byPhone[$phone])) {
                $byPhone[$phone] = SmsResult::ok(null, ['assumed' => true]);
            }
        }

        return $byPhone;
    }

    /**
     * @param  list<string>  $phones
     * @return array<string, SmsResult>
     */
    private function failAll(array $phones, string $error, mixed $raw = null): array
    {
        $out = [];
        foreach ($phones as $phone) {
            $out[$phone] = SmsResult::fail($error, $raw);
        }

        return $out;
    }

    /**
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
