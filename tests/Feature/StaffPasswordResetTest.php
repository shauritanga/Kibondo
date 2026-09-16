<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\SmsOtpNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use ReflectionClass;
use Tests\TestCase;

class StaffPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_reset_password_with_sms_otp(): void
    {
        Notification::fake();

        $user = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'phone' => '255712345678',
            'password' => Hash::make('oldpassword1'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/auth/forgot-password', [
            'phone' => '+255712345678',
        ])->assertOk()
            ->assertJsonPath('message', 'If an account exists for that phone, a reset code was sent.');

        Notification::assertSentTo($user, SmsOtpNotification::class);

        $notification = Notification::sent($user, SmsOtpNotification::class)->first();
        $code = (new ReflectionClass($notification))->getProperty('otp');
        $code->setAccessible(true);
        $otp = $code->getValue($notification);

        $this->postJson('/api/v1/auth/reset-password', [
            'phone' => '+255712345678',
            'code' => $otp,
            'password' => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ])->assertOk()
            ->assertJsonPath('message', 'Password updated. You can log in now.');

        $this->assertTrue(Hash::check('newpassword1', $user->fresh()->password));
    }

    public function test_forgot_password_does_not_reveal_unknown_phone(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/forgot-password', [
            'phone' => '+255700000099',
        ])->assertOk()
            ->assertJsonPath('message', 'If an account exists for that phone, a reset code was sent.');

        Notification::assertNothingSent();
    }

    public function test_customer_can_reset_password_with_sms_otp(): void
    {
        Notification::fake();

        $customer = \App\Models\Customer::factory()->create([
            'phone' => '255700000001',
            'password' => Hash::make('oldpassword1'),
        ]);

        $this->postJson('/api/v1/store/auth/forgot-password', [
            'phone' => '+255700000001',
        ])->assertOk();

        Notification::assertSentTo($customer, SmsOtpNotification::class);

        $notification = Notification::sent($customer, SmsOtpNotification::class)->first();
        $prop = (new ReflectionClass($notification))->getProperty('otp');
        $prop->setAccessible(true);
        $otp = $prop->getValue($notification);

        $this->postJson('/api/v1/store/auth/reset-password', [
            'phone' => '+255700000001',
            'code' => $otp,
            'password' => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ])->assertOk();

        $this->assertTrue(Hash::check('newpassword1', $customer->fresh()->password));
    }
}
