<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $fresh = DB::table('categories')->where('name', 'Fresh Produce')->value('id');
        $frozen = DB::table('categories')->where('name', 'Frozen')->value('id');
        $fruit = DB::table('categories')->where('name', 'Fruit')->value('id');

        $products = [
            ['category_id' => $fresh, 'name' => 'Fresh Avocado (Grade A)', 'unit' => 'crate', 'price' => 85000, 'cost_price' => 55000, 'stock_qty' => 120, 'min_stock' => 20],
            ['category_id' => $fresh, 'name' => 'Fresh Avocado (Grade B)', 'unit' => 'crate', 'price' => 60000, 'cost_price' => 38000, 'stock_qty' => 80, 'min_stock' => 15],
            ['category_id' => $frozen, 'name' => 'Frozen Avocado Halves', 'unit' => 'box', 'price' => 120000, 'cost_price' => 80000, 'stock_qty' => 45, 'min_stock' => 10],
            ['category_id' => $frozen, 'name' => 'Frozen Avocado Pulp', 'unit' => 'box', 'price' => 95000, 'cost_price' => 62000, 'stock_qty' => 30, 'min_stock' => 8],
            ['category_id' => $fruit, 'name' => 'Apple (Fuji)', 'unit' => 'box', 'price' => 75000, 'cost_price' => 48000, 'stock_qty' => 60, 'min_stock' => 12],
            ['category_id' => $fruit, 'name' => 'Apple (Royal Gala)', 'unit' => 'box', 'price' => 80000, 'cost_price' => 52000, 'stock_qty' => 40, 'min_stock' => 10],
        ];

        foreach ($products as $product) {
            DB::table('products')->insertOrIgnore(array_merge($product, [
                'id' => Str::uuid(),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
