<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Replace the composite unique (product_id, material_id) with a single unique on product_id
        // so the DB matches the app's HasOne recipe relationship.
        DB::statement('ALTER TABLE product_recipes DROP CONSTRAINT IF EXISTS product_recipes_product_id_material_id_unique');
        DB::statement('ALTER TABLE product_recipes ADD CONSTRAINT product_recipes_product_id_unique UNIQUE (product_id)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE product_recipes DROP CONSTRAINT IF EXISTS product_recipes_product_id_unique');
        DB::statement('ALTER TABLE product_recipes ADD CONSTRAINT product_recipes_product_id_material_id_unique UNIQUE (product_id, material_id)');
    }
};
