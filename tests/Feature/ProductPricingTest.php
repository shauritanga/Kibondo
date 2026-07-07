<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductPricingTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_product_with_sale_price(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $category = Category::factory()->create();

        $this->postJson('/api/v1/products', [
            'category_id' => $category->id,
            'name' => 'Avocado Pack',
            'unit' => 'pack',
            'price' => 10000,
            'sale_price' => 8000,
            'stock_qty' => 10,
            'min_stock' => 2,
        ])->assertCreated()
            ->assertJsonPath('data.price', 10000)
            ->assertJsonPath('data.sale_price', 8000);
    }

    public function test_sale_price_must_be_lower_than_regular_price(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $category = Category::factory()->create();

        $this->postJson('/api/v1/products', [
            'category_id' => $category->id,
            'name' => 'Avocado Pack',
            'unit' => 'pack',
            'price' => 10000,
            'sale_price' => 10000,
            'stock_qty' => 10,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['sale_price']);
    }

    public function test_stock_manager_cannot_update_package_pricing(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'stock_manager']));
        $product = Product::factory()->create(['price' => 10000, 'sale_price' => null]);

        $this->putJson("/api/v1/products/{$product->id}", [
            'price' => 9000,
            'sale_price' => 7000,
        ])->assertForbidden();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'price' => 10000,
            'sale_price' => null,
        ]);
    }
}
