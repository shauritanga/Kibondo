<?php

namespace Tests\Feature\Store;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Setting;
use App\Notifications\CustomerOrderReceivedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PlaceOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_customer_can_place_order(): void
    {
        Notification::fake();

        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['price' => 5000, 'stock_qty' => 10]);

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St, Dar es Salaam',
                'items'            => [['product_id' => $product->id, 'quantity' => 2]],
            ])
            ->assertStatus(201)
            ->assertJsonStructure(['sale_number', 'total_amount', 'message']);

        $this->assertDatabaseHas('sales', [
            'customer_id' => $customer->id,
            'status'      => 'pending',
            'total_amount' => 10000,
        ]);

        Notification::assertSentTo(
            $customer,
            CustomerOrderReceivedNotification::class,
            fn (CustomerOrderReceivedNotification $notification, array $channels) => $channels === ['sms']
                && str_contains($notification->toSms($customer)->content, 'tumepokea order yako')
        );
    }

    public function test_guest_customer_receives_order_received_sms(): void
    {
        Notification::fake();

        $product = Product::factory()->create(['price' => 5000, 'stock_qty' => 10]);

        $this->postJson('/api/v1/store/orders', [
            'guest_name'       => 'Asha Buyer',
            'guest_phone'      => '+255700000001',
            'delivery_address' => '123 Main St, Dar es Salaam',
            'items'            => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertStatus(201);

        Notification::assertSentOnDemand(
            CustomerOrderReceivedNotification::class,
            fn (CustomerOrderReceivedNotification $notification, array $channels, $notifiable) => $channels === ['sms']
                && $notifiable->routeNotificationFor('sms') === '+255700000001'
                && str_contains($notification->toSms($notifiable)->content, 'tumepokea order yako')
        );
    }

    public function test_order_number_uses_daily_date_prefix_and_sequence(): void
    {
        Notification::fake();

        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['price' => 5000, 'stock_qty' => 10]);

        $this->travelTo(now(config('app.timezone'))->setDate(2026, 6, 8)->setTime(9, 0));

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertStatus(201)
            ->assertJsonPath('sale_number', '080626-001');

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertStatus(201)
            ->assertJsonPath('sale_number', '080626-002');

        $this->travelTo(now(config('app.timezone'))->setDate(2026, 6, 9)->setTime(9, 0));

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertStatus(201)
            ->assertJsonPath('sale_number', '090626-001');
    }

    public function test_order_number_sequence_includes_soft_deleted_sales(): void
    {
        Notification::fake();

        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['price' => 5000, 'stock_qty' => 10]);

        $this->travelTo(now(config('app.timezone'))->setDate(2026, 6, 8)->setTime(9, 0));

        $deletedSale = Sale::create([
            'sale_number'     => '080626-001',
            'subtotal'        => 10000,
            'discount_amount' => 0,
            'total_amount'    => 10000,
            'paid_amount'     => 0,
            'outstanding'     => 10000,
            'status'          => 'pending',
            'payment_status'  => 'unpaid',
        ]);
        $deletedSale->delete();

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertStatus(201)
            ->assertJsonPath('sale_number', '080626-002');
    }

    public function test_unauthenticated_customer_cannot_place_order(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/v1/store/orders', [
            'delivery_address' => '123 Main St',
            'items'            => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertUnauthorized();
    }

    public function test_order_uses_server_side_price(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['price' => 5000, 'stock_qty' => 10]);

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ])->assertStatus(201);

        $this->assertDatabaseHas('sale_items', [
            'product_id' => $product->id,
            'unit_price' => 5000,
        ]);
    }

    public function test_order_uses_package_sale_price(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['price' => 5000, 'sale_price' => 4000, 'stock_qty' => 10]);

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 2]],
            ])->assertStatus(201);

        $this->assertDatabaseHas('sale_items', [
            'product_id' => $product->id,
            'unit_price' => 4000,
            'line_total' => 8000,
        ]);

        $this->assertDatabaseHas('sales', [
            'customer_id' => $customer->id,
            'subtotal' => 8000,
            'total_amount' => 8000,
        ]);
    }

    public function test_storewide_promo_setting_no_longer_changes_order_price(): void
    {
        Setting::set('promo_percentage', '50');
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['price' => 5000, 'stock_qty' => 10]);

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ])->assertStatus(201);

        $this->assertDatabaseHas('sale_items', [
            'product_id' => $product->id,
            'unit_price' => 5000,
        ]);
    }

    public function test_cannot_order_out_of_stock_product(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->outOfStock()->create();

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ])->assertUnprocessable()
              ->assertJsonPath('errors.items.0', fn ($msg) => str_contains($msg, 'out of stock'));
    }

    public function test_cannot_order_more_than_available_stock(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['stock_qty' => 2]);

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 10]],
            ])->assertUnprocessable();
    }

    public function test_order_requires_delivery_address(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create();

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ])->assertUnprocessable()
              ->assertJsonValidationErrors(['delivery_address']);
    }

    public function test_customer_can_view_own_orders(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['stock_qty' => 10]);

        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ]);

        $this->actingAs($customer, 'customer')
            ->getJson('/api/v1/store/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_customer_cannot_view_another_customers_order(): void
    {
        $customerA = Customer::factory()->create();
        $customerB = Customer::factory()->create();
        $product   = Product::factory()->create(['stock_qty' => 10]);

        $response = $this->actingAs($customerA, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ]);

        $saleId = \App\Models\Sale::where('customer_id', $customerA->id)->first()->id;

        $this->actingAs($customerB, 'customer')
            ->getJson("/api/v1/store/orders/{$saleId}")
            ->assertForbidden();
    }
}
