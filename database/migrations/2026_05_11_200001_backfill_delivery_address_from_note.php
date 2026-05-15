<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // For store orders (customer_id is set), move the delivery address from note → delivery_address
        DB::statement("
            UPDATE sales
            SET delivery_address = note,
                note = NULL
            WHERE customer_id IS NOT NULL
              AND note IS NOT NULL
              AND delivery_address IS NULL
        ");
    }

    public function down(): void
    {
        // Restore note from delivery_address for store orders
        DB::statement("
            UPDATE sales
            SET note = delivery_address,
                delivery_address = NULL
            WHERE customer_id IS NOT NULL
              AND delivery_address IS NOT NULL
              AND note IS NULL
        ");
    }
};
