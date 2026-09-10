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
use App\Notifications\OrderReceivedNotification;
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
            'Kibondo: Order ORD-00009 confirmed. Tunashukuru!',
            (new OrderConfirmedNotification($sale))->toSms($customer),
        );

        $this->assertSame(
            'Kibondo: Order ORD-00009 is out for delivery.',
            (new OrderAssignedNotification($sale, 'customer'))->toSms($customer),
        );

        $this->assertSame(
            'Kibondo: Order ORD-00009 delivered. Please confirm receipt in the app.',
            (new OrderDeliveredNotification($sale))->toSms($customer),
        );

        $this->assertSame(
            'Kibondo: Order ORD-00009 has been cancelled.',
            (new OrderCancelledNotification($sale))->toSms($customer),
        );
    }

    public function test_customer_order_received_sms_copy_includes_order_number(): void
    {
        $customer = Customer::factory()->create();
        $sale = $this->sale(['customer_id' => $customer->id, 'sale_number' => '080626-001']);

        $this->assertSame(
            'Kibondo: Order 080626-001 received. We will confirm delivery soon.',
            (new OrderReceivedNotification($sale))->toSms($customer),
        );
    }

    public function test_customer_email_notification_preference_still_receives_lifecycle_sms(): void
    {
        $customer = Customer::factory()->create(['order_notification_channel' => 'email']);
        $sale = $this->sale(['customer_id' => $customer->id, 'sale_number' => '080626-002']);

        $channels = (new OrderConfirmedNotification($sale))->via($customer);

        $this->assertContains('mail', $channels);
        $this->assertContains('sms', $channels);
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
            'Kibondo: Order ORD-00010 delivered. Asante!',
            (new OrderDeliveredNotification($sale))->toSms((object) []),
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
            'Kibondo: New order ORD-00012 placed. Open POS to review.',
            $notification->toSms($admin),
        );
    }

    public function test_delivery_assignment_notification_includes_sms_for_driver(): void
    {
        $driver = $this->user('delivery');
        $sale = $this->sale(['sale_number' => 'ORD-00013', 'assigned_to' => $driver->id]);
        $notification = new OrderAssignedNotification($sale, 'delivery');

        $this->assertContains('sms', $notification->via($driver));
        $this->assertSame(
            'Kibondo: Delivery assigned — ORD-00013. Check the app.',
            $notification->toSms($driver),
        );
    }

    private function user(string $role): User
    {
        return User::create([
            'name' => ucfirst($role) . ' User',
            'email' => $role . '@example.com',
            'phone' => '+2557000000' . (['admin' => '10', 'delivery' => '20', 'sales' => '30'][$role] ?? '99'),
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
