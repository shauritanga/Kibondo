<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL: drop existing check constraint, widen to varchar, add new constraint
        DB::statement('ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check');
        DB::statement("ALTER TABLE sales ALTER COLUMN status TYPE VARCHAR(30)");
        DB::statement("ALTER TABLE sales ADD CONSTRAINT sales_status_check CHECK (status IN ('completed','pending','partial','cancelled','confirmed','out_for_delivery'))");

        Schema::table('sales', function (Blueprint $table) {
            $table->uuid('assigned_to')->nullable()->after('user_id');
            $table->text('delivery_address')->nullable()->after('note');

            $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['assigned_to']);
            $table->dropColumn(['assigned_to', 'delivery_address']);
        });

        DB::statement('ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check');
        DB::statement("ALTER TABLE sales ALTER COLUMN status TYPE VARCHAR(30)");
        DB::statement("ALTER TABLE sales ADD CONSTRAINT sales_status_check CHECK (status IN ('completed','pending','partial','cancelled'))");
    }
};
