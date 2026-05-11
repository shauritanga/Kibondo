<?php

namespace Tests\Feature\Store;

use App\Models\Customer;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlaceOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_customer_can_place_order(): void
    {
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
