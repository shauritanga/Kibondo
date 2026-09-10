<?php

namespace Tests\Feature\Store;

use App\Models\Category;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_can_browse_products(): void
    {
        Product::factory()->count(3)->create();

        $this->getJson('/api/v1/store/products')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'unit', 'price', 'sale_price', 'active_price', 'stock_qty', 'category_name']]]);
    }

    public function test_catalog_returns_package_sale_price_as_active_price(): void
    {
        $product = Product::factory()->create([
            'price' => 10000,
            'sale_price' => 8000,
            'stock_qty' => 10,
        ]);

        $this->getJson('/api/v1/store/products')
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->id)
            ->assertJsonPath('data.0.price', 10000)
            ->assertJsonPath('data.0.sale_price', 8000)
            ->assertJsonPath('data.0.active_price', 8000);
    }

    public function test_storewide_promo_setting_no_longer_changes_catalog_price(): void
    {
        Setting::set('promo_percentage', '50');
        Product::factory()->create([
            'price' => 10000,
            'sale_price' => null,
            'stock_qty' => 10,
        ]);

        $this->getJson('/api/v1/store/products')
            ->assertOk()
            ->assertJsonPath('data.0.price', 10000)
            ->assertJsonPath('data.0.sale_price', null)
            ->assertJsonPath('data.0.active_price', 10000);
    }

    public function test_out_of_stock_products_are_excluded(): void
    {
        Product::factory()->create(['name' => 'In Stock']);
        Product::factory()->outOfStock()->create(['name' => 'Out of Stock']);

        $response = $this->getJson('/api/v1/store/products')->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains('In Stock'));
        $this->assertFalse($names->contains('Out of Stock'));
    }

    public function test_inactive_products_are_excluded(): void
    {
        Product::factory()->create(['name' => 'Active']);
        Product::factory()->inactive()->create(['name' => 'Inactive']);

        $response = $this->getJson('/api/v1/store/products')->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Active'));
        $this->assertFalse($names->contains('Inactive'));
    }

    public function test_products_can_be_filtered_by_category(): void
    {
        $cat = Category::factory()->create();
        Product::factory()->create(['name' => 'In Category', 'category_id' => $cat->id]);
        Product::factory()->create(['name' => 'Other Category']);

        $response = $this->getJson("/api/v1/store/products?category_id={$cat->id}")->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains('In Category'));
        $this->assertFalse($names->contains('Other Category'));
    }

    public function test_anyone_can_browse_categories(): void
    {
        Category::factory()->count(3)->create();

        $this->getJson('/api/v1/store/categories')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name']]]);
    }

    public function test_product_unit_is_returned_from_database(): void
    {
        $product = Product::factory()->create(['unit' => 'g', 'stock_qty' => 10]);

        $this->getJson('/api/v1/store/products')
            ->assertOk()
            ->assertJsonPath('data.0.unit', 'g')
            ->assertJsonPath('data.0.id', $product->id);
    }
}
