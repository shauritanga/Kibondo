<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id)');
        DB::statement('CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at)');
        DB::statement('CREATE INDEX idx_sales_customer_id ON sales(customer_id)');
        DB::statement('CREATE INDEX idx_sales_created_at ON sales(created_at)');
        DB::statement('CREATE INDEX idx_sales_status ON sales(status)');
        DB::statement('CREATE INDEX idx_payments_sale_id ON payments(sale_id)');
        DB::statement('CREATE INDEX idx_sale_items_product_id ON sale_items(product_id)');
        DB::statement('CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_stock_movements_product_id');
        DB::statement('DROP INDEX IF EXISTS idx_stock_movements_created_at');
        DB::statement('DROP INDEX IF EXISTS idx_sales_customer_id');
        DB::statement('DROP INDEX IF EXISTS idx_sales_created_at');
        DB::statement('DROP INDEX IF EXISTS idx_sales_status');
        DB::statement('DROP INDEX IF EXISTS idx_payments_sale_id');
        DB::statement('DROP INDEX IF EXISTS idx_sale_items_product_id');
        DB::statement('DROP INDEX IF EXISTS idx_sale_items_sale_id');
    }
};
