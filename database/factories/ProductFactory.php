<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'name'        => $this->faker->unique()->words(2, true),
            'unit'        => $this->faker->randomElement(['crate', 'kg', 'box', 'litre', 'piece']),
            'price'       => $this->faker->numberBetween(1000, 50000),
            'cost_price'  => $this->faker->numberBetween(500, 10000),
            'stock_qty'   => 100,
            'min_stock'   => 5,
            'is_active'   => true,
        ];
    }

    public function outOfStock(): static
    {
        return $this->state(['stock_qty' => 0]);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
