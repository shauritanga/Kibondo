<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->uuid('delivery_zone_id')->nullable()->after('delivery_address');
            $table->unsignedBigInteger('delivery_cost')->nullable()->after('delivery_zone_id');

            $table->foreign('delivery_zone_id')
                ->references('id')
                ->on('delivery_zones')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['delivery_zone_id']);
            $table->dropColumn(['delivery_zone_id', 'delivery_cost']);
        });
    }
};
