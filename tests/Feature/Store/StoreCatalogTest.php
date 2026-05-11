<?php

namespace Tests\Feature\Store;

use App\Models\Category;
use App\Models\Product;
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
            ->assertJsonStructure(['data' => [['id', 'name', 'unit', 'price', 'stock_qty', 'category_name']]]);
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
}
