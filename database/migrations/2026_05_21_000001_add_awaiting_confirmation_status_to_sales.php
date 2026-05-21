<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check');
        DB::statement("ALTER TABLE sales ADD CONSTRAINT sales_status_check CHECK (status IN ('completed','pending','partial','cancelled','confirmed','out_for_delivery','awaiting_confirmation'))");
    }

    public function down(): void
    {
        // Move any awaiting_confirmation rows back to out_for_delivery before removing the status
        DB::table('sales')->where('status', 'awaiting_confirmation')->update(['status' => 'out_for_delivery']);

        DB::statement('ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check');
        DB::statement("ALTER TABLE sales ADD CONSTRAINT sales_status_check CHECK (status IN ('completed','pending','partial','cancelled','confirmed','out_for_delivery'))");
    }
};
