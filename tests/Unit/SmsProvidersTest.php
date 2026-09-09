<?php

namespace Tests\Unit;

use App\Sms\Drivers\LogSmsProvider;
use App\Sms\Drivers\NextSmsProvider;
use App\Sms\SmsMessage;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SmsProvidersTest extends TestCase
{
    public function test_log_provider_succeeds(): void
    {
        $provider = new LogSmsProvider;
        $result = $provider->send(new SmsMessage(to: '255712345678', body: 'Hello'));

        $this->assertTrue($result->success);
        $this->assertNotNull($result->providerMessageId);
    }

    public function test_nextsms_provider_posts_payload(): void
    {
        Http::fake([
            'api.nextsms.co.tz/*' => Http::response([
                'messages' => [['messageId' => 'msg-1']],
            ], 200),
        ]);

        $provider = new NextSmsProvider(
            baseUrl: 'https://api.nextsms.co.tz',
            senderId: 'KIBONDO',
            username: 'user',
            password: 'secret',
        );

        $result = $provider->send(new SmsMessage(to: '255712345678', body: 'Test', from: 'KIBONDO'));

        $this->assertTrue($result->success);
        $this->assertSame('msg-1', $result->providerMessageId);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api.nextsms.co.tz/api/sms/v2/text/single'
                && $request['to'] === '255712345678'
                && $request['text'] === 'Test'
                && $request['from'] === 'KIBONDO';
        });
    }

    public function test_nextsms_provider_handles_failure(): void
    {
        Http::fake([
            'api.nextsms.co.tz/*' => Http::response(['message' => 'Insufficient balance'], 402),
        ]);

        $provider = new NextSmsProvider(
            baseUrl: 'https://api.nextsms.co.tz',
            senderId: 'KIBONDO',
            username: 'user',
            password: 'secret',
        );

        $result = $provider->send(new SmsMessage(to: '255712345678', body: 'Test'));

        $this->assertFalse($result->success);
        $this->assertStringContainsString('Insufficient balance', (string) $result->error);
    }
}
