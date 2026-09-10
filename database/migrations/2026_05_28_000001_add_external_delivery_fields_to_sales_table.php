<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('external_delivery_name', 120)->nullable()->after('assigned_to');
            $table->string('external_delivery_phone', 40)->nullable()->after('external_delivery_name');
            $table->string('external_delivery_vehicle_plate', 40)->nullable()->after('external_delivery_phone');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn([
                'external_delivery_name',
                'external_delivery_phone',
                'external_delivery_vehicle_plate',
            ]);
        });
    }
};
