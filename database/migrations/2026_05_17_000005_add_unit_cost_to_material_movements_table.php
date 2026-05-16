<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_movements', function (Blueprint $table) {
            $table->unsignedBigInteger('unit_cost')->nullable()->after('quantity_after');
        });
    }

    public function down(): void
    {
        Schema::table('material_movements', function (Blueprint $table) {
            $table->dropColumn('unit_cost');
        });
    }
};
