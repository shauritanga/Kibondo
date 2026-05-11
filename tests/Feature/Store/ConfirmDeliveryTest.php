<?php

namespace Tests\Feature\Store;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConfirmDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private function placeOrder(Customer $customer, Product $product): Sale
    {
        $this->actingAs($customer, 'customer')
            ->postJson('/api/v1/store/orders', [
                'delivery_address' => '123 Main St',
                'items'            => [['product_id' => $product->id, 'quantity' => 1]],
            ]);

        return Sale::where('customer_id', $customer->id)->latest()->first();
    }

    public function test_customer_can_confirm_delivery_with_feedback(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['stock_qty' => 10]);
        $sale     = $this->placeOrder($customer, $product);
        $sale->update(['status' => 'completed']);

        $this->actingAs($customer, 'customer')
            ->postJson("/api/v1/store/orders/{$sale->id}/confirm", [
                'feedback' => 'Great service!',
            ])->assertOk()
              ->assertJsonPath('message', 'Thank you for confirming your delivery!');

        $this->assertDatabaseHas('sales', [
            'id'               => $sale->id,
            'customer_feedback' => 'Great service!',
        ]);
        $this->assertNotNull($sale->fresh()->delivery_confirmed_at);
    }

    public function test_customer_can_confirm_without_feedback(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['stock_qty' => 10]);
        $sale     = $this->placeOrder($customer, $product);
        $sale->update(['status' => 'completed']);

        $this->actingAs($customer, 'customer')
            ->postJson("/api/v1/store/orders/{$sale->id}/confirm", [])
            ->assertOk();
    }

    public function test_cannot_confirm_pending_order(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['stock_qty' => 10]);
        $sale     = $this->placeOrder($customer, $product);

        $this->actingAs($customer, 'customer')
            ->postJson("/api/v1/store/orders/{$sale->id}/confirm")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Order is not yet delivered.');
    }

    public function test_cannot_confirm_twice(): void
    {
        $customer = Customer::factory()->create();
        $product  = Product::factory()->create(['stock_qty' => 10]);
        $sale     = $this->placeOrder($customer, $product);
        $sale->update(['status' => 'completed', 'delivery_confirmed_at' => now()]);

        $this->actingAs($customer, 'customer')
            ->postJson("/api/v1/store/orders/{$sale->id}/confirm")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Delivery already confirmed.');
    }

    public function test_cannot_confirm_another_customers_order(): void
    {
        $customerA = Customer::factory()->create();
        $customerB = Customer::factory()->create();
        $product   = Product::factory()->create(['stock_qty' => 10]);
        $sale      = $this->placeOrder($customerA, $product);
        $sale->update(['status' => 'completed']);

        $this->actingAs($customerB, 'customer')
            ->postJson("/api/v1/store/orders/{$sale->id}/confirm")
            ->assertForbidden();
    }
}
