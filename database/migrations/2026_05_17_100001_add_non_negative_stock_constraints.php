<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE products ADD CONSTRAINT products_stock_qty_non_negative CHECK (stock_qty >= 0)');
        DB::statement('ALTER TABLE materials ADD CONSTRAINT materials_stock_qty_non_negative CHECK (stock_qty >= 0)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_qty_non_negative');
        DB::statement('ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_stock_qty_non_negative');
    }
};
