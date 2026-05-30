<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Sale;
use App\Models\User;
use App\Notifications\OrderAssignedNotification;
use App\Notifications\OrderCancelledNotification;
use App\Notifications\OrderConfirmedNotification;
use App\Notifications\OrderDeliveredNotification;
use App\Notifications\OrderPlacedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OrderNotificationCopyTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_order_sms_copy_is_clear_and_does_not_repeat_sender_name(): void
    {
        $customer = Customer::factory()->create();
        $sale = $this->sale(['customer_id' => $customer->id, 'sale_number' => 'ORD-00009']);

        $this->assertSame(
            'Dear customer, your order ORD-00009 has been confirmed. We will notify you when it is out for delivery.',
            (new OrderConfirmedNotification($sale))->toSms($customer)->content,
        );

        $this->assertSame(
            'Dear customer, your order ORD-00009 is out for delivery. Please keep your phone nearby.',
            (new OrderAssignedNotification($sale, 'customer'))->toSms($customer)->content,
        );

        $this->assertSame(
            'Dear customer, your order ORD-00009 has been delivered. Please confirm receipt in your account. Thank you.',
            (new OrderDeliveredNotification($sale))->toSms($customer)->content,
        );

        $this->assertSame(
            'Dear customer, your order ORD-00009 has been cancelled.',
            (new OrderCancelledNotification($sale))->toSms($customer)->content,
        );
    }

    public function test_guest_delivered_sms_does_not_ask_for_account_confirmation(): void
    {
        $sale = $this->sale([
            'customer_id' => null,
            'guest_name' => 'Walk In Buyer',
            'guest_phone' => '+255 700 000 001',
            'sale_number' => 'ORD-00010',
        ]);

        $this->assertSame(
            'Dear customer, your order ORD-00010 has been delivered. Thank you for shopping with us.',
            (new OrderDeliveredNotification($sale))->toSms((object) [])->content,
        );
    }

    public function test_customer_out_for_delivery_email_renders_with_customer_name(): void
    {
        $customer = Customer::factory()->create(['name' => 'Asha Buyer']);
        $driver = $this->user('delivery');
        $sale = $this->sale([
            'customer_id' => $customer->id,
            'assigned_to' => $driver->id,
            'delivery_address' => 'Kigoma',
            'sale_number' => 'ORD-00011',
        ])->load('assignedTo');

        $html = (new OrderAssignedNotification($sale, 'customer'))->toMail($customer)->render();

        $this->assertStringContainsString('Hello Asha Buyer,', $html);
        $this->assertStringContainsString('ORD-00011', $html);
    }

    public function test_admin_new_order_notification_includes_sms_copy(): void
    {
        $admin = $this->user('admin');
        $sale = $this->sale(['sale_number' => 'ORD-00012']);
        $notification = new OrderPlacedNotification($sale);

        $this->assertContains('sms', $notification->via($admin));
        $this->assertSame(
            'New order ORD-00012 has been placed. Please review it in the admin dashboard.',
            $notification->toSms($admin)->content,
        );
    }

    public function test_delivery_assignment_notification_includes_sms_for_driver(): void
    {
        $driver = $this->user('delivery');
        $sale = $this->sale(['sale_number' => 'ORD-00013', 'assigned_to' => $driver->id]);
        $notification = new OrderAssignedNotification($sale, 'delivery');

        $this->assertContains('sms', $notification->via($driver));
        $this->assertSame(
            'New delivery assignment ORD-00013.',
            $notification->toSms($driver)->content,
        );
    }

    private function user(string $role): User
    {
        return User::create([
            'name' => ucfirst($role) . ' User',
            'email' => $role . '@example.com',
            'password' => Hash::make('password'),
            'role' => $role,
            'is_active' => true,
        ]);
    }

    private function sale(array $overrides = []): Sale
    {
        return Sale::create(array_merge([
            'sale_number' => 'ORD-00001',
            'subtotal' => 10000,
            'discount_amount' => 0,
            'total_amount' => 10000,
            'paid_amount' => 0,
            'outstanding' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
        ], $overrides));
    }
}
