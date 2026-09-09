<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Sale;
use App\Models\Setting;
use App\Models\SmsMessageLog;
use App\Models\User;
use App\Notifications\OrderConfirmedNotification;
use App\Notifications\StaffLoginOtpNotification;
use App\Services\OtpService;
use App\Services\SmsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SmsIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_sms_service_logs_message_with_log_driver(): void
    {
        config(['sms.default' => 'log']);
        Setting::set('sms_enabled', '1');

        $result = app(SmsService::class)->send('0712345678', 'Hello Kibondo', ['type' => 'test']);

        $this->assertTrue($result->success);
        $this->assertDatabaseHas('sms_messages', [
            'to'     => '255712345678',
            'status' => 'sent',
            'body'   => 'Hello Kibondo',
        ]);
    }

    public function test_sms_disabled_skips_send(): void
    {
        config(['sms.default' => 'log']);
        Setting::set('sms_enabled', '0');

        $result = app(SmsService::class)->send('0712345678', 'Should not send');

        $this->assertFalse($result->success);
        $this->assertSame(0, SmsMessageLog::count());
    }

    public function test_staff_otp_uses_sms_when_phone_present(): void
    {
        Notification::fake();
        Setting::set('require_2fa_for_admins', '1');

        User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'phone' => '255712345678',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('otp_required', true);

        Notification::assertSentTo(
            User::where('email', 'admin@example.com')->first(),
            StaffLoginOtpNotification::class,
            function (StaffLoginOtpNotification $notification, array $channels) {
                return in_array('sms', $channels, true);
            }
        );
    }

    public function test_guest_order_confirm_routes_sms_without_email(): void
    {
        Notification::fake();

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin2@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $sale = Sale::create([
            'id'           => (string) Str::uuid(),
            'sale_number'  => 'S-TEST-001',
            'customer_id'  => null,
            'guest_name'   => 'Walk-in',
            'guest_phone'  => '0712345678',
            'guest_email'  => null,
            'user_id'      => $admin->id,
            'status'       => 'pending',
            'subtotal'     => 1000,
            'total_amount' => 1000,
            'outstanding'  => 1000,
            'payment_status' => 'unpaid',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/sales/{$sale->id}/confirm")
            ->assertOk();

        Notification::assertSentOnDemand(OrderConfirmedNotification::class);
    }

    public function test_campaign_sms_preview_respects_opt_in(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin3@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        Customer::factory()->create([
            'phone' => '255711111111',
            'sms_marketing_opt_in' => true,
            'type' => 'retail',
        ]);
        Customer::factory()->create([
            'phone' => '255722222222',
            'sms_marketing_opt_in' => false,
            'type' => 'retail',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/campaigns/recipient-preview?all=1&channel=sms')
            ->assertOk()
            ->assertJson(['count' => 1]);
    }

    public function test_customer_can_verify_phone_with_otp(): void
    {
        config(['sms.default' => 'log']);
        Setting::set('sms_enabled', '1');

        $customer = Customer::factory()->create([
            'phone' => '255733333333',
            'phone_verified_at' => null,
            'password' => Hash::make('password123'),
        ]);

        $this->actingAs($customer, 'customer');

        $issued = app(OtpService::class)->issueForKey('customer_phone_verify', '255733333333', [
            'customer_id' => $customer->id,
        ]);

        $this->postJson('/api/v1/store/auth/phone/verify', ['code' => $issued['code']])
            ->assertOk()
            ->assertJsonPath('message', 'Phone verified successfully.');

        $this->assertNotNull($customer->fresh()->phone_verified_at);
    }
}
