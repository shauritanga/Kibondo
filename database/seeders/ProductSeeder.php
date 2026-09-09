<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::query()->pluck('id', 'name');

        $products = [
            [
                'category' => 'Fresh Avocados',
                'name' => 'Hass Avocado',
                'description' => 'Creamy Hass avocados from Kibondo Green Farm. Rich flavour, high oil content, and ready for salads, toast, or guacamole.',
                'key_benefits' => "Naturally creamy texture\nHigh in healthy fats\nHarvested in Kibondo, Kigoma",
                'ingredients' => '100% fresh Hass avocado',
                'nutrition_info' => 'Per 100g: Energy 160 kcal · Fat 15g · Fibre 7g · Potassium 485mg',
                'packaging_details' => 'Sold by the kilogram. Fruit graded for size and ripeness.',
                'storage_instructions' => 'Keep at room temperature until ripe, then refrigerate and use within 3–5 days.',
                'image_url' => 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578',
                'unit' => 'kg',
                'price' => 4500,
                'cost_price' => 2500,
                'stock_qty' => 80,
                'min_stock' => 10,
            ],
            [
                'category' => 'Fresh Avocados',
                'name' => 'Fuerte Avocado',
                'description' => 'Smooth-skinned Fuerte avocados with a lighter, nutty taste. Ideal for slicing and everyday cooking.',
                'key_benefits' => "Smooth green skin\nMild, nutty flavour\nGreat for salads and sandwiches",
                'ingredients' => '100% fresh Fuerte avocado',
                'nutrition_info' => 'Per 100g: Energy 140 kcal · Fat 13g · Fibre 6g · Potassium 450mg',
                'packaging_details' => 'Sold by the kilogram.',
                'storage_instructions' => 'Ripen at room temperature. Refrigerate once soft to the touch.',
                'image_url' => 'https://images.unsplash.com/photo-1601039641847-7857b994d704',
                'unit' => 'kg',
                'price' => 4000,
                'cost_price' => 2200,
                'stock_qty' => 65,
                'min_stock' => 10,
            ],
            [
                'category' => 'Fresh Avocados',
                'name' => 'Hass Avocado Crate',
                'description' => 'A full crate of premium Hass avocados for shops, restaurants, and bulk buyers.',
                'key_benefits' => "Bulk crate pricing\nUniform grading\nFarm-direct from Kibondo",
                'ingredients' => '100% fresh Hass avocado',
                'nutrition_info' => 'See Hass Avocado (per 100g).',
                'packaging_details' => 'Wooden crate, approximately 10–12 kg of fruit.',
                'storage_instructions' => 'Store in a cool, dry, well-ventilated area. Do not stack more than two crates high.',
                'image_url' => 'https://images.unsplash.com/photo-1590301157890-4810ed352733',
                'unit' => 'crate',
                'price' => 85000,
                'cost_price' => 52000,
                'stock_qty' => 18,
                'min_stock' => 5,
            ],
            [
                'category' => 'Fresh Avocados',
                'name' => 'Ready-to-Eat Hass',
                'description' => 'Ripe Hass avocados selected for eating today. Perfect for a single serving.',
                'key_benefits' => "Ripe and ready\nHand-selected\nIdeal for one meal",
                'ingredients' => '100% fresh Hass avocado',
                'nutrition_info' => 'Per fruit (~150g): Energy 240 kcal · Fat 22g · Fibre 10g',
                'packaging_details' => 'Sold per piece. Packed to protect ripe fruit in transit.',
                'storage_instructions' => 'Refrigerate immediately and consume within 1–2 days.',
                'image_url' => 'https://images.unsplash.com/photo-1519162808019-7de1683fa2ad',
                'unit' => 'piece',
                'price' => 1500,
                'cost_price' => 700,
                'stock_qty' => 120,
                'min_stock' => 20,
            ],
            [
                'category' => 'Frozen Avocados',
                'name' => 'Frozen Avocado Halves',
                'description' => 'Hass avocado halves, frozen at peak ripeness. Thaw and use in salads, smoothies, or guacamole.',
                'key_benefits' => "Frozen at peak ripeness\nNo additives\nReady when you need them",
                'ingredients' => 'Hass avocado, ascorbic acid (to preserve colour)',
                'nutrition_info' => 'Per 100g: Energy 155 kcal · Fat 14g · Fibre 7g',
                'packaging_details' => '1 kg box, vacuum-sealed halves.',
                'storage_instructions' => 'Keep frozen at -18°C. Thaw in the refrigerator. Do not refreeze.',
                'image_url' => 'https://images.unsplash.com/photo-1615485925763-86786289165a',
                'unit' => 'box',
                'price' => 18000,
                'cost_price' => 11000,
                'stock_qty' => 40,
                'min_stock' => 8,
            ],
            [
                'category' => 'Frozen Avocados',
                'name' => 'Frozen Avocado Pulp',
                'description' => 'Smooth Hass avocado pulp for sauces, ice cream, and food service. No chunks, no peel.',
                'key_benefits' => "Smooth puree\nSaves prep time\nConsistent quality",
                'ingredients' => 'Hass avocado pulp',
                'nutrition_info' => 'Per 100g: Energy 160 kcal · Fat 15g · Fibre 5g',
                'packaging_details' => 'Sold by the kilogram in sealed freezer bags.',
                'storage_instructions' => 'Keep frozen at -18°C. Thaw overnight in the refrigerator.',
                'image_url' => 'https://images.unsplash.com/photo-1589927986089-35812388d1f4',
                'unit' => 'kg',
                'price' => 6500,
                'cost_price' => 3800,
                'stock_qty' => 55,
                'min_stock' => 10,
            ],
            [
                'category' => 'Frozen Avocados',
                'name' => 'Frozen Avocado Cubes',
                'description' => 'Diced Hass avocado cubes for smoothies and quick cooking. Low stock — popular with cafés.',
                'key_benefits' => "Pre-diced cubes\nBlends easily\nNo waste",
                'ingredients' => 'Hass avocado cubes',
                'nutrition_info' => 'Per 100g: Energy 155 kcal · Fat 14g · Fibre 7g',
                'packaging_details' => '500 g freezer box.',
                'storage_instructions' => 'Keep frozen at -18°C. Use cubes from frozen in smoothies.',
                'image_url' => 'https://images.unsplash.com/photo-1546554137-f86b890a4833',
                'unit' => 'box',
                'price' => 15000,
                'cost_price' => 9000,
                'stock_qty' => 6,
                'min_stock' => 8,
            ],
            [
                'category' => 'Apple',
                'name' => 'Fuji Apple',
                'description' => 'Crisp, sweet Fuji apples. A favourite for snacking and lunch boxes.',
                'key_benefits' => "Naturally sweet\nCrisp bite\nGreat for kids",
                'ingredients' => '100% fresh Fuji apple',
                'nutrition_info' => 'Per 100g: Energy 52 kcal · Carbohydrate 14g · Fibre 2.4g · Vitamin C 4.6mg',
                'packaging_details' => 'Sold by the kilogram.',
                'storage_instructions' => 'Refrigerate for up to 3 weeks. Keep away from avocados to slow ripening.',
                'image_url' => 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6',
                'unit' => 'kg',
                'price' => 5500,
                'cost_price' => 3200,
                'stock_qty' => 70,
                'min_stock' => 12,
            ],
            [
                'category' => 'Apple',
                'name' => 'Granny Smith Apple',
                'description' => 'Tart green Granny Smith apples for baking, juices, and salads.',
                'key_benefits' => "Firm and tart\nHolds shape when baked\nExcellent in salads",
                'ingredients' => '100% fresh Granny Smith apple',
                'nutrition_info' => 'Per 100g: Energy 58 kcal · Carbohydrate 14g · Fibre 2.8g · Vitamin C 8mg',
                'packaging_details' => 'Sold by the kilogram.',
                'storage_instructions' => 'Store in a cool place or refrigerator. Use within 2–3 weeks.',
                'image_url' => 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce',
                'unit' => 'kg',
                'price' => 5000,
                'cost_price' => 2800,
                'stock_qty' => 48,
                'min_stock' => 12,
            ],
            [
                'category' => 'Apple',
                'name' => 'Mixed Apple Box',
                'description' => 'A mixed box of Fuji and Granny Smith apples for households and small shops.',
                'key_benefits' => "Sweet and tart mix\nFamily-size box\nReady to share",
                'ingredients' => 'Fuji apples, Granny Smith apples',
                'nutrition_info' => 'See Fuji Apple and Granny Smith Apple (per 100g).',
                'packaging_details' => '5 kg mixed box.',
                'storage_instructions' => 'Keep refrigerated. Consume within 2 weeks of delivery.',
                'image_url' => 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a',
                'unit' => 'box',
                'price' => 22000,
                'cost_price' => 13000,
                'stock_qty' => 30,
                'min_stock' => 6,
            ],
        ];

        foreach ($products as $row) {
            $categoryId = $categories[$row['category']] ?? null;

            if (! $categoryId) {
                $this->command?->warn("Skipping {$row['name']}: category '{$row['category']}' not found.");
                continue;
            }

            unset($row['category']);

            Product::updateOrCreate(
                ['name' => $row['name']],
                [...$row, 'category_id' => $categoryId, 'is_active' => true],
            );
        }
    }
}
