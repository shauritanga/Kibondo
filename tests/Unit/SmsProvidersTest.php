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

    public function test_nextsms_provider_posts_payload_with_basic_auth(): void
    {
        Http::fake([
            'messaging-service.co.tz/*' => Http::response([
                'messages' => [['messageId' => 'msg-1']],
            ], 200),
        ]);

        $provider = new NextSmsProvider(
            baseUrl: 'https://messaging-service.co.tz',
            senderId: 'KIBONDO',
            apiKey: 'YnJhaW5hcnQxNjo4ZXZCQDdTeUtOQ3dFWjY=',
        );

        $result = $provider->send(new SmsMessage(to: '255712345678', body: 'Test', from: 'KIBONDO'));

        $this->assertTrue($result->success);
        $this->assertSame('msg-1', $result->providerMessageId);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://messaging-service.co.tz/api/sms/v2/text/single'
                && $request->hasHeader('Authorization', 'Basic YnJhaW5hcnQxNjo4ZXZCQDdTeUtOQ3dFWjY=')
                && $request['to'] === '255712345678'
                && $request['text'] === 'Test'
                && $request['from'] === 'KIBONDO';
        });
    }

    public function test_nextsms_provider_uses_bearer_token_when_set(): void
    {
        Http::fake([
            'messaging-service.co.tz/*' => Http::response([
                'messages' => [['messageId' => 'msg-2']],
            ], 200),
        ]);

        $provider = new NextSmsProvider(
            baseUrl: 'https://messaging-service.co.tz',
            senderId: 'KIBONDO',
            bearerToken: 'cedcce9becad866f59beac1fd5a235bc',
        );

        $result = $provider->send(new SmsMessage(to: '255712345678', body: 'Test'));

        $this->assertTrue($result->success);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://messaging-service.co.tz/api/sms/v2/text/single'
                && $request->hasHeader('Authorization', 'Bearer cedcce9becad866f59beac1fd5a235bc');
        });
    }

    public function test_nextsms_sandbox_uses_test_endpoint(): void
    {
        Http::fake([
            'messaging-service.co.tz/*' => Http::response([
                'messages' => [['messageId' => 'test-1']],
            ], 200),
        ]);

        $provider = new NextSmsProvider(
            baseUrl: 'https://messaging-service.co.tz',
            senderId: 'KIBONDO',
            bearerToken: 'token',
            sandbox: true,
        );

        $provider->send(new SmsMessage(to: '255712345678', body: 'Test'));

        Http::assertSent(fn ($request) => $request->url() === 'https://messaging-service.co.tz/api/sms/v2/test/text/single');
    }

    public function test_nextsms_provider_handles_failure(): void
    {
        Http::fake([
            'messaging-service.co.tz/*' => Http::response(['message' => 'Insufficient balance'], 402),
        ]);

        $provider = new NextSmsProvider(
            baseUrl: 'https://messaging-service.co.tz',
            senderId: 'KIBONDO',
            username: 'user',
            password: 'secret',
        );

        $result = $provider->send(new SmsMessage(to: '255712345678', body: 'Test'));

        $this->assertFalse($result->success);
        $this->assertStringContainsString('Insufficient balance', (string) $result->error);
    }
}
